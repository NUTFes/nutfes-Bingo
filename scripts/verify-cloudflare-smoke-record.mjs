#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import process from "node:process";

const [recordPath, releaseSha, workerVersionId] = process.argv.slice(2);
if (!recordPath || !releaseSha || !workerVersionId) {
  console.error(
    "Usage: node scripts/verify-cloudflare-smoke-record.mjs <record.json> <release-sha> <staging-version-id>",
  );
  process.exit(2);
}

const record = JSON.parse(await readFile(recordPath, "utf8"));
const fail = (message) => {
  throw new Error(`Invalid staging smoke record: ${message}`);
};
const requireTrueFields = (value, fields, label) => {
  if (typeof value !== "object" || value === null) fail(`${label} is missing`);
  for (const field of fields) {
    if (value[field] !== true) fail(`${label}.${field} must be true`);
  }
};

if (record.schemaVersion !== 2) fail("schemaVersion must be 2");
if (record.environment !== "staging") fail("environment must be staging");
if (record.releaseSha !== releaseSha) fail("releaseSha does not match the production candidate");
if (record.workerVersionId !== workerVersionId) {
  fail("workerVersionId is not the active staging version");
}
if (typeof record.operator !== "string" || record.operator.length === 0) {
  fail("operator is missing");
}
const checkedAt = Date.parse(record.checkedAt);
if (!Number.isFinite(checkedAt)) fail("checkedAt is invalid");
const ageMs = Date.now() - checkedAt;
if (ageMs < 0 || ageMs > 24 * 60 * 60 * 1000) {
  fail("checkedAt must be within the last 24 hours");
}

requireTrueFields(
  record.automated,
  [
    "publicPage",
    "stateApi",
    "prizeImage",
    "accessRedirects",
    "separateAccessApplications",
    "publicWebSocket",
  ],
  "automated",
);
requireTrueFields(
  record.manual,
  [
    "allowedAdminIdentity",
    "deniedAdminIdentity",
    "allowedScreenIdentity",
    "deniedScreenIdentity",
    "turnstileSingleReach",
    "imageUpload",
    "screenReauthentication",
    "backupPrivate",
    "observability",
  ],
  "manual",
);

const load = record.load;
if (typeof load !== "object" || load === null || load.passed !== true)
  fail("load.passed must be true");
if (!Number.isSafeInteger(load.stateWs) || load.stateWs < 1000)
  fail("load.stateWs must be at least 1000");
if (load.ready !== load.stateWs) fail("all load-test WebSockets must become ready");
if (!Number.isSafeInteger(load.completedBroadcasts) || load.completedBroadcasts < 5) {
  fail("load.completedBroadcasts must be at least 5");
}
for (const field of ["httpClientFailures", "httpServerFailures", "openFailures", "readyFailures"]) {
  if (load[field] !== 0) fail(`load.${field} must be 0`);
}

const snapshot = record.snapshot;
if (typeof snapshot !== "object" || snapshot === null || snapshot.passed !== true) {
  fail("snapshot.passed must be true");
}
if (!Number.isSafeInteger(snapshot.attempts) || snapshot.attempts < 3) {
  fail("snapshot.attempts must be at least 3");
}
if (!Number.isSafeInteger(snapshot.payloadBytes) || snapshot.payloadBytes <= 0) {
  fail("snapshot.payloadBytes must be a positive integer");
}
if (typeof snapshot.cpuMsP95 !== "number" || snapshot.cpuMsP95 < 0 || snapshot.cpuMsP95 > 10) {
  fail("snapshot.cpuMsP95 must be within the Workers Free 10 ms limit");
}
requireTrueFields(snapshot, ["integrity", "inactiveGeneration", "r2Stored"], "snapshot");

console.log(`Verified staging smoke record for git:${releaseSha} (${workerVersionId}).`);
