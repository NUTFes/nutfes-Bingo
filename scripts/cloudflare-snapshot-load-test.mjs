#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { chmod, mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import process from "node:process";

const MAX_PRIZES = 100;
const MAX_REACH_LOGS = 2_000;
const MAX_REACH_SUBMISSIONS = 2_000;
const MAX_AUDIT_LOG_ROWS = 200;
const MAX_AUDIT_PAYLOAD_BYTES = 4 * 1024;
const MAX_SNAPSHOT_BYTES = 2 * 1024 * 1024;
const TIMESTAMP = "2026-07-13T00:00:00.123456+00:00";

const args = process.argv.slice(2);
let accessJwtFile;
let outputPath;
let attempts = 3;
for (let index = 0; index < args.length; index += 1) {
  const argument = args[index];
  if (argument === "--access-jwt-file" && args[index + 1]) {
    accessJwtFile = args[index + 1];
    index += 1;
  } else if (argument === "--output" && args[index + 1]) {
    outputPath = args[index + 1];
    index += 1;
  } else if (argument === "--attempts" && args[index + 1]) {
    attempts = Number(args[index + 1]);
    index += 1;
  } else {
    throw new Error(
      "Usage: node scripts/cloudflare-snapshot-load-test.mjs --access-jwt-file path --output path [--attempts 3]",
    );
  }
}
if (!accessJwtFile || !outputPath) throw new Error("--access-jwt-file and --output are required");
if (!Number.isSafeInteger(attempts) || attempts < 3 || attempts > 10) {
  throw new Error("--attempts must be an integer from 3 to 10");
}
const siteUrlValue = process.env.CLOUDFLARE_STAGING_SITE_URL;
if (!siteUrlValue)
  throw new Error("CLOUDFLARE_STAGING_SITE_URL must be loaded from cloudflare.project.env");
const siteUrl = new URL(siteUrlValue);

const tokenStats = await stat(accessJwtFile);
if ((tokenStats.mode & 0o077) !== 0) throw new Error("Access JWT file must have mode 600");
const accessJwt = (await readFile(accessJwtFile, "utf8")).trim();
if (!/^[A-Za-z0-9._-]+$/.test(accessJwt)) throw new Error("Access JWT file is empty or malformed");

const largeId = 9_000_000_000_000;
const auditPayload = JSON.stringify({ value: "a".repeat(MAX_AUDIT_PAYLOAD_BYTES - 12) });
const snapshot = {
  schema_version: 1,
  source_generation: "maximum-load-test-source",
  revision: largeId,
  created_at: TIMESTAMP,
  numbers: Array.from({ length: 99 }, (_, index) => ({
    id: largeId + index,
    number: index + 1,
    created_at: TIMESTAMP,
    updated_at: TIMESTAMP,
  })),
  prizes: Array.from({ length: MAX_PRIZES }, (_, index) => ({
    id: largeId + index,
    name_jp: "あ".repeat(120),
    name_en: "あ".repeat(160),
    image_path: `/PrizeItem/${"あ".repeat(200)}.webp`,
    is_won: false,
    sort_order: largeId + index,
    created_at: TIMESTAMP,
    updated_at: TIMESTAMP,
  })),
  app_state: {
    id: 1,
    survey_url: `https://example.com/${"x".repeat(2_000)}`,
    is_survey_active: true,
    reach_count: largeId,
    updated_at: TIMESTAMP,
  },
  reach_logs: Array.from({ length: MAX_REACH_LOGS }, (_, index) => ({
    id: largeId + index,
    delta: 1,
    reach_num: largeId + index,
    source: "あ".repeat(32),
    created_at: TIMESTAMP,
  })),
  reach_submissions: Array.from({ length: MAX_REACH_SUBMISSIONS }, (_, index) => ({
    client_hash: index.toString(16).padStart(64, "0"),
    created_at: TIMESTAMP,
  })),
  audit_log: Array.from({ length: MAX_AUDIT_LOG_ROWS }, (_, index) => ({
    id: largeId + index,
    revision: largeId + index,
    actor: "あ".repeat(320),
    action: "あ".repeat(80),
    payload_json: auditPayload,
    created_at: TIMESTAMP,
  })),
};
const envelopeBytes = new TextEncoder().encode(
  JSON.stringify({
    format: "nutfes-bingo-logical-snapshot",
    format_version: 1,
    checksum_sha256: "0".repeat(64),
    snapshot,
  }),
).byteLength;
if (envelopeBytes > MAX_SNAPSHOT_BYTES) throw new Error("Generated maximum snapshot exceeds 2 MiB");

const sourceReleaseSha = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
if (!/^[a-f0-9]{40}$/.test(sourceReleaseSha)) {
  throw new Error("The current Git HEAD is not a full release SHA");
}
const evidenceStartedAt = new Date().toISOString();

const results = [];
for (let index = 0; index < attempts; index += 1) {
  const generation = `loadtest-${Date.now().toString(36)}-${index}`;
  const startedAt = performance.now();
  const response = await fetch(new URL("/admin/api/import", siteUrl), {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/json",
      Cookie: `CF_Authorization=${accessJwt}`,
      Origin: siteUrl.origin,
    },
    body: JSON.stringify({ generation, snapshot, activate: false }),
    signal: AbortSignal.timeout(120_000),
  });
  const latencyMs = Math.round((performance.now() - startedAt) * 100) / 100;
  const body = await response.json().catch(() => null);
  if (response.status !== 201) {
    throw new Error(
      `Maximum snapshot import ${index + 1} returned ${response.status}: ${JSON.stringify(body)}`,
    );
  }
  const data = body?.data;
  if (
    data?.generation !== generation ||
    data?.activated !== false ||
    data?.integrity?.matches !== true ||
    typeof data?.backup?.key !== "string" ||
    !Number.isSafeInteger(data?.backup?.size)
  ) {
    throw new Error(
      `Maximum snapshot import ${index + 1} returned invalid integrity or R2 evidence`,
    );
  }
  results.push({
    generation,
    latencyMs,
    revision: data.integrity.revision,
    backupKey: data.backup.key,
    backupSize: data.backup.size,
    checksum: data.backup.checksum_sha256,
  });
}

const sortedLatencies = results
  .map((result) => result.latencyMs)
  .toSorted((left, right) => left - right);
const p95Index = Math.max(0, Math.ceil(sortedLatencies.length * 0.95) - 1);
const result = {
  schemaVersion: 2,
  environment: "staging",
  sourceReleaseSha,
  scenario: "maximum-snapshot-import",
  startedAt: evidenceStartedAt,
  completedAt: new Date().toISOString(),
  passed: true,
  attempts,
  payloadBytes: envelopeBytes,
  latencyMsP95: sortedLatencies[p95Index],
  integrity: true,
  inactiveGeneration: true,
  r2Stored: true,
  results,
};
const temporaryPath = `${outputPath}.${process.pid}.tmp`;
await mkdir(dirname(outputPath), { recursive: true, mode: 0o700 });
await writeFile(temporaryPath, `${JSON.stringify(result, null, 2)}\n`, { mode: 0o600, flag: "wx" });
await chmod(temporaryPath, 0o600);
await rename(temporaryPath, outputPath);
console.log(`Maximum snapshot import passed ${attempts}/${attempts}; wrote ${outputPath}.`);
