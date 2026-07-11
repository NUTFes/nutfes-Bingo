import WebSocket from "ws";

if (process.env.ALLOW_LOAD_TEST !== "true") {
  console.log(
    "Load test skipped. Set ALLOW_LOAD_TEST=true and LOAD_TEST_URL to run against an approved target.",
  );
  process.exit(0);
}

const target = process.env.LOAD_TEST_URL;
if (!target) throw new Error("LOAD_TEST_URL is required when load testing is enabled");
const baseUrl = new URL(target);
if (baseUrl.protocol !== "http:" && baseUrl.protocol !== "https:")
  throw new Error("LOAD_TEST_URL must use HTTP or HTTPS");
const connectionCount = Number(process.env.LOAD_TEST_CONNECTIONS ?? 1000);
if (!Number.isInteger(connectionCount) || connectionCount < 1 || connectionCount > 2000) {
  throw new Error("LOAD_TEST_CONNECTIONS must be an integer from 1 to 2000");
}
const reactionRatio = Number(process.env.LOAD_TEST_REACTION_RATIO ?? 0.1);
if (!Number.isFinite(reactionRatio) || reactionRatio < 0 || reactionRatio > 1)
  throw new Error("LOAD_TEST_REACTION_RATIO must be from 0 to 1");
const allowWrites = process.env.LOAD_TEST_ALLOW_WRITES === "true";
const wsProtocol = baseUrl.protocol === "https:" ? "wss:" : "ws:";
const wsBase = `${wsProtocol}//${baseUrl.host}`;
const startedAt = performance.now();
const initialHeap = process.memoryUsage().heapUsed;

function percentile(values, percentage) {
  if (values.length === 0) return 0;
  const sorted = values.toSorted((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * percentage))];
}

function connectBingo(lastVersion) {
  const openedAt = performance.now();
  const query = lastVersion === undefined ? "" : `?lastVersion=${lastVersion}`;
  const socket = new WebSocket(`${wsBase}/api/ws${query}`, { origin: baseUrl.origin });
  const { promise, resolve, reject } = Promise.withResolvers();
  const timer = setTimeout(() => {
    socket.terminate();
    reject(new Error("Bingo WebSocket timed out"));
  }, 15_000);
  socket.once("message", (raw) => {
    try {
      const message = JSON.parse(String(raw));
      if (message.type !== "snapshot" && typeof message.version !== "number")
        throw new Error("Unexpected initial message");
      clearTimeout(timer);
      resolve({ socket, latencyMs: performance.now() - openedAt, version: message.version });
    } catch (error) {
      clearTimeout(timer);
      socket.terminate();
      reject(error);
    }
  });
  socket.once("error", (error) => {
    clearTimeout(timer);
    reject(error);
  });
  return promise;
}

async function openWave(lastVersion) {
  const settled = await Promise.allSettled(
    Array.from({ length: connectionCount }, () => connectBingo(lastVersion)),
  );
  return {
    clients: settled.flatMap((result) => (result.status === "fulfilled" ? [result.value] : [])),
    errors: settled.filter((result) => result.status === "rejected").length,
  };
}

