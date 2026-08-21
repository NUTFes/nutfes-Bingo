#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import process from "node:process";
import { createInterface } from "node:readline/promises";
import {
  assertEvidenceWindow,
  EVIDENCE_SCHEMA_VERSION,
  parseEvidenceTimestamp,
} from "./cloudflare-evidence.mjs";

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
if (
  draft.schemaVersion !== EVIDENCE_SCHEMA_VERSION ||
  (draft.environment !== "production" && draft.environment !== "staging")
) {
  throw new Error(
    `Draft must be a production or staging schemaVersion ${EVIDENCE_SCHEMA_VERSION} smoke record`,
  );
}
if (!/^[a-f0-9]{40}$/.test(draft.sourceReleaseSha ?? "")) {
  throw new Error("Draft sourceReleaseSha must be a full Git SHA");
}
parseEvidenceTimestamp(draft.deploymentCreatedAt, "deploymentCreatedAt");
execFileSync("./scripts/check-cloudflare-operator.sh", ["--env", draft.environment], {
  stdio: "inherit",
});

let loadResult = null;
let snapshotResult = null;
if (draft.environment === "staging") {
  for (const required of ["load", "snapshot"]) {
    if (!options.has(required)) throw new Error(`--${required} is required for staging`);
  }
  loadResult = JSON.parse(await readFile(options.get("load"), "utf8"));
  snapshotResult = JSON.parse(await readFile(options.get("snapshot"), "utf8"));
  if (
    loadResult.schemaVersion !== 2 ||
    loadResult.distributed !== true ||
    loadResult.environment !== "staging" ||
    loadResult.sourceReleaseSha !== draft.sourceReleaseSha ||
    loadResult.scenario !== "distributed-broadcast" ||
    loadResult.shardCount !== 4 ||
    loadResult.targetReleaseSha !== draft.sourceReleaseSha ||
    loadResult.releaseStable !== true ||
    loadResult.passed !== true ||
    loadResult.baseUrl !== draft.evidence?.siteOrigin ||
    loadResult.stateWs < 1000 ||
    loadResult.websocket?.ready !== loadResult.stateWs ||
    loadResult.completedBroadcasts < 5
  ) {
    throw new Error("Load result must be the candidate's 4-shard distributed 1000-socket evidence");
  }
  if (
    snapshotResult.schemaVersion !== 2 ||
    snapshotResult.passed !== true ||
    snapshotResult.environment !== "staging" ||
    snapshotResult.sourceReleaseSha !== draft.sourceReleaseSha ||
    snapshotResult.scenario !== "maximum-snapshot-import" ||
    snapshotResult.attempts < 3 ||
    snapshotResult.integrity !== true ||
    snapshotResult.inactiveGeneration !== true ||
    snapshotResult.r2Stored !== true
  ) {
    throw new Error("Snapshot result must belong to this candidate and show 3 maximum imports");
  }
}

const prompts = [
  ["publicHome", null, "Public Home rendered the current number and reach state"],
  ["prizesPage", null, "Prizes rendered prize names and images without a broken image"],
  [
    "adminMutation",
    "allowedAdminIdentity",
    "Allowed administrator completed one reversible mutation that reached Home and Screen",
  ],
  [null, "deniedAdminIdentity", "Unlisted or unauthenticated identity was denied at /admin"],
  [
    "screenRealtime",
    "allowedScreenIdentity",
    "Allowed venue operator opened /screen; both sockets became ready and recovered after reconnect",
  ],
  [null, "deniedScreenIdentity", "Unlisted or unauthenticated identity was denied at /screen"],
  [
    "turnstileReach",
    "turnstileSingleReach",
    "A real Turnstile solve increased reach exactly once, including retry verification",
  ],
  [null, "imageUpload", "A new image was uploaded and returned 200 in a private browser"],
  [null, "screenReauthentication", "Screen sockets reconnected only after JWT revalidation"],
  [null, "backupPrivate", "The backup bucket could not be read from a public URL"],
  [
    null,
    "observability",
    "Operator opened Access audit, Worker/DO Analytics, WAF Events, and today's snapshot",
  ],
];
const readline = createInterface({ input: process.stdin, output: process.stdout });
const manual = {};
const browserChecks = {};
const browserStartedAt = new Date().toISOString();
let browserGeneration;
let browserRevision;
let browserCompletedAt;
let cpuMsP95 = Number(options.get("cpu-ms-p95"));
try {
  for (const [browserField, manualField, question] of prompts) {
    const answer = (await readline.question(`${question}\nType yes to attest: `))
      .trim()
      .toLowerCase();
    if (answer !== "yes") throw new Error(`Manual attestation stopped at ${question}`);
    if (browserField !== null) browserChecks[browserField] = true;
    if (manualField !== null) manual[manualField] = true;
  }
  browserChecks.deniedAccess =
    manual.deniedAdminIdentity === true && manual.deniedScreenIdentity === true;
  browserGeneration = (
    await readline.question("Enter the generation displayed by Home and Screen: ")
  ).trim();
  browserRevision = Number(
    await readline.question("Enter the revision displayed or observed during browser smoke: "),
  );
  browserCompletedAt = new Date().toISOString();
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
if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(browserGeneration ?? "")) {
  throw new Error("Browser smoke generation is invalid");
}
if (!Number.isSafeInteger(browserRevision) || browserRevision < 0) {
  throw new Error("Browser smoke revision must be a non-negative safe integer");
}
if (
  draft.environment === "staging" &&
  (!Number.isFinite(cpuMsP95) || cpuMsP95 < 0 || cpuMsP95 > 10)
) {
  throw new Error("Maximum-snapshot Worker CPU p95 must be between 0 and 10 ms");
}

