#!/usr/bin/env node

import { chmod, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import process from "node:process";

const GENERATION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const RELEASE_SHA_PATTERN = /^[a-f0-9]{40}$/;
const RECEIPT_MAX_AGE_MS = 24 * 60 * 60 * 1_000;

const usage = `Usage:
  mise run cloudflare:restore -- --env production|staging --key snapshots/... --generation <new-generation> --access-jwt-file <mode-600-file> [--output path]
  mise run cloudflare:activate -- --env production|staging --restore-record <restore.json> --access-jwt-file <mode-600-file> [--output path]`;

const [command, ...rawOptions] = process.argv.slice(2);
if (command === "--help" || command === "help") {
  console.log(usage);
  process.exit(0);
}
if (command !== "restore" && command !== "activate") throw new Error(usage);

const allowedOptions =
  command === "restore"
    ? new Set(["env", "key", "generation", "access-jwt-file", "output"])
    : new Set(["env", "restore-record", "access-jwt-file", "output"]);
const options = new Map();
for (let index = 0; index < rawOptions.length; index += 2) {
  const option = rawOptions[index];
  const value = rawOptions[index + 1];
  if (!option?.startsWith("--") || value === undefined) throw new Error(usage);
  const name = option.slice(2);
  if (!allowedOptions.has(name)) throw new Error(`Unknown ${command} option: ${option}`);
  if (options.has(name)) throw new Error(`Duplicate option: ${option}`);
  options.set(name, value);
}

const environment = options.get("env");
if (environment !== "production" && environment !== "staging") {
  throw new Error("--env must be production or staging");
}
process.loadEnvFile("./cloudflare.project.env");
const siteUrlValue = process.env[`CLOUDFLARE_${environment.toUpperCase()}_SITE_URL`];
if (!siteUrlValue) throw new Error(`Reviewed ${environment} site URL is missing`);
const siteUrl = new URL(siteUrlValue);
if (siteUrl.pathname !== "/" || siteUrl.search !== "" || siteUrl.hash !== "") {
  throw new Error(`Reviewed ${environment} site URL must be an origin`);
}

const accessJwtFile = options.get("access-jwt-file");
if (!accessJwtFile) throw new Error("--access-jwt-file is required");
const tokenStats = await stat(accessJwtFile);
if ((tokenStats.mode & 0o077) !== 0) throw new Error("Access JWT file must have mode 600");
const accessJwt = (await readFile(accessJwtFile, "utf8")).trim();
if (!/^[A-Za-z0-9._-]+$/.test(accessJwt)) throw new Error("Access JWT is empty or malformed");

async function fetchJson(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  headers.set("Cookie", `CF_Authorization=${accessJwt}`);
  headers.set("Origin", siteUrl.origin);
  const response = await fetch(new URL(path, siteUrl), {
    ...init,
    headers,
    redirect: "manual",
    signal: AbortSignal.timeout(120_000),
  });
  const text = await response.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    // The status and a bounded response sample below identify Access HTML and edge failures.
  }
  if (!response.ok) {
    throw new Error(
      `${path} returned ${response.status}: ${JSON.stringify(body) ?? text.slice(0, 240)}`,
    );
  }
  if (body === null || typeof body !== "object") {
    throw new Error(`${path} did not return JSON`);
  }
  return body;
}

async function readHealth() {
  const health = await fetchJson("/api/health");
  if (
    health.status !== "ok" ||
    !RELEASE_SHA_PATTERN.test(health.releaseSha ?? "") ||
    !GENERATION_PATTERN.test(health.generation ?? "") ||
    !Number.isSafeInteger(health.directoryVersion) ||
    health.directoryVersion < 1
  ) {
    throw new Error("/api/health returned invalid release or directory metadata");
  }
  return health;
}

