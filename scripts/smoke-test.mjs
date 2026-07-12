import WebSocket from "ws";

const origin = process.env.SMOKE_URL?.replace(/\/$/, "");
if (!origin) throw new Error("SMOKE_URL is required");

async function requireResponse(path, validate) {
  const response = await fetch(`${origin}${path}`, { redirect: "manual" });
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  const body = await response.json();
  if (!validate(body)) throw new Error(`${path} returned an invalid response`);
  return { response, body };
}

await requireResponse("/api/health", (body) => body?.ok === true);
await requireResponse("/api/readiness", (body) => body?.ok === true);
const { response: session } = await requireResponse(
  "/api/session",
  (body) => body?.ready === true && Number.isInteger(body.reactionShards),
);
const cookie = session.headers.get("set-cookie")?.split(";", 1)[0];
if (!cookie) throw new Error("/api/session did not issue a cookie");
await requireResponse(
  "/api/state",
  (body) => body?.type === "snapshot" && Number.isInteger(body.version),
);

const wsUrl = origin.replace(/^http/, "ws");
const snapshot = await new Promise((resolve, reject) => {
  const socket = new WebSocket(`${wsUrl}/api/ws`, { headers: { Origin: origin, Cookie: cookie } });
  const timeout = setTimeout(() => {
    socket.terminate();
    reject(new Error("WebSocket snapshot timed out"));
  }, 10_000);
  socket.once("message", (data) => {
    clearTimeout(timeout);
    try {
      const parsed = JSON.parse(String(data));
      socket.close(1000, "Smoke test complete");
      resolve(parsed);
    } catch (error) {
      reject(error);
    }
  });
  socket.once("error", reject);
  socket.once("unexpected-response", (_request, response) => {
    reject(new Error(`WebSocket upgrade returned ${response.statusCode}`));
  });
});
if (snapshot?.type !== "snapshot" || !Number.isInteger(snapshot.version)) {
  throw new Error("WebSocket did not return a valid snapshot");
}

console.log("Public HTTP, readiness, session, state, and WebSocket smoke tests passed");
