#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import process from "node:process";
import { createInterface } from "node:readline/promises";

const args = process.argv.slice(2);
const options = new Map();
for (let index = 0; index < args.length; index += 2) {
  if (!args[index]?.startsWith("--") || !args[index + 1]) {
    throw new Error(
      "Usage: node scripts/finalize-cloudflare-smoke.mjs --draft path [--load path --snapshot path --cpu-ms-p95 value] [--output path]",
    );
  }
  options.set(args[index].slice(2), args[index + 1]);
}
if (!options.has("draft")) throw new Error("--draft is required");

const draft = JSON.parse(await readFile(options.get("draft"), "utf8"));
if (draft.schemaVersion !== 1 || !new Set(["production", "staging"]).has(draft.environment)) {
  throw new Error("Draft must be a production or staging schemaVersion 1 smoke record");
}

let loadResult = null;
let snapshotResult = null;
if (draft.environment === "staging") {
  for (const required of ["load", "snapshot"]) {
    if (!options.has(required)) throw new Error(`--${required} is required for staging`);
  }
  loadResult = JSON.parse(await readFile(options.get("load"), "utf8"));
  snapshotResult = JSON.parse(await readFile(options.get("snapshot"), "utf8"));
  if (
    loadResult.passed !== true ||
    loadResult.baseUrl !== process.env.CLOUDFLARE_STAGING_SITE_URL ||
    loadResult.stateWs < 1000 ||
    loadResult.websocket?.ready !== loadResult.stateWs ||
    loadResult.completedBroadcasts < 5
  ) {
    throw new Error("Load result must show 1000 ready sockets and at least 5 complete broadcasts");
  }
  if (
    snapshotResult.requestPassed !== true ||
    snapshotResult.environment !== "staging" ||
    snapshotResult.attempts < 3 ||
    snapshotResult.integrity !== true ||
    snapshotResult.inactiveGeneration !== true ||
    snapshotResult.r2Stored !== true
  ) {
    throw new Error("Snapshot result must show at least 3 successful inactive maximum imports");
  }
}

const prompts = [
  [
    "allowedAdminIdentity",
    "Allowed administrator opened /admin and completed one reversible mutation",
  ],
  ["deniedAdminIdentity", "Unlisted or unauthenticated identity was denied at /admin"],
  [
    "allowedScreenIdentity",
    "Allowed venue operator opened /screen and both screen WebSockets became ready",
  ],
  ["deniedScreenIdentity", "Unlisted or unauthenticated identity was denied at /screen"],
  [
    "turnstileSingleReach",
    "A real Turnstile solve increased reach exactly once, including retry verification",
  ],
  ["imageUpload", "A new image was uploaded and returned 200 in a separate private browser"],
  [
    "screenReauthentication",
    "Screen sockets closed after 30 minutes and reconnected only after JWT revalidation",
  ],
  ["backupPrivate", "The backup bucket could not be read from a public URL"],
  [
    "observability",
    "Operator opened Access audit, Worker/DO Analytics, WAF Events, and today's snapshot",
  ],
  ["breakGlass", "Named break-glass administrator completed MFA with the documented short session"],
];
const readline = createInterface({ input: process.stdin, output: process.stdout });
const manual = {};
let cpuMsP95 = Number(options.get("cpu-ms-p95"));
try {
  for (const [field, question] of prompts) {
    const answer = (await readline.question(`${question}\nType yes to attest: `))
      .trim()
      .toLowerCase();
    if (answer !== "yes") throw new Error(`Manual attestation stopped at ${field}`);
    manual[field] = true;
  }
  if (draft.environment === "staging" && !Number.isFinite(cpuMsP95)) {
    cpuMsP95 = Number(
      await readline.question(
        "Enter staging maximum-snapshot Worker CPU p95 from Cloudflare Analytics (ms): ",
      ),
    );
  }
} finally {
  readline.close();
}
if (
  draft.environment === "staging" &&
  (!Number.isFinite(cpuMsP95) || cpuMsP95 < 0 || cpuMsP95 > 10)
) {
  throw new Error("Maximum-snapshot Worker CPU p95 must be between 0 and 10 ms");
}

const whoami = JSON.parse(
  execFileSync("./scripts/cloudflare-wrangler.sh", ["whoami", "--json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  }),
);
const record = {
  ...draft,
  operator: whoami.email,
  checkedAt: new Date().toISOString(),
  manual,
  load:
    draft.environment === "staging"
      ? {
          passed: true,
          stateWs: loadResult.stateWs,
          ready: loadResult.websocket.ready,
          completedBroadcasts: loadResult.completedBroadcasts,
          httpClientFailures: loadResult.httpClientFailures,
          httpServerFailures: loadResult.httpServerFailures,
          openFailures: loadResult.websocket.openFailures,
          readyFailures: loadResult.websocket.readyFailures,
          openLatencyP95Ms: loadResult.websocket.openLatencyP95Ms,
          readyLatencyP95Ms: loadResult.websocket.readyLatencyP95Ms,
          broadcasts: loadResult.broadcastResults,
          completedAt: loadResult.completedAt,
        }
      : null,
  snapshot:
    draft.environment === "staging"
      ? {
          passed: true,
          attempts: snapshotResult.attempts,
          payloadBytes: snapshotResult.payloadBytes,
          cpuMsP95,
          latencyMsP95: snapshotResult.latencyMsP95,
          integrity: true,
          inactiveGeneration: true,
          r2Stored: true,
          results: snapshotResult.results,
          completedAt: snapshotResult.completedAt,
        }
      : null,
};
const outputPath =
  options.get("output") ?? `.cloudflare/deployments/${draft.environment}-${draft.releaseSha}.json`;
const temporaryPath = `${outputPath}.${process.pid}.tmp`;
await mkdir(dirname(outputPath), { recursive: true, mode: 0o700 });
await writeFile(temporaryPath, `${JSON.stringify(record, null, 2)}\n`, { mode: 0o600, flag: "wx" });
await chmod(temporaryPath, 0o600);
await rename(temporaryPath, outputPath);
if (draft.environment === "staging") {
  execFileSync(
    "node",
    [
      "scripts/verify-cloudflare-smoke-record.mjs",
      outputPath,
      draft.releaseSha,
      draft.workerVersionId,
    ],
    { stdio: "inherit" },
  );
}
console.log(`Final ${draft.environment} smoke record written to ${outputPath}.`);