async function adminCommand(command) {
  const response = await fetch(new URL("/api/admin/command", baseUrl), {
    method: "POST",
    headers: {
      Origin: baseUrl.origin,
      Authorization: `Bearer ${process.env.LOAD_TEST_ADMIN_TOKEN ?? ""}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  if (!response.ok)
    throw new Error(`Admin command failed: ${response.status} ${await response.text()}`);
  return response.json();
}

async function exerciseReactions(count) {
  const results = await Promise.allSettled(
    Array.from({ length: count }, async () => {
      const session = await fetch(new URL("/api/session", baseUrl));
      const cookie = session.headers.get("set-cookie");
      if (!cookie) throw new Error("Session cookie missing");
      const socket = new WebSocket(`${wsBase}/api/reactions/ws?role=client`, {
        origin: baseUrl.origin,
        headers: { Cookie: cookie },
      });
      const { promise: opened, resolve: resolveOpen, reject: rejectOpen } = Promise.withResolvers();
      socket.once("open", resolveOpen);
      socket.once("error", rejectOpen);
      await opened;
      const { promise: first, resolve: resolveFirst } = Promise.withResolvers();
      socket.once("message", (raw) => resolveFirst(JSON.parse(String(raw))));
      socket.send(JSON.stringify({ type: "reaction", name: "heart" }));
      const accepted = await first;
      const { promise: second, resolve: resolveSecond } = Promise.withResolvers();
      socket.once("message", (raw) => resolveSecond(JSON.parse(String(raw))));
      socket.send(JSON.stringify({ type: "reaction", name: "smile" }));
      const rejected = await second;
      socket.close();
      return {
        accepted: accepted.type === "reaction.accepted",
        limited: rejected.type === "error",
      };
    }),
  );
  return {
    attempted: count,
    accepted: results.filter((result) => result.status === "fulfilled" && result.value.accepted)
      .length,
    rateLimited: results.filter((result) => result.status === "fulfilled" && result.value.limited)
      .length,
    errors: results.filter((result) => result.status === "rejected").length,
  };
}

const initialWave = await openWave();
if (initialWave.clients.length === 0) throw new Error("No WebSocket connections succeeded");
const initialLatencies = initialWave.clients.map((client) => client.latencyMs);
let broadcast = null;
let reaction = null;

if (allowWrites) {
  await adminCommand({ type: "event.initialize" });
  const deliveryStarted = performance.now();
  const deliveries = initialWave.clients.map(({ socket }) => {
    const { promise, resolve, reject } = Promise.withResolvers();
    const timer = setTimeout(() => reject(new Error("Broadcast timed out")), 10_000);
    const listener = (raw) => {
      const message = JSON.parse(String(raw));
      if (message.type === "number.added") {
        clearTimeout(timer);
        socket.off("message", listener);
        resolve(performance.now() - deliveryStarted);
      }
    };
    socket.on("message", listener);
    return promise;
  });
  await adminCommand({ type: "number.add", number: 77 });
  const settledDeliveries = await Promise.allSettled(deliveries);
  const deliveryLatencies = settledDeliveries.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : [],
  );
  broadcast = {
    delivered: deliveryLatencies.length,
    errors: settledDeliveries.length - deliveryLatencies.length,
    p50Ms: percentile(deliveryLatencies, 0.5),
    p95Ms: percentile(deliveryLatencies, 0.95),
    maxMs: Math.max(0, ...deliveryLatencies),
  };
  reaction = await exerciseReactions(Math.max(1, Math.floor(connectionCount * reactionRatio)));
}

const reconnectVersion = initialWave.clients[0].version;
initialWave.clients.forEach(({ socket }) => socket.close());
const reconnectWave = await openWave(reconnectVersion);
const reconnectLatencies = reconnectWave.clients.map((client) => client.latencyMs);
reconnectWave.clients.forEach(({ socket }) => socket.close());

const report = {
  target: baseUrl.origin,
  requestedConnections: connectionCount,
  initialConnect: {
    connected: initialWave.clients.length,
    errors: initialWave.errors,
    p50Ms: percentile(initialLatencies, 0.5),
    p95Ms: percentile(initialLatencies, 0.95),
    maxMs: Math.max(...initialLatencies),
  },
  reconnect: {
    connected: reconnectWave.clients.length,
    errors: reconnectWave.errors,
    p50Ms: percentile(reconnectLatencies, 0.5),
    p95Ms: percentile(reconnectLatencies, 0.95),
    maxMs: Math.max(0, ...reconnectLatencies),
  },
  broadcast,
  reactions: reaction,
  estimates: {
    websocketUpgrades: connectionCount * 2 + (reaction?.attempted ?? 0),
    bingoMessages:
      initialWave.clients.length + reconnectWave.clients.length + (broadcast?.delivered ?? 0),
    reactionMessages: reaction ? reaction.attempted * 4 : 0,
  },
  processHeapGrowthBytes: process.memoryUsage().heapUsed - initialHeap,
  elapsedMs: performance.now() - startedAt,
};
console.log(JSON.stringify(report, null, 2));
if (
  initialWave.errors > 0 ||
  reconnectWave.errors > 0 ||
  (broadcast && broadcast.errors > 0) ||
  (reaction && reaction.errors > 0)
) {
  process.exitCode = 1;
}
