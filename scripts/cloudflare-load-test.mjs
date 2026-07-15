#!/usr/bin/env node

import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";

const STAMP_NAMES = [
  "angry",
  "cracker",
  "crap",
  "good",
  "heart",
  "peace",
  "sad",
  "skull",
  "smile",
  "surprise",
];

function help() {
  console.log(`Cloudflare bingo load test (no traffic is sent without --run)

Usage:
  node scripts/cloudflare-load-test.mjs --run --base-url http://127.0.0.1:8787 [options]

Options:
  --state-ws <n>       Concurrent state WebSockets (default: 1000)
  --reconnects <n>     Full reconnect rounds (default: 0)
  --stamp-burst <n>    Stamp POST requests (default: 0)
  --state-reads <n>    Snapshot GET requests (default: 0)
  --duration <sec>     Hold each connection round (default: 30)
  --batch-size <n>     WebSocket connection batch size (default: 50)
  --expect-broadcasts <n>
                       Require n state revisions to reach every live socket (default: 0)
  --allow-remote       Permit a non-loopback target
  --allow-quota-risk   Permit a remote plan above the 30,000 request safety budget
  --allow-edge-blocks  Treat stamp 403/429 responses from a rehearsed WAF rule as expected
  --ws-path <path>     WebSocket path (default: /api/bingo/socket)
  --ws-ready-type <t>  Expected initial payload: state or ready (inferred from path)
  --help               Show this message

Example for the expected maximum audience:
  node scripts/cloudflare-load-test.mjs --run --base-url http://127.0.0.1:8787 \\
    --state-ws 1013 --reconnects 3 --stamp-burst 20000 --duration 30
`);
}

