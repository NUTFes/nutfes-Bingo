#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { chmod, mkdir, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import process from "node:process";

const args = process.argv.slice(2);
let target;
let outputPath;
for (let index = 0; index < args.length; index += 1) {
  const argument = args[index];
  if (argument === "--env" && args[index + 1]) {
    target = args[index + 1];
    index += 1;
  } else if (argument === "--output" && args[index + 1]) {
    outputPath = args[index + 1];
    index += 1;
  } else {
    throw new Error(
      "Usage: node scripts/cloudflare-smoke.mjs --env production|staging [--output path]",
    );
  }
}
if (!new Set(["production", "staging"]).has(target))
  throw new Error("--env must be production or staging");
if (typeof WebSocket === "undefined") throw new Error("Node 26 WebSocket support is required");

const prefix = `CLOUDFLARE_${target.toUpperCase()}_`;
const requiredEnvironment = [
  "CLOUDFLARE_ACCESS_TEAM_DOMAIN",
  `${prefix}ADMIN_AUD`,
  `${prefix}MEDIA_ORIGIN`,
  `${prefix}SCREEN_AUD`,
  `${prefix}SITE_URL`,
];
for (const name of requiredEnvironment) {
  if (!process.env[name]) throw new Error(`${name} is required from cloudflare.project.env`);
}
const siteUrl = new URL(process.env[`${prefix}SITE_URL`]);
const mediaOrigin = new URL(process.env[`${prefix}MEDIA_ORIGIN`]);
const releaseSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const wranglerJson = (...wranglerArgs) =>
  JSON.parse(
    execFileSync("./scripts/cloudflare-wrangler.sh", [...wranglerArgs, "--json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "inherit"],
    }),
  );
const environmentArgs = target === "staging" ? ["--env", "staging"] : ["--env="];
const deployments = wranglerJson("deployments", "list", ...environmentArgs);
const latest = deployments
  .filter((deployment) => typeof deployment?.created_on === "string")
  .toSorted((left, right) => Date.parse(left.created_on) - Date.parse(right.created_on))
  .at(-1);
if (latest?.annotations?.["workers/message"] !== `git:${releaseSha}`) {
  throw new Error(`Active ${target} deployment is not git:${releaseSha}`);
}
const activeVersions = Array.isArray(latest.versions)
  ? latest.versions.filter((version) => version?.percentage === 100)
  : [];
if (activeVersions.length !== 1 || typeof activeVersions[0].version_id !== "string") {
  throw new Error(`Active ${target} deployment must contain exactly one 100% version`);
}
const workerVersionId = activeVersions[0].version_id;

const fetchChecked = async (path, expectedStatus, expectedType) => {
  const response = await fetch(new URL(path, siteUrl), {
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

await fetchChecked("/", 200, "text/html");
const readyResponse = await fetchChecked("/api/ready", 200, "application/json");
const ready = await readyResponse.json();
if (
  ready?.status !== "ok" ||
  typeof ready?.generation !== "string" ||
  !Number.isSafeInteger(ready?.revision)
) {
  throw new Error("/api/ready returned an invalid readiness envelope");
}
const stateResponse = await fetchChecked("/api/bingo/state", 200, "application/json");
const state = await stateResponse.json();
if (typeof state?.generation !== "string" || !Number.isSafeInteger(state?.revision)) {
  throw new Error("/api/bingo/state returned an invalid state envelope");
}
const prizesResponse = await fetchChecked("/api/bingo/prizes", 200, "application/json");
const prizes = await prizesResponse.json();
const imageUrl = prizes?.prizes?.find((prize) => typeof prize?.image_url === "string")?.image_url;
if (!imageUrl || new URL(imageUrl).origin !== mediaOrigin.origin) {
  throw new Error("No prize image on the reviewed media origin is available for smoke testing");
}
const imageResponse = await fetch(imageUrl, {
  redirect: "error",
  signal: AbortSignal.timeout(15_000),
});
if (
  imageResponse.status !== 200 ||
  !(imageResponse.headers.get("content-type") ?? "").startsWith("image/")
) {
  throw new Error(
    `Prize image returned ${imageResponse.status} ${imageResponse.headers.get("content-type") ?? ""}`,
  );
}

const accessResult = async (path, expectedAudience) => {
  const response = await fetch(new URL(path, siteUrl), {
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
  });
  const locationValue = response.headers.get("location");
  if (response.status !== 302 || !locationValue)
    throw new Error(`${path} did not redirect to Cloudflare Access`);
  const location = new URL(locationValue);
  if (
    location.origin !== process.env.CLOUDFLARE_ACCESS_TEAM_DOMAIN ||
    location.searchParams.get("kid") !== expectedAudience
  ) {
    throw new Error(`${path} redirected to an unexpected Access team or application`);
  }
  return location.searchParams.get("kid");
};
const adminApplication = await accessResult("/admin", process.env[`${prefix}ADMIN_AUD`]);
const screenApplication = await accessResult("/screen", process.env[`${prefix}SCREEN_AUD`]);
if (adminApplication === screenApplication)
  throw new Error("Admin and screen must use separate Access applications");

const websocketEvidence = await new Promise((resolve, reject) => {
  const url = new URL("/api/bingo/socket", siteUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.searchParams.set("clientId", crypto.randomUUID());
  const socket = new WebSocket(url);
  const startedAt = performance.now();
  const timeout = setTimeout(() => {
    socket.close();
    reject(new Error("Public state WebSocket did not become ready within 10 seconds"));
  }, 10_000);
  socket.addEventListener("message", (event) => {
    try {
      const message = JSON.parse(String(event.data));
      if (message?.type !== "state" || typeof message?.state?.generation !== "string") return;
      clearTimeout(timeout);
      const latencyMs = Math.round((performance.now() - startedAt) * 100) / 100;
      socket.close(1000, "smoke complete");
      resolve({
        latencyMs,
        generation: message.state.generation,
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

const whoami = wranglerJson("whoami");
const record = {
  schemaVersion: 1,
  environment: target,
  releaseSha,
  workerVersionId,
  deploymentCreatedAt: latest.created_on,
  operator: whoami.email,
  checkedAt: new Date().toISOString(),
  automated: {
    publicPage: true,
    stateApi: true,
    prizeImage: true,
    accessRedirects: true,
    separateAccessApplications: true,
    publicWebSocket: true,
  },
  evidence: {
    imageOrigin: mediaOrigin.origin,
    stateGeneration: state.generation,
    stateRevision: state.revision,
    websocket: websocketEvidence,
  },
  manual: {
    allowedAdminIdentity: false,
    deniedAdminIdentity: false,
    allowedScreenIdentity: false,
    deniedScreenIdentity: false,
    turnstileSingleReach: false,
    imageUpload: false,
    screenReauthentication: false,
    backupPrivate: false,
    observability: false,
    breakGlass: false,
  },
  load: null,
  snapshot: null,
};
outputPath ??= `.cloudflare/deployments/${target}-${releaseSha}.draft.json`;
const temporaryPath = `${outputPath}.${process.pid}.tmp`;
await mkdir(dirname(outputPath), { recursive: true, mode: 0o700 });
await writeFile(temporaryPath, `${JSON.stringify(record, null, 2)}\n`, { mode: 0o600, flag: "wx" });
await chmod(temporaryPath, 0o600);
await rename(temporaryPath, outputPath);
console.log(`Automated ${target} smoke passed for git:${releaseSha}; wrote ${outputPath}.`);
