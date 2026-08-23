#!/usr/bin/env node

import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";

const usage = `Usage:
  node scripts/cloudflare-load-test.mjs --run --base-url http://127.0.0.1:8787 [options]

Options:
  --state-ws <n>          Concurrent state WebSockets (default: 1000)
  --duration <seconds>    Hold all ready sockets open (default: 300)
  --batch-size <n>        Concurrent opens per batch (default: 50)
  --expect-broadcasts <n> Require n revisions to reach every socket (default: 0)
  --run                    Required safety acknowledgement
  --help`;

const args = new Map();
const booleanOptions = new Set(["help", "run"]);
const valueOptions = new Set([
  "base-url",
  "batch-size",
  "duration",
  "expect-broadcasts",
  "state-ws",
]);
for (let index = 2; index < process.argv.length; index += 1) {
  const argument = process.argv[index];
  if (!argument.startsWith("--")) throw new Error(`Unexpected argument: ${argument}`);
  const name = argument.slice(2);
  if (args.has(name)) throw new Error(`Duplicate option: ${argument}`);
  if (booleanOptions.has(name)) {
    args.set(name, true);
    continue;
  }
  if (!valueOptions.has(name) || !process.argv[index + 1]?.length) throw new Error(usage);
  args.set(name, process.argv[index + 1]);
  index += 1;
}
if (args.has("help")) {
  console.log(usage);
  process.exit(0);
}
if (!args.has("run")) throw new Error(`No traffic sent without --run.\n${usage}`);
if (typeof WebSocket === "undefined") throw new Error("Node 26 WebSocket support is required");

const baseUrl = new URL(String(args.get("base-url") ?? ""));
if (
  baseUrl.protocol !== "http:" ||
  !new Set(["localhost", "127.0.0.1", "[::1]"]).has(baseUrl.hostname) ||
  baseUrl.username !== "" ||
  baseUrl.password !== ""
) {
  throw new Error("--base-url must be a loopback HTTP origin");
}
const integerOption = (name, fallback, maximum) => {
  const value = Number(args.get(name) ?? fallback);
  if (!Number.isSafeInteger(value) || value < 0 || value > maximum) {
    throw new Error(`--${name} must be an integer from 0 to ${maximum}`);
  }
  return value;
};
const stateWs = integerOption("state-ws", 1000, 1984);
const durationSeconds = integerOption("duration", 300, 900);
const batchSize = integerOption("batch-size", 50, 200);
const expectBroadcasts = integerOption("expect-broadcasts", 0, 100);
if (stateWs < 1 || batchSize < 1 || durationSeconds < 1) {
  throw new Error("state-ws, batch-size, and duration must be positive");
}

const sockets = [];
const readyLatencies = [];
const broadcasts = new Map();
const errors = [];
let ready = 0;
let earlyCloses = 0;
let holding = false;

const openSocket = (id) =>
  new Promise((resolve, reject) => {
    const url = new URL("/api/bingo/socket", baseUrl);
    url.protocol = "ws:";
    url.searchParams.set("clientId", crypto.randomUUID());
    const socket = new WebSocket(url);
    sockets.push(socket);
    const startedAt = performance.now();
    let initialRevision = null;
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      socket.close();
      reject(new Error(`socket ${id} did not become ready within 15 seconds`));
    }, 15_000);

    socket.addEventListener("message", (event) => {
      let message;
      try {
        message = JSON.parse(String(event.data));
      } catch {
        return;
      }
      if (
        message?.type !== "state" ||
        typeof message?.state?.appState?.event_id !== "string" ||
        !Number.isSafeInteger(message?.state?.revision)
      ) {
        return;
      }
      if (initialRevision === null) {
        initialRevision = message.state.revision;
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          ready += 1;
          readyLatencies.push(performance.now() - startedAt);
          resolve();
        }
        return;
      }
      if (message.state.revision <= initialRevision) return;
      let receivers = broadcasts.get(message.state.revision);
      if (receivers === undefined) {
        receivers = new Set();
        broadcasts.set(message.state.revision, receivers);
      }
      receivers.add(id);
    });
    socket.addEventListener("error", () => {
      errors.push(`socket ${id} error`);
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        reject(new Error(`socket ${id} failed before ready`));
      }
    });
    socket.addEventListener("close", () => {
      if (holding) earlyCloses += 1;
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        reject(new Error(`socket ${id} closed before ready`));
      }
    });
  });

const startedAt = new Date().toISOString();
try {
  for (let offset = 0; offset < stateWs; offset += batchSize) {
    const size = Math.min(batchSize, stateWs - offset);
    await Promise.all(Array.from({ length: size }, (_, index) => openSocket(offset + index)));
    await delay(25);
  }
  holding = true;
  console.log(`Ready ${ready}/${stateWs}; holding for ${durationSeconds}s.`);
  await delay(durationSeconds * 1_000);
} finally {
  holding = false;
  for (const socket of sockets) socket.close(1000, "capacity test complete");
  await delay(250);
}

const completeBroadcasts = [...broadcasts.values()].filter(
  (receivers) => receivers.size === stateWs,
).length;
const sortedLatencies = readyLatencies.toSorted((left, right) => left - right);
const p95Index = Math.max(0, Math.ceil(sortedLatencies.length * 0.95) - 1);
const passed =
  ready === stateWs &&
  earlyCloses === 0 &&
  errors.length === 0 &&
  completeBroadcasts >= expectBroadcasts;
const result = {
  passed,
  startedAt,
  completedAt: new Date().toISOString(),
  stateWs,
  ready,
  readyFailures: stateWs - ready,
  earlyCloses,
  errors: errors.slice(0, 20),
  readyLatencyP95Ms: Math.round((sortedLatencies[p95Index] ?? 0) * 100) / 100,
  observedBroadcasts: broadcasts.size,
  completeBroadcasts,
  expectedBroadcasts: expectBroadcasts,
};
process.stdout.write(`${JSON.stringify(result)}\n`, () => process.exit(passed ? 0 : 1));