function parseArgs(argv) {
  const result = new Map();
  const booleanOptions = new Set([
    "allow-edge-blocks",
    "allow-quota-risk",
    "allow-remote",
    "help",
    "run",
  ]);
  const valueOptions = new Set([
    "base-url",
    "batch-size",
    "duration",
    "expect-broadcasts",
    "reconnects",
    "stamp-burst",
    "state-reads",
    "state-ws",
    "ws-path",
    "ws-ready-type",
  ]);
  const setOption = (name, value) => {
    if (result.has(name)) throw new Error(`Duplicate option: --${name}`);
    result.set(name, value);
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected argument: ${arg}`);
    }
    const equal = arg.indexOf("=");
    if (equal !== -1) {
      const name = arg.slice(2, equal);
      const value = arg.slice(equal + 1);
      if (!valueOptions.has(name) || value === "") {
        throw new Error(`--${name} does not accept this value form`);
      }
      setOption(name, value);
      continue;
    }
    const name = arg.slice(2);
    if (booleanOptions.has(name)) {
      setOption(name, true);
      continue;
    }
    if (!valueOptions.has(name)) throw new Error(`Unknown option: --${name}`);
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      setOption(name, next);
      index += 1;
    } else {
      throw new Error(`--${name} requires a value`);
    }
  }
  return result;
}

function integerOption(args, name, fallback, maximum) {
  const value = Number(args.get(name) ?? fallback);
  if (!Number.isSafeInteger(value) || value < 0 || value > maximum) {
    throw new Error(`--${name} must be an integer from 0 to ${maximum}`);
  }
  return value;
}

function isLoopback(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

function websocketUrl(baseUrl, path, clientId) {
  const url = new URL(path, baseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.searchParams.set("clientId", clientId);
  return url;
}

function isReadyPayload(value, expectedType) {
  if (typeof value !== "object" || value === null || value.type !== expectedType) return false;
  if (expectedType === "ready") {
    return true;
  }
  return (
    typeof value.state === "object" &&
    value.state !== null &&
    typeof value.state.generation === "string" &&
    value.state.generation.length > 0 &&
    Number.isSafeInteger(value.state.revision) &&
    value.state.revision >= 0
  );
}

function trackStateBroadcast(rawMessage, socketId, counters) {
  let message;
  try {
    message = JSON.parse(String(rawMessage));
  } catch {
    return;
  }
  if (!isReadyPayload(message, "state")) return;
  const { generation, revision, serverTime } = message.state;
  const key = `${generation}:${revision}`;
  let broadcast = counters.broadcasts.get(key);
  if (broadcast === undefined) {
    broadcast = {
      arrivals: [],
      firstArrivalAt: Date.now(),
      revision,
      serverTime: typeof serverTime === "string" ? serverTime : null,
      sockets: new Set(),
    };
    counters.broadcasts.set(key, broadcast);
  }
  if (broadcast.sockets.has(socketId)) return;
  broadcast.sockets.add(socketId);
  broadcast.arrivals.push(Date.now());
}

async function openSocket(url, expectedReadyType, counters) {
  return new Promise((resolve, reject) => {
    const startedAt = performance.now();
    const socket = new WebSocket(url);
    let settled = false;
    let opened = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      if (opened) counters.readyFailures += 1;
      else counters.openFailures += 1;
      socket.close();
      reject(
        new Error(
          opened
            ? `WebSocket initial ${expectedReadyType} payload timeout: ${url.pathname}`
            : `WebSocket open timeout: ${url.pathname}`,
        ),
      );
    }, 10_000);

    socket.addEventListener("open", () => {
      if (settled || opened) return;
      opened = true;
      counters.opened += 1;
      counters.openLatencyMs.push(performance.now() - startedAt);
    });
    socket.addEventListener("message", (event) => {
      counters.messages += 1;
      if (settled) {
        if (expectedReadyType === "state") {
          trackStateBroadcast(event.data, url.searchParams.get("clientId"), counters);
        }
        return;
      }
      let message;
      try {
        message = JSON.parse(String(event.data));
      } catch {
        settled = true;
        clearTimeout(timeout);
        counters.readyFailures += 1;
        socket.close();
        reject(new Error(`WebSocket initial payload is not JSON: ${url.pathname}`));
        return;
      }
      if (!isReadyPayload(message, expectedReadyType)) {
        settled = true;
        clearTimeout(timeout);
        counters.readyFailures += 1;
        socket.close();
        reject(
          new Error(`WebSocket initial ${expectedReadyType} payload is invalid: ${url.pathname}`),
        );
        return;
      }
      settled = true;
      clearTimeout(timeout);
      counters.ready += 1;
      counters.readyLatencyMs.push(performance.now() - startedAt);
      resolve(socket);
    });
    socket.addEventListener("error", () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (opened) counters.readyFailures += 1;
      else counters.openFailures += 1;
      reject(new Error(`WebSocket connection failed: ${url.pathname}`));
    });
    socket.addEventListener("close", () => {
      counters.closed += 1;
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (opened) counters.readyFailures += 1;
      else counters.openFailures += 1;
      reject(new Error(`WebSocket closed before becoming ready: ${url.pathname}`));
    });
  });
}

async function openSockets(baseUrl, path, expectedReadyType, count, batchSize, counters) {
  const sockets = [];
  for (let offset = 0; offset < count; offset += batchSize) {
    const size = Math.min(batchSize, count - offset);
    const batch = Array.from({ length: size }, () => {
      const clientId = crypto.randomUUID();
      return openSocket(websocketUrl(baseUrl, path, clientId), expectedReadyType, counters);
    });
    const settled = await Promise.allSettled(batch);
    sockets.push(
      ...settled.filter((result) => result.status === "fulfilled").map((result) => result.value),
    );
  }
  return sockets;
}

async function closeSockets(sockets) {
  await Promise.all(
    sockets.map(
      (socket) =>
        new Promise((resolve) => {
          if (socket.readyState === WebSocket.CLOSED) {
            resolve();
            return;
          }
          const timeout = setTimeout(resolve, 2_000);
          socket.addEventListener(
            "close",
            () => {
              clearTimeout(timeout);
              resolve();
            },
            { once: true },
          );
          socket.close(1000, "load test round complete");
        }),
    ),
  );
}

async function runPool(total, concurrency, task) {
  let next = 0;
  const workers = Array.from({ length: Math.min(total, concurrency) }, async () => {
    while (next < total) {
      const index = next;
      next += 1;
      await task(index);
    }
  });
  await Promise.all(workers);
}

const rawArgs = process.argv.slice(2);
const args = parseArgs(rawArgs[0] === "--" ? rawArgs.slice(1) : rawArgs);
if (args.has("help") || !args.has("run")) {
  help();
  process.exit(0);
}

if (typeof WebSocket === "undefined") {
  throw new Error("This script requires the WebSocket global from Node 26");
}

const rawBaseUrl = args.get("base-url");
if (typeof rawBaseUrl !== "string") {
  throw new Error("--base-url is required with --run");
}

const baseUrl = new URL(rawBaseUrl);
if (
  !new Set(["http:", "https:"]).has(baseUrl.protocol) ||
  baseUrl.username !== "" ||
  baseUrl.password !== ""
) {
  throw new Error("--base-url must be an HTTP(S) URL without credentials");
}
if (!args.has("allow-remote") && !isLoopback(baseUrl.hostname)) {
  throw new Error("Refusing a remote load test without --allow-remote");
}

const stateWs = integerOption(args, "state-ws", 1000, 20_000);
const reconnects = integerOption(args, "reconnects", 0, 20);
const stampBurst = integerOption(args, "stamp-burst", 0, 100_000);
const stateReads = integerOption(args, "state-reads", 0, 100_000);
const duration = integerOption(args, "duration", 30, 600);
const expectBroadcasts = integerOption(args, "expect-broadcasts", 0, 100);
const batchSize = Math.max(1, integerOption(args, "batch-size", 50, 1000));
const wsPath = String(args.get("ws-path") ?? "/api/bingo/socket");
if (!wsPath.startsWith("/") || new URL(wsPath, baseUrl).origin !== baseUrl.origin) {
  throw new Error("--ws-path must be an absolute path on --base-url");
}
const wsReadyType = String(
  args.get("ws-ready-type") ?? (wsPath.includes("/stamps/") ? "ready" : "state"),
);
if (!new Set(["ready", "state"]).has(wsReadyType)) {
  throw new Error("--ws-ready-type must be state or ready");
}
if (expectBroadcasts > 0 && (wsReadyType !== "state" || reconnects !== 0 || stateWs === 0)) {
  throw new Error("--expect-broadcasts requires state sockets, --state-ws > 0, and --reconnects 0");
}
const counters = {
  broadcasts: new Map(),
  closed: 0,
  messages: 0,
  opened: 0,
  openFailures: 0,
  openLatencyMs: [],
  ready: 0,
  readyFailures: 0,
  readyLatencyMs: [],
};
const statuses = new Map();
const errorSamples = new Map();
let expectedDegradedResponses = 0;
let httpClientFailures = 0;
let httpServerFailures = 0;
const startedAt = performance.now();

const plannedWorkerRequests = stateWs * (reconnects + 1) + stampBurst + stateReads;
const plannedDurableObjectRequests = stateWs * (reconnects + 1) * 2 + stampBurst + stateReads * 3;
if (
  !isLoopback(baseUrl.hostname) &&
  !args.has("allow-quota-risk") &&
  Math.max(plannedWorkerRequests, plannedDurableObjectRequests) > 30_000
) {
  throw new Error(
    "Remote plan exceeds the 30,000 request safety budget; reduce load or add --allow-quota-risk",
  );
}

const request = async (path, init) => {
  const response = await fetch(new URL(path, baseUrl), {
    ...init,
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  statuses.set(response.status, (statuses.get(response.status) ?? 0) + 1);
  const body = await response.text();
  const expectedStampOverload =
    path === "/api/bingo/stamps" &&
    response.status === 503 &&
    response.headers.has("Retry-After") &&
    body.includes("リアクション演出");
  const expectedEdgeBlock =
    args.has("allow-edge-blocks") &&
    path === "/api/bingo/stamps" &&
    (response.status === 403 || response.status === 429);
  if (response.status === 202 || expectedStampOverload || expectedEdgeBlock) {
    expectedDegradedResponses += 1;
  } else if (response.status >= 500) {
    httpServerFailures += 1;
    if (!errorSamples.has(response.status)) {
      errorSamples.set(response.status, body.slice(0, 240));
    }
  } else if (response.status >= 400) {
    httpClientFailures += 1;
    if (!errorSamples.has(response.status)) {
      errorSamples.set(response.status, body.slice(0, 240));
    }
  }
};

const requestWork = [
  runPool(stampBurst, 50, async (index) => {
    const clientId = crypto.randomUUID();
    await request("/api/bingo/stamps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        stampName: STAMP_NAMES[index % STAMP_NAMES.length],
      }),
    });
  }),
  runPool(stateReads, 50, async () => {
    await request("/api/bingo/state", { method: "GET" });
  }),
];

let sockets = await openSockets(baseUrl, wsPath, wsReadyType, stateWs, batchSize, counters);
for (let round = 0; round <= reconnects; round += 1) {
  await delay(duration * 1000);
  await closeSockets(sockets);
  if (round < reconnects) {
    sockets = await openSockets(baseUrl, wsPath, wsReadyType, stateWs, batchSize, counters);
  }
}

await Promise.all(requestWork);

const sortedOpenLatency = counters.openLatencyMs.toSorted((a, b) => a - b);
const p95Index = Math.max(0, Math.ceil(sortedOpenLatency.length * 0.95) - 1);
const openLatencyP95Ms = sortedOpenLatency[p95Index] ?? null;
const sortedReadyLatency = counters.readyLatencyMs.toSorted((a, b) => a - b);
const readyP95Index = Math.max(0, Math.ceil(sortedReadyLatency.length * 0.95) - 1);
const readyLatencyP95Ms = sortedReadyLatency[readyP95Index] ?? null;
const broadcastResults = [...counters.broadcasts.entries()]
  .map(([key, broadcast]) => {
    const sortedArrivals = broadcast.arrivals.toSorted((a, b) => a - b);
    const arrivalP95Index = Math.max(0, Math.ceil(sortedArrivals.length * 0.95) - 1);
    const serverTimestamp =
      broadcast.serverTime === null ? Number.NaN : Date.parse(broadcast.serverTime);
    const latencyBase = Number.isFinite(serverTimestamp)
      ? serverTimestamp
      : broadcast.firstArrivalAt;
    return {
      clients: broadcast.sockets.size,
      complete: broadcast.sockets.size === stateWs,
      fanoutSpanMs: (sortedArrivals.at(-1) ?? latencyBase) - (sortedArrivals[0] ?? latencyBase),
      key,
      latencyP95Ms: (sortedArrivals[arrivalP95Index] ?? latencyBase) - latencyBase,
      revision: broadcast.revision,
    };
  })
  .toSorted((a, b) => a.revision - b.revision);
const completedBroadcasts = broadcastResults.filter((broadcast) => broadcast.complete).length;

console.log(
  JSON.stringify({
    durationMs: Math.round(performance.now() - startedAt),
    broadcastResults,
    completedBroadcasts,
    expectBroadcasts,
    expectedDegradedResponses,
    httpClientFailures,
    httpErrorSamples: Object.fromEntries([...errorSamples].sort(([a], [b]) => a - b)),
    httpServerFailures,
    reconnects,
    plannedDurableObjectRequests,
    plannedWorkerRequests,
    requestsByStatus: Object.fromEntries([...statuses].sort(([a], [b]) => a - b)),
    stampBurst,
    stateReads,
    stateWs,
    wsReadyType,
    websocket: {
      closed: counters.closed,
      messages: counters.messages,
      openFailures: counters.openFailures,
      opened: counters.opened,
      openLatencyP95Ms: openLatencyP95Ms === null ? null : Math.round(openLatencyP95Ms * 100) / 100,
      ready: counters.ready,
      readyFailures: counters.readyFailures,
      readyLatencyP95Ms:
        readyLatencyP95Ms === null ? null : Math.round(readyLatencyP95Ms * 100) / 100,
    },
  }),
);

if (
  httpClientFailures > 0 ||
  httpServerFailures > 0 ||
  counters.openFailures > 0 ||
  counters.readyFailures > 0 ||
  completedBroadcasts < expectBroadcasts
) {
  process.exitCode = 1;
}
