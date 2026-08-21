export const EVIDENCE_SCHEMA_VERSION = 3;
export const EVIDENCE_MAX_AGE_MS = 24 * 60 * 60 * 1_000;

const AUTOMATED_FIELDS = [
  "publicPage",
  "stateApi",
  "prizeImage",
  "accessRedirects",
  "separateAccessApplications",
  "publicWebSocket",
];
const MANUAL_FIELDS = [
  "allowedAdminIdentity",
  "deniedAdminIdentity",
  "allowedScreenIdentity",
  "deniedScreenIdentity",
  "turnstileSingleReach",
  "imageUpload",
  "screenReauthentication",
  "backupPrivate",
  "observability",
];
const BROWSER_FIELDS = [
  "publicHome",
  "prizesPage",
  "adminMutation",
  "screenRealtime",
  "deniedAccess",
  "turnstileReach",
];

function fail(message) {
  throw new Error(`Invalid staging smoke record: ${message}`);
}

function requireObject(value, label) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail(`${label} is missing`);
  }
  return value;
}

function requireTrueFields(value, fields, label) {
  const record = requireObject(value, label);
  for (const field of fields) {
    if (record[field] !== true) fail(`${label}.${field} must be true`);
  }
  return record;
}

export function parseEvidenceTimestamp(value, label) {
  if (typeof value !== "string") fail(`${label} is missing`);
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) fail(`${label} is invalid`);
  return timestamp;
}

export function assertEvidenceWindow(
  evidence,
  { label, environment, sourceReleaseSha, deploymentCreatedAt, finalizedAt, scenario },
) {
  const record = requireObject(evidence, label);
  if (record.environment !== environment) fail(`${label}.environment does not match`);
  if (record.sourceReleaseSha !== sourceReleaseSha) {
    fail(`${label}.sourceReleaseSha does not match`);
  }
  if (record.scenario !== scenario) fail(`${label}.scenario must be ${scenario}`);
  const startedAt = parseEvidenceTimestamp(record.startedAt, `${label}.startedAt`);
  const completedAt = parseEvidenceTimestamp(record.completedAt, `${label}.completedAt`);
  if (startedAt < deploymentCreatedAt) {
    fail(`${label}.startedAt predates the candidate deployment`);
  }
  if (completedAt < startedAt) fail(`${label}.completedAt predates startedAt`);
  if (completedAt > finalizedAt) fail(`${label}.completedAt is after finalizedAt`);
  if (finalizedAt - completedAt > EVIDENCE_MAX_AGE_MS) {
    fail(`${label}.completedAt is older than 24 hours`);
  }
  return record;
}

