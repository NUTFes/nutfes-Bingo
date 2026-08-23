#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import process from "node:process";

if (process.argv.length !== 2) throw new Error("Usage: node scripts/cloudflare-smoke.mjs");
if (typeof WebSocket === "undefined") throw new Error("Node 26 WebSocket support is required");
process.loadEnvFile("./cloudflare.project.env");

const site = new URL(process.env.CLOUDFLARE_PRODUCTION_SITE_URL);
const mediaOrigin = new URL(process.env.CLOUDFLARE_PRODUCTION_MEDIA_ORIGIN);
const releaseSha =
  process.env.SMOKE_RELEASE_SHA ??
  execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
if (!/^[a-f0-9]{40}$/.test(releaseSha)) {
  throw new Error("SMOKE_RELEASE_SHA must be a full lowercase Git SHA");
}
const deployments = JSON.parse(
  execFileSync("./scripts/cloudflare-wrangler.sh", ["deployments", "list", "--env=", "--json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  }),
);
const latest = deployments
  .filter((deployment) => typeof deployment?.created_on === "string")
  .toSorted((left, right) => Date.parse(left.created_on) - Date.parse(right.created_on))
  .at(-1);
if (latest?.annotations?.["workers/message"] !== `git:${releaseSha}`) {
  throw new Error(`Active production deployment is not git:${releaseSha}`);
}
const activeVersions = Array.isArray(latest.versions)
  ? latest.versions.filter((version) => version?.percentage === 100)
  : [];
if (activeVersions.length !== 1 || typeof activeVersions[0].version_id !== "string") {
  throw new Error("Production must have exactly one 100% active version");
}

const fetchChecked = async (path, expectedStatus, expectedType) => {
  const response = await fetch(new URL(path, site), {
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
  });
  const contentType = response.headers.get("content-type") ?? "";
  if (response.status !== expectedStatus || !contentType.startsWith(expectedType)) {
    throw new Error(
      `${path} returned ${response.status} ${contentType}; expected ${expectedStatus} ${expectedType}`,
    );
  }
  return response;
};
const assertSecurityHeaders = (path, response) => {
  for (const [name, expected] of [
    ["strict-transport-security", "max-age=31536000"],
    ["cross-origin-opener-policy", "same-origin"],
  ]) {
    const actual = response.headers.get(name);
    if (actual !== expected) {
      throw new Error(`${path} returned ${name}: ${actual ?? "<missing>"}; expected ${expected}`);
    }
  }
};

const home = await fetchChecked("/", 200, "text/html");
assertSecurityHeaders("/", home);
const readyResponse = await fetchChecked("/api/ready", 200, "application/json");
assertSecurityHeaders("/api/ready", readyResponse);
const ready = await readyResponse.json();
if (
  ready?.status !== "ok" ||
  ready?.releaseSha !== releaseSha ||
  typeof ready?.eventId !== "string" ||
  !Number.isSafeInteger(ready?.revision) ||
  ready?.recoveryPending !== false
) {
  throw new Error("/api/ready is not the deployed singleton GameState");
}

const stateResponse = await fetchChecked("/api/bingo/state", 200, "application/json");
const state = await stateResponse.json();
if (
  !Number.isSafeInteger(state?.revision) ||
  state?.appState?.event_id !== ready.eventId ||
  !Array.isArray(state?.numbers) ||
  !Array.isArray(state?.prizes)
) {
  throw new Error("/api/bingo/state returned an invalid state");
}
const expectedEtag = `"state:${state.revision}"`;
const etag = stateResponse.headers.get("etag");
if (etag !== expectedEtag && etag !== `W/${expectedEtag}`) {
  throw new Error("/api/bingo/state returned an inconsistent ETag");
}
const unchanged = await fetch(new URL("/api/bingo/state", site), {
  headers: { "If-None-Match": etag },
  redirect: "manual",
  signal: AbortSignal.timeout(15_000),
});
if (unchanged.status !== 304)
  throw new Error("HTTP fallback conditional state read did not return 304");

const prizes = await (await fetchChecked("/api/bingo/prizes", 200, "application/json")).json();
const imageUrl = prizes?.prizes?.find((prize) => typeof prize?.image_url === "string")?.image_url;
if (imageUrl) {
  if (new URL(imageUrl).origin !== mediaOrigin.origin) {
    throw new Error("A prize image points outside the pinned media origin");
  }
  const image = await fetch(imageUrl, { redirect: "error", signal: AbortSignal.timeout(15_000) });
  if (image.status !== 200 || !(image.headers.get("content-type") ?? "").startsWith("image/")) {
    throw new Error(`Prize image returned ${image.status}`);
  }
} else {
  const missingImage = await fetch(new URL("/__nutfes-bingo-missing-probe__", mediaOrigin), {
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
  });
  if (missingImage.status !== 404) {
    throw new Error(`Empty media origin probe returned ${missingImage.status}; expected 404`);
  }
}

const checkAccess = async (path, audience) => {
  const response = await fetch(new URL(path, site), {
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
  });
  const locationValue = response.headers.get("location");
  if (response.status !== 302 || !locationValue) {
    throw new Error(`${path} did not redirect to Cloudflare Access`);
  }
  const location = new URL(locationValue);
  if (
    location.origin !== process.env.CLOUDFLARE_PRODUCTION_ACCESS_TEAM_DOMAIN ||
    location.searchParams.get("kid") !== audience
  ) {
    throw new Error(`${path} redirected to the wrong Access application`);
  }
};
for (const [path, audience] of [
  ["/admin", process.env.CLOUDFLARE_PRODUCTION_ADMIN_AUD],
  ["/admin/prizes", process.env.CLOUDFLARE_PRODUCTION_ADMIN_AUD],
  ["/screen", process.env.CLOUDFLARE_PRODUCTION_SCREEN_AUD],
  ["/screen/", process.env.CLOUDFLARE_PRODUCTION_SCREEN_AUD],
]) {
  await checkAccess(path, audience);
}

const websocket = await new Promise((resolve, reject) => {
  const url = new URL("/api/bingo/socket", site);
  url.protocol = "wss:";
  const socket = new WebSocket(url);
  const startedAt = performance.now();
  const timeout = setTimeout(() => {
    socket.close();
    reject(new Error("Public state WebSocket did not become ready within 10 seconds"));
  }, 10_000);
  socket.addEventListener("message", (event) => {
    try {
      const message = JSON.parse(String(event.data));
      if (
        message?.type !== "state" ||
        message?.state?.appState?.event_id !== ready.eventId ||
        !Number.isSafeInteger(message?.state?.revision)
      ) {
        return;
      }
      clearTimeout(timeout);
      socket.close(1000, "smoke complete");
      resolve({
        latencyMs: Math.round((performance.now() - startedAt) * 100) / 100,
        revision: message.state.revision,
      });
    } catch (error) {
      clearTimeout(timeout);
      socket.close();
      reject(error);
    }
  });
  socket.addEventListener("error", () => {
    clearTimeout(timeout);
    reject(new Error("Public state WebSocket failed"));
  });
});

console.log(
  JSON.stringify({
    status: "passed",
    releaseSha,
    workerVersionId: activeVersions[0].version_id,
    revision: state.revision,
    websocket,
    checked: [
      "public-static-page",
      "singleton-readiness",
      "http-state-fallback",
      "prize-image",
      "admin-access-boundary",
      "screen-access-boundary",
      "public-websocket",
    ],
  }),
);
