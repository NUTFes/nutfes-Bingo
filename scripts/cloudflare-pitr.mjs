#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { chmod, mkdir, open, readFile, stat } from "node:fs/promises";
import { dirname } from "node:path";
import process from "node:process";

const BOOKMARK_PATTERN = /^[A-Za-z0-9-]{16,256}$/;
const EVENT_ID_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/;
const RELEASE_SHA_PATTERN = /^[a-f0-9]{40}$/;
const PLAN_MAX_AGE_MS = 15 * 60 * 1_000;
const usage = `Usage:
  mise run recover -- prepare --target-time <ISO-8601> --access-jwt-file <mode-600-file> [--output <plan.json>]
  CONFIRM_PITR=<target-bookmark> mise run recover -- restore --plan <plan.json> --access-jwt-file <mode-600-file> [--output <receipt.json>]
  CONFIRM_PITR_UNDO=<undo-bookmark> mise run recover -- undo --receipt <receipt.json> --access-jwt-file <mode-600-file> [--output <undo-receipt.json>]`;

const [command, ...rawOptions] = process.argv.slice(2);
if (command === "--help" || command === "help") {
  console.log(usage);
  process.exit(0);
}
if (!new Set(["prepare", "restore", "undo"]).has(command)) throw new Error(usage);

const options = new Map();
for (let index = 0; index < rawOptions.length; index += 2) {
  const option = rawOptions[index];
  const value = rawOptions[index + 1];
  if (!option?.startsWith("--") || value === undefined) throw new Error(usage);
  const name = option.slice(2);
  if (options.has(name)) throw new Error(`Duplicate option: ${option}`);
  options.set(name, value);
}
const allowed =
  command === "prepare"
    ? new Set(["target-time", "access-jwt-file", "output"])
    : command === "restore"
      ? new Set(["plan", "access-jwt-file", "output"])
      : new Set(["receipt", "access-jwt-file", "output"]);
for (const name of options.keys()) {
  if (!allowed.has(name)) throw new Error(`Unknown ${command} option: --${name}`);
}

process.loadEnvFile("./cloudflare.project.env");
const siteValue = process.env.CLOUDFLARE_PRODUCTION_SITE_URL;
if (!siteValue) throw new Error("CLOUDFLARE_PRODUCTION_SITE_URL is missing");
const site = new URL(siteValue);
if (site.protocol !== "https:" || site.pathname !== "/" || site.search !== "" || site.hash !== "") {
  throw new Error("CLOUDFLARE_PRODUCTION_SITE_URL must be an HTTPS origin");
}
const releaseSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
if (!RELEASE_SHA_PATTERN.test(releaseSha)) throw new Error("Git HEAD is not a full SHA");

const accessJwtFile = options.get("access-jwt-file");
if (!accessJwtFile) throw new Error("--access-jwt-file is required");
await assertPrivateFile(accessJwtFile, "Access JWT");
const accessJwt = (await readFile(accessJwtFile, "utf8")).trim();
if (!/^[A-Za-z0-9._-]+$/.test(accessJwt)) throw new Error("Access JWT is empty or malformed");

const request = async (path, init = {}) => {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  headers.set("Cookie", `CF_Authorization=${accessJwt}`);
  headers.set("Origin", site.origin);
  const response = await fetch(new URL(path, site), {
    ...init,
    headers,
    redirect: "manual",
    signal: AbortSignal.timeout(30_000),
  });
  const text = await response.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    // The bounded text sample below identifies Access HTML and edge errors.
  }
  if (!response.ok || body === null || typeof body !== "object") {
    throw new Error(
      `${path} returned ${response.status}: ${JSON.stringify(body) ?? text.slice(0, 240)}`,
    );
  }
  return body;
};

const readHealth = async () => {
  const health = await request("/api/ready");
  if (
    health.status !== "ok" ||
    health.releaseSha !== releaseSha ||
    !EVENT_ID_PATTERN.test(health.eventId ?? "") ||
    !Number.isSafeInteger(health.revision) ||
    typeof health.recoveryPending !== "boolean"
  ) {
    throw new Error("Production readiness does not match this Git HEAD and singleton GameState");
  }
  return health;
};

const readRecoveryStatus = async (health) => {
  const status = (await request("/admin/api/recovery")).data;
  if (
    !EVENT_ID_PATTERN.test(status?.eventId ?? "") ||
    status.eventId !== health.eventId ||
    status.revision !== health.revision ||
    !BOOKMARK_PATTERN.test(status?.currentBookmark ?? "") ||
    typeof status?.pitrEarliestAt !== "string" ||
    !Number.isFinite(Date.parse(status.pitrEarliestAt)) ||
    status?.recoveryPending !== health.recoveryPending ||
    (status.recoveryPending &&
      (!BOOKMARK_PATTERN.test(status.pendingTargetBookmark ?? "") ||
        !BOOKMARK_PATTERN.test(status.pendingUndoBookmark ?? "")))
  ) {
    throw new Error("Recovery status does not match public readiness");
  }
  return status;
};

