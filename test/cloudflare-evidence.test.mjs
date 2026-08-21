import { describe, expect, it } from "vitest";

import {
  EVIDENCE_SCHEMA_VERSION,
  validateStagingSmokeRecord,
} from "../scripts/cloudflare-evidence.mjs";

const SOURCE_RELEASE_SHA = "a".repeat(40);
const WORKER_VERSION_ID = "staging-worker-version";
const FINALIZED_AT = "2026-08-13T00:13:00.000Z";

function createRecord() {
  return {
    schemaVersion: EVIDENCE_SCHEMA_VERSION,
    environment: "staging",
    sourceReleaseSha: SOURCE_RELEASE_SHA,
    workerVersionId: WORKER_VERSION_ID,
    deploymentCreatedAt: "2026-08-13T00:00:00.000Z",
    operator: "operator@example.com",
    automated: {
      environment: "staging",
      sourceReleaseSha: SOURCE_RELEASE_SHA,
      scenario: "automated-smoke",
      startedAt: "2026-08-13T00:01:00.000Z",
      completedAt: "2026-08-13T00:02:00.000Z",
      publicPage: true,
      stateApi: true,
      prizeImage: true,
      accessRedirects: true,
      separateAccessApplications: true,
      publicWebSocket: true,
    },
    evidence: {
      siteOrigin: "https://staging.example.com",
      imageOrigin: "https://staging-media.example.com",
      stateGeneration: "candidate-generation",
      stateRevision: 1,
      websocket: {
        generation: "candidate-generation",
        revision: 1,
      },
    },
    manual: {
      allowedAdminIdentity: true,
      deniedAdminIdentity: true,
      allowedScreenIdentity: true,
      deniedScreenIdentity: true,
      turnstileSingleReach: true,
      imageUpload: true,
      screenReauthentication: true,
      backupPrivate: true,
      observability: true,
    },
    browser: {
      environment: "staging",
      sourceReleaseSha: SOURCE_RELEASE_SHA,
      scenario: "browser-smoke",
      siteOrigin: "https://staging.example.com",
      generation: "candidate-generation",
      revision: 2,
      startedAt: "2026-08-13T00:03:00.000Z",
      completedAt: "2026-08-13T00:04:00.000Z",
      publicHome: true,
      prizesPage: true,
      adminMutation: true,
      screenRealtime: true,
      deniedAccess: true,
      turnstileReach: true,
    },
    load: {
      schemaVersion: 2,
      distributed: true,
      environment: "staging",
      sourceReleaseSha: SOURCE_RELEASE_SHA,
      targetReleaseSha: SOURCE_RELEASE_SHA,
      releaseStable: true,
      scenario: "distributed-broadcast",
      shardCount: 4,
      passed: true,
      baseUrl: "https://staging.example.com",
      startedAt: "2026-08-13T00:05:00.000Z",
      completedAt: "2026-08-13T00:10:00.000Z",
      stateWs: 1000,
      completedBroadcasts: 5,
      httpClientFailures: 0,
      httpServerFailures: 0,
      websocket: {
        ready: 1000,
        openFailures: 0,
        readyFailures: 0,
      },
    },
    snapshot: {
      schemaVersion: 2,
      environment: "staging",
      sourceReleaseSha: SOURCE_RELEASE_SHA,
      scenario: "maximum-snapshot-import",
      startedAt: "2026-08-13T00:11:00.000Z",
      completedAt: "2026-08-13T00:12:00.000Z",
      passed: true,
      attempts: 3,
      payloadBytes: 1_900_000,
      cpuMsP95: 8.5,
      integrity: true,
      inactiveGeneration: true,
      r2Stored: true,
    },
    finalizedAt: FINALIZED_AT,
  };
}

function validate(record, nowMs = Date.parse(FINALIZED_AT)) {
  return validateStagingSmokeRecord(record, {
    sourceReleaseSha: SOURCE_RELEASE_SHA,
    workerVersionId: WORKER_VERSION_ID,
    nowMs,
  });
}

describe("staging promotion evidence", () => {
  it("accepts fresh evidence bound to one deployed candidate", () => {
    const record = createRecord();
    expect(validate(record)).toBe(record);
  });

  it("rejects evidence for another release or active Worker version", () => {
    const record = createRecord();
    record.load.targetReleaseSha = "b".repeat(40);
    expect(() => validate(record)).toThrow(/load target release/);

    const correctRecord = createRecord();
    expect(() =>
      validateStagingSmokeRecord(correctRecord, {
        sourceReleaseSha: SOURCE_RELEASE_SHA,
        workerVersionId: "another-worker-version",
        nowMs: Date.parse(FINALIZED_AT),
      }),
    ).toThrow(/active staging version/);
  });

  it("rejects single-egress or pre-deployment load evidence", () => {
    const singleEgress = createRecord();
    singleEgress.load.distributed = false;
    expect(() => validate(singleEgress)).toThrow(/distributed/);

    const predatingDeployment = createRecord();
    predatingDeployment.load.startedAt = "2026-08-12T23:59:00.000Z";
    expect(() => validate(predatingDeployment)).toThrow(/predates the candidate deployment/);
  });

  it("rejects stale records and browser observations of another generation", () => {
    const wrongGeneration = createRecord();
    wrongGeneration.browser.generation = "old-generation";
    expect(() => validate(wrongGeneration)).toThrow(/state generation/);

    const stale = createRecord();
    expect(() => validate(stale, Date.parse("2026-08-14T00:13:00.001Z"))).toThrow(
      /within the last 24 hours/,
    );
  });
});
