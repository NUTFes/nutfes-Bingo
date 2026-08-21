#!/usr/bin/env node

import { chmod, mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import process from "node:process";

const args = process.argv.slice(2);
const options = new Map();
for (let index = 0; index < args.length; index += 2) {
  if (!args[index]?.startsWith("--") || !args[index + 1]) {
    throw new Error(
      "Usage: node scripts/merge-cloudflare-load-results.mjs --input-dir path --output path --release-sha full-sha [--expected-shards 4 --expected-sockets 1000 --expected-broadcasts 5]",
    );
  }
  options.set(args[index].slice(2), args[index + 1]);
}

const inputDirectory = options.get("input-dir");
const outputPath = options.get("output");
const sourceReleaseSha = options.get("release-sha");
if (!inputDirectory || !outputPath || !/^[a-f0-9]{40}$/.test(sourceReleaseSha ?? "")) {
  throw new Error("--input-dir, --output, and a full --release-sha are required");
}

const expectedShards = readPositiveInteger(
  options.get("expected-shards") ?? "4",
  "expected-shards",
);
const expectedSockets = readPositiveInteger(
  options.get("expected-sockets") ?? "1000",
  "expected-sockets",
);
const expectedBroadcasts = readPositiveInteger(
  options.get("expected-broadcasts") ?? "5",
  "expected-broadcasts",
);

const relativePaths = (await readdir(inputDirectory, { recursive: true }))
  .filter((path) => path.endsWith(".json"))
  .toSorted();
const shards = await Promise.all(
  relativePaths.map(async (relativePath) => {
    const path = join(inputDirectory, relativePath);
    return { path: relativePath, result: JSON.parse(await readFile(path, "utf8")) };
  }),
);
for (const { path, result } of shards) {
  if (
    result.schemaVersion !== 2 ||
    result.distributed !== false ||
    result.environment !== "staging" ||
    result.sourceReleaseSha !== sourceReleaseSha ||
    result.targetReleaseSha !== sourceReleaseSha ||
    result.releaseStable !== true ||
    result.scenario !== "distributed-broadcast-shard" ||
    !Number.isFinite(Date.parse(result.startedAt)) ||
    !Number.isFinite(Date.parse(result.completedAt)) ||
    Date.parse(result.completedAt) < Date.parse(result.startedAt)
  ) {
    throw new Error(`Shard evidence ${path} has invalid provenance`);
  }
}

const baseUrls = new Set(shards.map(({ result }) => result.baseUrl));
const ready = sum(shards, ({ result }) => result.websocket?.ready);
const stateWs = sum(shards, ({ result }) => result.stateWs);
const openFailures = sum(shards, ({ result }) => result.websocket?.openFailures);
const readyFailures = sum(shards, ({ result }) => result.websocket?.readyFailures);
const httpClientFailures = sum(shards, ({ result }) => result.httpClientFailures);
const httpServerFailures = sum(shards, ({ result }) => result.httpServerFailures);
const broadcastGroups = new Map();
for (const { result } of shards) {
  for (const broadcast of result.broadcastResults ?? []) {
    const group = broadcastGroups.get(broadcast.key) ?? [];
    group.push(broadcast);
    broadcastGroups.set(broadcast.key, group);
  }
}
const broadcastResults = [...broadcastGroups.entries()]
  .map(([key, broadcasts]) => {
    const clients = broadcasts.reduce(
      (total, broadcast) => total + numberOrZero(broadcast.clients),
      0,
    );
    const firstArrivalAtMs = Math.min(
      ...broadcasts.map((broadcast) =>
        typeof broadcast.firstArrivalAtMs === "number" &&
        Number.isFinite(broadcast.firstArrivalAtMs)
          ? broadcast.firstArrivalAtMs
          : Number.POSITIVE_INFINITY,
      ),
    );
    const lastArrivalAtMs = Math.max(
      ...broadcasts.map((broadcast) =>
        typeof broadcast.lastArrivalAtMs === "number" && Number.isFinite(broadcast.lastArrivalAtMs)
          ? broadcast.lastArrivalAtMs
          : Number.NEGATIVE_INFINITY,
      ),
    );
    const complete =
      broadcasts.length === expectedShards &&
      clients === expectedSockets &&
      broadcasts.every((broadcast) => broadcast.complete === true);
    return {
      clients,
      complete,
      fanoutSpanMs:
        Number.isFinite(firstArrivalAtMs) && Number.isFinite(lastArrivalAtMs)
          ? lastArrivalAtMs - firstArrivalAtMs
          : null,
      key,
      latencyP95Ms: Math.max(
        ...broadcasts.map((broadcast) => numberOrZero(broadcast.latencyP95Ms)),
      ),
      revision: Math.max(...broadcasts.map((broadcast) => numberOrZero(broadcast.revision))),
    };
  })
  .toSorted((left, right) => left.revision - right.revision);
const completedBroadcasts = broadcastResults.filter((broadcast) => broadcast.complete).length;
const passed =
  shards.length === expectedShards &&
  baseUrls.size === 1 &&
  shards.every(({ result }) => result.passed === true) &&
  stateWs === expectedSockets &&
  ready === expectedSockets &&
  openFailures === 0 &&
  readyFailures === 0 &&
  httpClientFailures === 0 &&
  httpServerFailures === 0 &&
  completedBroadcasts >= expectedBroadcasts;

const result = {
  schemaVersion: 2,
  distributed: true,
  environment: "staging",
  sourceReleaseSha,
  scenario: "distributed-broadcast",
  targetReleaseSha: sourceReleaseSha,
  releaseStable: true,
  shardCount: shards.length,
  passed,
  baseUrl: baseUrls.size === 1 ? [...baseUrls][0] : null,
  startedAt:
    shards
      .map(({ result }) => result.startedAt)
      .toSorted()
      .at(0) ?? null,
  completedAt:
    shards
      .map(({ result }) => result.completedAt)
      .toSorted()
      .at(-1) ?? null,
  durationMs: Math.max(...shards.map(({ result }) => numberOrZero(result.durationMs)), 0),
  broadcastResults,
  completedBroadcasts,
  expectBroadcasts: expectedBroadcasts,
  expectedDegradedResponses: sum(shards, ({ result }) => result.expectedDegradedResponses),
  httpClientFailures,
  httpErrorSamples: Object.assign({}, ...shards.map(({ result }) => result.httpErrorSamples ?? {})),
  httpServerFailures,
  reconnects: Math.max(...shards.map(({ result }) => numberOrZero(result.reconnects)), 0),
  plannedDurableObjectRequests: sum(shards, ({ result }) => result.plannedDurableObjectRequests),
  plannedWorkerRequests: sum(shards, ({ result }) => result.plannedWorkerRequests),
  requestsByStatus: mergeCounts(shards.map(({ result }) => result.requestsByStatus ?? {})),
  stampBurst: sum(shards, ({ result }) => result.stampBurst),
  stateReads: sum(shards, ({ result }) => result.stateReads),
  stateWs,
  wsReadyType:
    new Set(shards.map(({ result }) => result.wsReadyType)).size === 1
      ? shards[0]?.result.wsReadyType
      : null,
  websocket: {
    closed: sum(shards, ({ result }) => result.websocket?.closed),
    messages: sum(shards, ({ result }) => result.websocket?.messages),
    errorSamples: [
      ...new Set(shards.flatMap(({ result }) => result.websocket?.errorSamples ?? [])),
    ].slice(0, 20),
    openFailures,
    opened: sum(shards, ({ result }) => result.websocket?.opened),
    openLatencyP95Ms: Math.max(
      ...shards.map(({ result }) => numberOrZero(result.websocket?.openLatencyP95Ms)),
      0,
    ),
    ready,
    readyFailures,
    readyLatencyP95Ms: Math.max(
      ...shards.map(({ result }) => numberOrZero(result.websocket?.readyLatencyP95Ms)),
      0,
    ),
  },
  shards: shards.map(({ path, result: shard }) => ({
    path,
    passed: shard.passed === true,
    startedAt: shard.startedAt,
    completedAt: shard.completedAt,
    stateWs: numberOrZero(shard.stateWs),
    ready: numberOrZero(shard.websocket?.ready),
    completedBroadcasts: numberOrZero(shard.completedBroadcasts),
  })),
};

await mkdir(dirname(outputPath), { recursive: true, mode: 0o700 });
const temporaryPath = `${outputPath}.${process.pid}.tmp`;
await writeFile(temporaryPath, `${JSON.stringify(result, null, 2)}\n`, { mode: 0o600, flag: "wx" });
await chmod(temporaryPath, 0o600);
await rename(temporaryPath, outputPath);
console.log(JSON.stringify(result));
if (!passed) process.exitCode = 1;

function readPositiveInteger(value, label) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new Error(`${label} must be positive`);
  return parsed;
}

function numberOrZero(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function sum(items, select) {
  return items.reduce((total, item) => total + numberOrZero(select(item)), 0);
}

function mergeCounts(objects) {
  const counts = {};
  for (const object of objects) {
    for (const [key, value] of Object.entries(object)) {
      counts[key] = (counts[key] ?? 0) + numberOrZero(value);
    }
  }
  return Object.fromEntries(
    Object.entries(counts).toSorted(([left], [right]) => left.localeCompare(right)),
  );
}