if (command === "prepare") {
  const targetTime = options.get("target-time");
  if (!targetTime) throw new Error("--target-time is required");
  const health = await readHealth();
  if (health.recoveryPending) throw new Error("A PITR recovery is already pending");
  const status = await readRecoveryStatus(health);
  const prepared = (
    await request("/admin/api/recovery/prepare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetTime, expectedRevision: status.revision }),
    })
  ).data;
  if (
    prepared?.eventId !== status.eventId ||
    prepared?.revision !== status.revision ||
    !BOOKMARK_PATTERN.test(prepared?.targetBookmark ?? "") ||
    prepared?.currentBookmark !== status.currentBookmark ||
    prepared?.pitrEarliestAt !== status.pitrEarliestAt
  ) {
    throw new Error("PITR preparation returned inconsistent bookmarks");
  }

  const plan = {
    schemaVersion: 1,
    command: "pitr-plan",
    siteOrigin: site.origin,
    releaseSha,
    eventId: prepared.eventId,
    revision: prepared.revision,
    targetTime: prepared.targetTime,
    targetBookmark: prepared.targetBookmark,
    currentBookmark: prepared.currentBookmark,
    pitrEarliestAt: prepared.pitrEarliestAt,
    preparedAt: new Date().toISOString(),
  };
  const output =
    options.get("output") ?? `.cloudflare/recovery/pitr-${Date.now().toString(36)}.plan.json`;
  await createPrivateJson(output, plan);
  console.log(`PITR plan written to ${output}. Review it before restore.`);
  process.exit(0);
}

if (command === "restore") {
  const planPath = options.get("plan");
  if (!planPath) throw new Error("--plan is required");
  const plan = await readPrivateJson(planPath, "PITR plan");
  const planAge = Date.now() - Date.parse(plan.preparedAt);
  if (
    plan.schemaVersion !== 1 ||
    plan.command !== "pitr-plan" ||
    plan.siteOrigin !== site.origin ||
    plan.releaseSha !== releaseSha ||
    !EVENT_ID_PATTERN.test(plan.eventId ?? "") ||
    !Number.isSafeInteger(plan.revision) ||
    !BOOKMARK_PATTERN.test(plan.targetBookmark ?? "") ||
    !BOOKMARK_PATTERN.test(plan.currentBookmark ?? "") ||
    !Number.isFinite(planAge) ||
    planAge < 0 ||
    planAge > PLAN_MAX_AGE_MS
  ) {
    throw new Error("PITR plan is invalid or older than 15 minutes");
  }
  if (process.env.CONFIRM_PITR !== plan.targetBookmark) {
    throw new Error(`Set CONFIRM_PITR=${plan.targetBookmark} after two-person review`);
  }
  const output =
    options.get("output") ?? `.cloudflare/recovery/pitr-${Date.now().toString(36)}.receipt.json`;
  await scheduleAndRestart({
    output,
    targetBookmark: plan.targetBookmark,
    expectedCurrentBookmark: plan.currentBookmark,
    expectedRevision: plan.revision,
    expectedEventId: plan.eventId,
    receipt: {
      schemaVersion: 1,
      command: "pitr-restore",
      siteOrigin: site.origin,
      releaseSha,
      sourcePlan: planPath,
      targetBookmark: plan.targetBookmark,
    },
  });
  process.exit(0);
}

const sourceReceiptPath = options.get("receipt");
if (!sourceReceiptPath) throw new Error("--receipt is required");
const sourceReceipt = await readPrivateJson(sourceReceiptPath, "PITR receipt");
if (
  sourceReceipt.schemaVersion !== 1 ||
  !new Set(["pitr-restore", "pitr-undo"]).has(sourceReceipt.command) ||
  sourceReceipt.siteOrigin !== site.origin ||
  sourceReceipt.releaseSha !== releaseSha ||
  !BOOKMARK_PATTERN.test(sourceReceipt.undoBookmark ?? "")
) {
  throw new Error("PITR receipt is invalid or belongs to another release");
}
if (process.env.CONFIRM_PITR_UNDO !== sourceReceipt.undoBookmark) {
  throw new Error(`Set CONFIRM_PITR_UNDO=${sourceReceipt.undoBookmark} after two-person review`);
}
const health = await readHealth();
const status = await readRecoveryStatus(health);
const output =
  options.get("output") ?? `.cloudflare/recovery/pitr-undo-${Date.now().toString(36)}.receipt.json`;