async function writeReceipt(path, receipt) {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  await writeFile(path, `${JSON.stringify(receipt, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
    flag: "wx",
  });
  await chmod(path, 0o600);
}

if (command === "restore") {
  const key = options.get("key");
  const generation = options.get("generation");
  if (!key || !generation) throw new Error("--key and --generation are required");
  if (!GENERATION_PATTERN.test(generation)) throw new Error("--generation is invalid");

  const before = await readHealth();
  if (generation === before.generation) {
    throw new Error("Restore target must be a new inactive generation");
  }
  const restored = await fetchJson("/admin/api/snapshots/restore", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, generation, activate: false }),
  });
  const data = restored.data;
  if (
    data?.generation !== generation ||
    data?.activated !== false ||
    data?.activation !== null ||
    data?.integrity?.matches !== true ||
    data?.integrity?.generation !== generation ||
    data?.state?.generation !== generation ||
    data?.state?.revision !== data?.integrity?.revision
  ) {
    throw new Error("Restore response did not prove inactive readback integrity");
  }

  const after = await readHealth();
  if (
    after.releaseSha !== before.releaseSha ||
    after.generation !== before.generation ||
    after.directoryVersion !== before.directoryVersion
  ) {
    throw new Error("Active generation changed while the inactive restore was running");
  }

  const receipt = {
    schemaVersion: 1,
    command: "restore-inactive",
    environment,
    siteOrigin: siteUrl.origin,
    sourceReleaseSha: before.releaseSha,
    snapshotKey: key,
    targetGeneration: generation,
    activeGeneration: before.generation,
    directoryVersion: before.directoryVersion,
    revision: data.integrity.revision,
    checksumSha256: data.integrity.checksum_sha256,
    counts: data.integrity.counts,
    verified: true,
    completedAt: new Date().toISOString(),
  };
  const outputPath =
    options.get("output") ?? `.cloudflare/restores/${environment}-${generation}.restore.json`;
  await writeReceipt(outputPath, receipt);
  console.log(`Verified inactive restore ${generation}; receipt written to ${outputPath}.`);
} else {
  const restoreRecordPath = options.get("restore-record");
  if (!restoreRecordPath) throw new Error("--restore-record is required");
  const restoreRecord = JSON.parse(await readFile(restoreRecordPath, "utf8"));
  const receiptTime = Date.parse(restoreRecord.completedAt);
  if (
    restoreRecord.schemaVersion !== 1 ||
    restoreRecord.command !== "restore-inactive" ||
    restoreRecord.environment !== environment ||
    restoreRecord.siteOrigin !== siteUrl.origin ||
    restoreRecord.verified !== true ||
    !RELEASE_SHA_PATTERN.test(restoreRecord.sourceReleaseSha ?? "") ||
    !GENERATION_PATTERN.test(restoreRecord.targetGeneration ?? "") ||
    !GENERATION_PATTERN.test(restoreRecord.activeGeneration ?? "") ||
    !Number.isSafeInteger(restoreRecord.directoryVersion) ||
    !Number.isFinite(receiptTime) ||
    Date.now() - receiptTime < 0 ||
    Date.now() - receiptTime > RECEIPT_MAX_AGE_MS
  ) {
    throw new Error("Restore receipt is invalid or older than 24 hours");
  }

  const before = await readHealth();
  if (
    before.releaseSha !== restoreRecord.sourceReleaseSha ||
    before.generation !== restoreRecord.activeGeneration ||
    before.directoryVersion !== restoreRecord.directoryVersion
  ) {
    throw new Error("Release or active generation changed after the verified restore");
  }
  const activated = await fetchJson("/admin/api/generations/activate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      generation: restoreRecord.targetGeneration,
      expectedGeneration: before.generation,
      expectedVersion: before.directoryVersion,
    }),
  });
  const activation = activated.data;
  const after = await readHealth();
  if (
    activation?.generation !== restoreRecord.targetGeneration ||
    activation?.previousGeneration !== before.generation ||
    after.releaseSha !== before.releaseSha ||
    after.generation !== restoreRecord.targetGeneration ||
    after.directoryVersion !== activation?.version
  ) {
    throw new Error("Activation response and authoritative health state do not match");
  }

  const receipt = {
    schemaVersion: 1,
    command: "activate-restored-generation",
    environment,
    siteOrigin: siteUrl.origin,
    sourceReleaseSha: before.releaseSha,
    restoreRecord: restoreRecordPath,
    previousGeneration: before.generation,
    targetGeneration: restoreRecord.targetGeneration,
    directoryVersion: after.directoryVersion,
    redirectQueued: activation.redirectQueued,
    pendingRedirects: activation.pendingRedirects,
    verified: true,
    completedAt: new Date().toISOString(),
  };
  const outputPath =
    options.get("output") ??
    `.cloudflare/restores/${environment}-${restoreRecord.targetGeneration}.activation.json`;
  await writeReceipt(outputPath, receipt);
  console.log(
    `Activated and verified ${restoreRecord.targetGeneration}; receipt written to ${outputPath}.`,
  );
}