const finalizedAt = new Date().toISOString();
const finalizedAtMs = Date.parse(finalizedAt);
const deploymentCreatedAtMs = Date.parse(draft.deploymentCreatedAt);
assertEvidenceWindow(draft.automated, {
  label: "automated",
  environment: draft.environment,
  sourceReleaseSha: draft.sourceReleaseSha,
  deploymentCreatedAt: deploymentCreatedAtMs,
  finalizedAt: finalizedAtMs,
  scenario: "automated-smoke",
});
if (draft.environment === "staging") {
  assertEvidenceWindow(loadResult, {
    label: "load",
    environment: "staging",
    sourceReleaseSha: draft.sourceReleaseSha,
    deploymentCreatedAt: deploymentCreatedAtMs,
    finalizedAt: finalizedAtMs,
    scenario: "distributed-broadcast",
  });
  assertEvidenceWindow(snapshotResult, {
    label: "snapshot",
    environment: "staging",
    sourceReleaseSha: draft.sourceReleaseSha,
    deploymentCreatedAt: deploymentCreatedAtMs,
    finalizedAt: finalizedAtMs,
    scenario: "maximum-snapshot-import",
  });
}

const whoami = JSON.parse(
  execFileSync(
    "./scripts/cloudflare-wrangler.sh",
    ["--target", draft.environment, "whoami", "--json"],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "inherit"],
    },
  ),
);
const browser = {
  ...browserChecks,
  environment: draft.environment,
  sourceReleaseSha: draft.sourceReleaseSha,
  scenario: "browser-smoke",
  siteOrigin: draft.evidence.siteOrigin,
  generation: browserGeneration,
  revision: browserRevision,
  startedAt: browserStartedAt,
  completedAt: browserCompletedAt,
};
assertEvidenceWindow(browser, {
  label: "browser",
  environment: draft.environment,
  sourceReleaseSha: draft.sourceReleaseSha,
  deploymentCreatedAt: deploymentCreatedAtMs,
  finalizedAt: finalizedAtMs,
  scenario: "browser-smoke",
});
const record = {
  ...draft,
  operator: whoami.email,
  manual,
  browser,
  load: loadResult,
  snapshot:
    draft.environment === "staging"
      ? {
          ...snapshotResult,
          cpuMsP95,
        }
      : null,
  finalizedAt,
};
const outputPath =
  options.get("output") ??
  `.cloudflare/deployments/${draft.environment}-${draft.sourceReleaseSha}.json`;
const temporaryPath = `${outputPath}.${process.pid}.tmp`;
await mkdir(dirname(outputPath), { recursive: true, mode: 0o700 });
await writeFile(temporaryPath, `${JSON.stringify(record, null, 2)}\n`, {
  mode: 0o600,
  flag: "wx",
});
await chmod(temporaryPath, 0o600);
await rename(temporaryPath, outputPath);
if (draft.environment === "staging") {
  execFileSync(
    "node",
    [
      "scripts/verify-cloudflare-smoke-record.mjs",
      outputPath,
      draft.sourceReleaseSha,
      draft.workerVersionId,
    ],
    { stdio: "inherit" },
  );
}
console.log(`Final ${draft.environment} smoke record written to ${outputPath}.`);