await scheduleAndRestart({
  output,
  targetBookmark: sourceReceipt.undoBookmark,
  expectedCurrentBookmark: status.currentBookmark,
  expectedRevision: status.revision,
  expectedEventId: status.eventId,
  receipt: {
    schemaVersion: 1,
    command: "pitr-undo",
    siteOrigin: site.origin,
    releaseSha,
    sourceReceipt: sourceReceiptPath,
    targetBookmark: sourceReceipt.undoBookmark,
  },
});

async function scheduleAndRestart(input) {
  const reserved = await reservePrivateFile(input.output);
  let health = await readHealth();
  let status = await readRecoveryStatus(health);
  let scheduled;

  if (status.recoveryPending) {
    if (status.pendingTargetBookmark !== input.targetBookmark) {
      await reserved.close();
      throw new Error("Another PITR recovery is pending; the reserved receipt was left empty");
    }
    scheduled = {
      eventId: status.eventId,
      revision: status.revision,
      targetBookmark: status.pendingTargetBookmark,
      undoBookmark: status.pendingUndoBookmark,
    };
  } else {
    if (
      status.eventId !== input.expectedEventId ||
      status.revision !== input.expectedRevision ||
      status.currentBookmark !== input.expectedCurrentBookmark
    ) {
      await reserved.close();
      throw new Error(
        "GameState changed after PITR confirmation; the reserved receipt was left empty",
      );
    }
    try {
      scheduled = (
        await request("/admin/api/recovery/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetBookmark: input.targetBookmark,
            currentBookmark: input.expectedCurrentBookmark,
            expectedRevision: input.expectedRevision,
          }),
        })
      ).data;
    } catch (error) {
      health = await readHealth();
      status = await readRecoveryStatus(health);
      if (
        !status.recoveryPending ||
        status.pendingTargetBookmark !== input.targetBookmark ||
        !BOOKMARK_PATTERN.test(status.pendingUndoBookmark ?? "")
      ) {
        await reserved.close();
        throw error;
      }
      scheduled = {
        eventId: status.eventId,
        revision: status.revision,
        targetBookmark: status.pendingTargetBookmark,
        undoBookmark: status.pendingUndoBookmark,
      };
    }
  }

  if (
    scheduled?.eventId !== input.expectedEventId ||
    scheduled?.targetBookmark !== input.targetBookmark ||
    !BOOKMARK_PATTERN.test(scheduled?.undoBookmark ?? "")
  ) {
    await reserved.close();
    throw new Error("PITR scheduling did not return a usable undo bookmark");
  }

  const receipt = {
    ...input.receipt,
    eventId: scheduled.eventId,
    revision: scheduled.revision,
    undoBookmark: scheduled.undoBookmark,
    scheduledAt: new Date().toISOString(),
  };
  await writeReservedJson(reserved, receipt);
  console.log(`Undo bookmark saved in ${input.output}; restarting GameState.`);

  try {
    await request("/admin/api/recovery/restart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetBookmark: input.targetBookmark }),
    });
  } catch (error) {
    console.log(
      `Restart request disconnected as expected: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const deadline = Date.now() + 60_000;
  let restored = null;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    try {
      const candidate = await readHealth();
      if (!candidate.recoveryPending) {
        restored = candidate;
        break;
      }
    } catch {
      // The Durable Object and its WebSockets are restarting.
    }
  }
  if (restored === null) {
    throw new Error(`GameState did not become ready after PITR. Keep receipt ${input.output}`);
  }
  await rewritePrivateJson(input.output, {
    ...receipt,
    completedAt: new Date().toISOString(),
    restoredEventId: restored.eventId,
    restoredRevision: restored.revision,
  });
  console.log(
    `PITR completed at event ${restored.eventId}, revision ${restored.revision}. Keep ${input.output} for undo.`,
  );
}

async function assertPrivateFile(path, label) {
  const fileStats = await stat(path);
  if (!fileStats.isFile() || (fileStats.mode & 0o077) !== 0) {
    throw new Error(`${label} must be a regular file with mode 600`);
  }
}

async function readPrivateJson(path, label) {
  await assertPrivateFile(path, label);
  return JSON.parse(await readFile(path, "utf8"));
}

async function reservePrivateFile(path) {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const handle = await open(path, "wx", 0o600);
  await chmod(path, 0o600);
  return handle;
}

async function writeReservedJson(handle, value) {
  await handle.truncate(0);
  await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, "utf8");
  await handle.sync();
  await handle.close();
}

async function createPrivateJson(path, value) {
  const handle = await reservePrivateFile(path);
  await writeReservedJson(handle, value);
}

async function rewritePrivateJson(path, value) {
  const handle = await open(path, "r+", 0o600);
  await writeReservedJson(handle, value);
  await chmod(path, 0o600);
}