export function validateStagingSmokeRecord(
  recordValue,
  { sourceReleaseSha, workerVersionId, nowMs = Date.now() },
) {
  const record = requireObject(recordValue, "record");
  if (record.schemaVersion !== EVIDENCE_SCHEMA_VERSION) {
    fail(`schemaVersion must be ${EVIDENCE_SCHEMA_VERSION}`);
  }
  if (record.environment !== "staging") fail("environment must be staging");
  if (record.sourceReleaseSha !== sourceReleaseSha) {
    fail("sourceReleaseSha does not match the production candidate");
  }
  if (record.workerVersionId !== workerVersionId) {
    fail("workerVersionId is not the active staging version");
  }
  if (typeof record.operator !== "string" || record.operator.length === 0) {
    fail("operator is missing");
  }

  const deploymentCreatedAt = parseEvidenceTimestamp(
    record.deploymentCreatedAt,
    "deploymentCreatedAt",
  );
  const finalizedAt = parseEvidenceTimestamp(record.finalizedAt, "finalizedAt");
  const ageMs = nowMs - finalizedAt;
  if (ageMs < 0 || ageMs > EVIDENCE_MAX_AGE_MS) {
    fail("finalizedAt must be within the last 24 hours");
  }
  if (deploymentCreatedAt > finalizedAt) fail("deploymentCreatedAt is after finalizedAt");

  const automated = assertEvidenceWindow(record.automated, {
    label: "automated",
    environment: "staging",
    sourceReleaseSha,
    deploymentCreatedAt,
    finalizedAt,
    scenario: "automated-smoke",
  });
  requireTrueFields(automated, AUTOMATED_FIELDS, "automated");
  const stateGeneration = record.evidence?.stateGeneration;
  const stateRevision = record.evidence?.stateRevision;
  if (
    typeof stateGeneration !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(stateGeneration)
  ) {
    fail("evidence.stateGeneration is invalid");
  }
  if (!Number.isSafeInteger(stateRevision) || stateRevision < 0) {
    fail("evidence.stateRevision must be a non-negative safe integer");
  }
  if (
    record.evidence?.websocket?.generation !== stateGeneration ||
    record.evidence?.websocket?.revision !== stateRevision
  ) {
    fail("automated HTTP and WebSocket state evidence do not match");
  }
  requireTrueFields(record.manual, MANUAL_FIELDS, "manual");

  const browser = assertEvidenceWindow(record.browser, {
    label: "browser",
    environment: "staging",
    sourceReleaseSha,
    deploymentCreatedAt,
    finalizedAt,
    scenario: "browser-smoke",
  });
  requireTrueFields(browser, BROWSER_FIELDS, "browser");
  if (browser.siteOrigin !== record.evidence?.siteOrigin) {
    fail("browser.siteOrigin does not match the automated site origin");
  }
  if (
    typeof browser.generation !== "string" ||
    browser.generation !== record.evidence?.stateGeneration
  ) {
    fail("browser.generation does not match the automated state generation");
  }
  if (
    !Number.isSafeInteger(browser.revision) ||
    browser.revision < record.evidence?.stateRevision
  ) {
    fail("browser.revision must not predate the automated state revision");
  }

  const load = assertEvidenceWindow(record.load, {
    label: "load",
    environment: "staging",
    sourceReleaseSha,
    deploymentCreatedAt,
    finalizedAt,
    scenario: "distributed-broadcast",
  });
  if (load.schemaVersion !== 2) fail("load.schemaVersion must be 2");
  if (load.distributed !== true) fail("load.distributed must be true");
  if (load.shardCount !== 4) fail("load.shardCount must be 4");
  if (load.passed !== true) fail("load.passed must be true");
  if (load.targetReleaseSha !== sourceReleaseSha || load.releaseStable !== true) {
    fail("load target release does not match the production candidate");
  }
  if (load.baseUrl !== record.evidence?.siteOrigin) {
    fail("load.baseUrl does not match the automated site origin");
  }
  if (!Number.isSafeInteger(load.stateWs) || load.stateWs < 1000) {
    fail("load.stateWs must be at least 1000");
  }
  if (load.websocket?.ready !== load.stateWs) {
    fail("all load-test WebSockets must become ready");
  }
  if (!Number.isSafeInteger(load.completedBroadcasts) || load.completedBroadcasts < 5) {
    fail("load.completedBroadcasts must be at least 5");
  }
  for (const field of ["httpClientFailures", "httpServerFailures"]) {
    if (load[field] !== 0) fail(`load.${field} must be 0`);
  }
  for (const field of ["openFailures", "readyFailures"]) {
    if (load.websocket?.[field] !== 0) fail(`load.websocket.${field} must be 0`);
  }

  const snapshot = assertEvidenceWindow(record.snapshot, {
    label: "snapshot",
    environment: "staging",
    sourceReleaseSha,
    deploymentCreatedAt,
    finalizedAt,
    scenario: "maximum-snapshot-import",
  });
  if (snapshot.schemaVersion !== 2) fail("snapshot.schemaVersion must be 2");
  if (snapshot.passed !== true) fail("snapshot.passed must be true");
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

  return record;
}
