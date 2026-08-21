import {
  STAMP_NAMES,
  type AppStateRow,
  type NumberRow,
  type PrizeRow,
  type ReachLogRow,
  type StampName,
} from "../shared/bingo-transport";

export type {
  AppStateRow,
  NumberRow,
  PrizeRow,
  ReachLogRow,
  StampName,
} from "../shared/bingo-transport";

export type StoredPrizeRow = Omit<PrizeRow, "image_url">;
export type ReachSubmissionRow = {
  client_hash: string;
  created_at: string;
};

export type AuditLogRow = {
  id: number;
  revision: number;
  actor: string;
  action: string;
  payload_json: string;
  created_at: string;
};

export type StampTriggerRow = {
  id: number;
  name: StampName;
  created_at: string;
};
export type GameSnapshot = {
  schema_version: 1;
  source_generation: string;
  revision: number;
  created_at: string;
  numbers: NumberRow[];
  prizes: StoredPrizeRow[];
  app_state: AppStateRow;
  reach_logs: ReachLogRow[];
  reach_submissions: ReachSubmissionRow[];
  audit_log: AuditLogRow[];
};

export type SnapshotEnvelope = {
  format: "nutfes-bingo-game-snapshot";
  format_version: 1;
  checksum_sha256: string;
  snapshot: GameSnapshot;
};

export type SnapshotIntegrityCounts = {
  numbers: number;
  prizes: number;
  reach_logs: number;
  reach_submissions: number;
  audit_log: number;
  immutable_image_references: number;
  seed_image_references: number;
};

export type SnapshotIntegrity = {
  generation: string;
  revision: number;
  checksum_sha256: string;
  matches: boolean;
  counts: SnapshotIntegrityCounts;
  coverage: {
    verified: readonly string[];
    not_verified: readonly string[];
  };
};

export type DirectoryActivation = {
  generation: string;
  previousGeneration: string;
  version: number;
  redirectQueued: boolean;
  pendingRedirects: number;
};

export type StampSubmissionResult =
  | { accepted: true; stamp: StampTriggerRow; dailyCount: number }
  | {
      accepted: false;
      reason: "daily_limit" | "overloaded" | "rate_limited" | "sampled";
      retryAfterSeconds?: number;
    };

export const DEFAULT_GENERATION = "initial";
export const SNAPSHOT_FORMAT = "nutfes-bingo-game-snapshot";
const SNAPSHOT_SCHEMA_VERSION = 1;
export const PRIZE_SORT_ORDER_STEP = 1000;
export const MAX_PRIZES = 100;
export const MAX_REACH_LOGS = 2_000;
export const MAX_REACH_SUBMISSIONS = 2_000;
export const MAX_AUDIT_LOG_ROWS = 200;
export const MAX_AUDIT_PAYLOAD_BYTES = 4 * 1024;
export const MAX_PRIZE_IMAGE_BYTES = 2 * 1024 * 1024;
export const MAX_SNAPSHOT_BYTES = 2 * 1024 * 1024;

const MAX_SURVEY_URL_LENGTH = 2_048;

const GENERATION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const IMMUTABLE_IMAGE_PATTERN = /^prizes\/[a-f0-9]{64}\.(?:jpg|png|webp)$/;
const SEED_IMAGE_PATTERN = /^\/PrizeItem\/[^/\\%?#]{1,200}\.(?:jpe?g|png|webp)$/i;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class DomainProblem extends Error {
  constructor(
    readonly kind: "validation" | "conflict" | "not_found" | "capacity",
    message: string,
  ) {
    super(`BINGO_${kind.toUpperCase()}:${message}`);
    this.name = "DomainProblem";
  }
}

export function validationProblem(message: string): never {
  throw new DomainProblem("validation", message);
}

export function conflictProblem(message: string): never {
  throw new DomainProblem("conflict", message);
}

export function notFoundProblem(message: string): never {
  throw new DomainProblem("not_found", message);
}

export function capacityProblem(message: string): never {
  throw new DomainProblem("capacity", message);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isGeneration(value: unknown): value is string {
  return typeof value === "string" && GENERATION_PATTERN.test(value);
}

export function assertGeneration(value: unknown): asserts value is string {
  if (!isGeneration(value)) {
    validationProblem("generation が不正です。");
  }
}

export function isClientId(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function isStampName(value: unknown): value is StampName {
  return typeof value === "string" && (STAMP_NAMES as readonly string[]).includes(value);
}

function isPrizeImagePath(value: unknown): value is string | null {
  if (value === null) return true;
  if (typeof value !== "string" || value.includes("..")) return false;
  return (
    IMMUTABLE_IMAGE_PATTERN.test(value) ||
    (SEED_IMAGE_PATTERN.test(value) && !hasControlCharacters(value))
  );
}

export function isImmutablePrizeImagePath(value: string): boolean {
  return IMMUTABLE_IMAGE_PATTERN.test(value);
}

export function assertPrizeImagePath(value: unknown): asserts value is string | null {
  if (!isPrizeImagePath(value)) {
    validationProblem("景品画像パスが不正です。");
  }
}

export function normalizeHttpsUrl(value: unknown): string {
  if (typeof value !== "string") {
    validationProblem("アンケートURLの形式が不正です。");
  }

  const trimmed = value.trim();
  if (trimmed === "") return "";

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    validationProblem("アンケートURLの形式が不正です。");
  }

  if (parsed.protocol !== "https:" || parsed.username !== "" || parsed.password !== "") {
    validationProblem("アンケートURLは https:// から始まるURLを指定してください。");
  }

  const normalized = parsed.toString();
  if (normalized.length > MAX_SURVEY_URL_LENGTH) {
    validationProblem("アンケートURLが長すぎます。");
  }
  return normalized;
}

export function resolveImageUrl(path: string | null, mediaOrigin: string): string | null {
  if (path === null) return null;
  if (path.startsWith("/PrizeItem/")) return path;

  const origin = normalizeMediaOrigin(mediaOrigin);
  return origin === null ? `/api/prize-images/${path}` : `${origin}/${path}`;
}

function normalizeMediaOrigin(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:" || parsed.username !== "" || parsed.password !== "") {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

export function parsePositiveInteger(
  value: unknown,
  label: string,
  options: { min?: number; max?: number } = {},
): number {
  const min = options.min ?? 1;
  const max = options.max ?? Number.MAX_SAFE_INTEGER;
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    validationProblem(`${label}が不正です。`);
  }
  return value;
}

export function parseRequiredText(value: unknown, label: string, maxLength: number): string {
  if (typeof value !== "string" || value.trim() === "" || value.trim().length > maxLength) {
    validationProblem(`${label}が不正です。`);
  }
  return value.trim();
}

export function parseOptionalText(value: unknown, label: string, maxLength: number): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || value.trim().length > maxLength) {
    validationProblem(`${label}が不正です。`);
  }
  return value.trim() === "" ? null : value.trim();
}

export function parseSnapshot(value: unknown): GameSnapshot {
  if (!isRecord(value)) validationProblem("snapshot が不正です。");
  if (value.schema_version !== SNAPSHOT_SCHEMA_VERSION) {
    validationProblem("snapshot schema version が未対応です。");
  }
  assertGeneration(value.source_generation);
  const revision = parseNonNegativeInteger(value.revision, "revision");
  const createdAt = parseIsoDate(value.created_at, "created_at");

  if (!Array.isArray(value.numbers) || value.numbers.length > 99) {
    validationProblem("snapshot の numbers が不正です。");
  }
  const numbers = value.numbers.map(parseNumberRow);
  ensureUnique(
    numbers.map((row) => row.id),
    "numbers.id",
  );
  ensureUnique(
    numbers.map((row) => row.number),
    "numbers.number",
  );

  if (!Array.isArray(value.prizes) || value.prizes.length > MAX_PRIZES) {
    validationProblem("snapshot の prizes が不正です。");
  }
  const prizes = value.prizes.map(parseStoredPrizeRow);
  ensureUnique(
    prizes.map((row) => row.id),
    "prizes.id",
  );

  const appState = parseAppStateRow(value.app_state);

  if (!Array.isArray(value.reach_logs) || value.reach_logs.length > MAX_REACH_LOGS) {
    validationProblem("snapshot の reach_logs が不正です。");
  }
  const reachLogs = value.reach_logs.map(parseReachLogRow);
  ensureUnique(
    reachLogs.map((row) => row.id),
    "reach_logs.id",
  );

  if (
    !Array.isArray(value.reach_submissions) ||
    value.reach_submissions.length > MAX_REACH_SUBMISSIONS
  ) {
    validationProblem("snapshot の reach_submissions が不正です。");
  }
  const reachSubmissions = value.reach_submissions.map(parseReachSubmissionRow);
  ensureUnique(
    reachSubmissions.map((row) => row.client_hash),
    "reach_submissions.client_hash",
  );

  if (!Array.isArray(value.audit_log) || value.audit_log.length > MAX_AUDIT_LOG_ROWS) {
    validationProblem("snapshot の audit_log が不正です。");
  }
  const auditLog = value.audit_log.map(parseAuditLogRow);
  ensureUnique(
    auditLog.map((row) => row.id),
    "audit_log.id",
  );

  return {
    schema_version: 1,
    source_generation: value.source_generation,
    revision,
    created_at: createdAt,
    numbers,
    prizes,
    app_state: appState,
    reach_logs: reachLogs,
    reach_submissions: reachSubmissions,
    audit_log: auditLog,
  };
}

export function parseSnapshotEnvelope(value: unknown): SnapshotEnvelope {
  if (!isRecord(value)) validationProblem("snapshot envelope が不正です。");
  if (value.format !== SNAPSHOT_FORMAT || value.format_version !== 1) {
    validationProblem("snapshot format が未対応です。");
  }
  if (typeof value.checksum_sha256 !== "string" || !SHA256_PATTERN.test(value.checksum_sha256)) {
    validationProblem("snapshot checksum が不正です。");
  }
  return {
    format: SNAPSHOT_FORMAT,
    format_version: 1,
    checksum_sha256: value.checksum_sha256,
    snapshot: parseSnapshot(value.snapshot),
  };
}

export function canonicalLogicalSnapshotJson(snapshotInput: GameSnapshot): string {
  const snapshot = parseSnapshot(snapshotInput);
  return JSON.stringify({
    schema_version: snapshot.schema_version,
    revision: snapshot.revision,
    numbers: [...snapshot.numbers].sort((left, right) => left.id - right.id),
    prizes: [...snapshot.prizes].sort((left, right) => left.id - right.id),
    app_state: snapshot.app_state,
    reach_logs: [...snapshot.reach_logs].sort((left, right) => left.id - right.id),
    reach_submissions: [...snapshot.reach_submissions].sort((left, right) =>
      left.client_hash.localeCompare(right.client_hash),
    ),
    audit_log: [...snapshot.audit_log].sort((left, right) => left.id - right.id),
  });
}

export function snapshotIntegrityCounts(snapshot: GameSnapshot): SnapshotIntegrityCounts {
  return {
    numbers: snapshot.numbers.length,
    prizes: snapshot.prizes.length,
    reach_logs: snapshot.reach_logs.length,
    reach_submissions: snapshot.reach_submissions.length,
    audit_log: snapshot.audit_log.length,
    immutable_image_references: snapshot.prizes.filter(
      (prize) => prize.image_path !== null && isImmutablePrizeImagePath(prize.image_path),
    ).length,
    seed_image_references: snapshot.prizes.filter((prize) =>
      prize.image_path?.startsWith("/PrizeItem/"),
    ).length,
  };
}

function parseNumberRow(value: unknown): NumberRow {
  if (!isRecord(value)) validationProblem("number row が不正です。");
  return {
    id: parsePositiveInteger(value.id, "number id"),
    number: parsePositiveInteger(value.number, "number", { max: 99 }),
    created_at: parseIsoDate(value.created_at, "number.created_at"),
    updated_at: parseIsoDate(value.updated_at, "number.updated_at"),
  };
}

function parseStoredPrizeRow(value: unknown): StoredPrizeRow {
  if (!isRecord(value)) validationProblem("prize row が不正です。");
  const imagePath = value.image_path;
  assertPrizeImagePath(imagePath);
  if (typeof value.is_won !== "boolean") validationProblem("prize.is_won が不正です。");
  return {
    id: parsePositiveInteger(value.id, "prize id"),
    name_jp: parseRequiredText(value.name_jp, "景品名", 120),
    name_en: parseOptionalText(value.name_en, "英語景品名", 160),
    image_path: imagePath,
    is_won: value.is_won,
    sort_order: parseNonNegativeInteger(value.sort_order, "prize.sort_order"),
    created_at: parseIsoDate(value.created_at, "prize.created_at"),
    updated_at: parseIsoDate(value.updated_at, "prize.updated_at"),
  };
}

function parseAppStateRow(value: unknown): AppStateRow {
  if (!isRecord(value)) validationProblem("app_state が不正です。");
  if (value.id !== 1 || typeof value.is_survey_active !== "boolean") {
    validationProblem("app_state が不正です。");
  }
  const surveyUrl = normalizeHttpsUrl(value.survey_url);
  if (value.is_survey_active && surveyUrl === "") {
    validationProblem("アンケート公開中はURLが必要です。");
  }
  return {
    id: 1,
    survey_url: surveyUrl,
    is_survey_active: value.is_survey_active,
    reach_count: parseNonNegativeInteger(value.reach_count, "reach_count"),
    updated_at: parseIsoDate(value.updated_at, "app_state.updated_at"),
  };
}

function parseReachLogRow(value: unknown): ReachLogRow {
  if (!isRecord(value)) validationProblem("reach_log row が不正です。");
  if (value.delta !== -1 && value.delta !== 0 && value.delta !== 1) {
    validationProblem("reach_log.delta が不正です。");
  }
  return {
    id: parsePositiveInteger(value.id, "reach_log id"),
    delta: value.delta,
    reach_num: parseNonNegativeInteger(value.reach_num, "reach_log.reach_num"),
    source: parseRequiredText(value.source, "reach_log.source", 32),
    created_at: parseIsoDate(value.created_at, "reach_log.created_at"),
  };
}

function parseReachSubmissionRow(value: unknown): ReachSubmissionRow {
  if (!isRecord(value)) validationProblem("reach_submission row が不正です。");
  if (typeof value.client_hash !== "string" || !SHA256_PATTERN.test(value.client_hash)) {
    validationProblem("reach_submission.client_hash が不正です。");
  }
  return {
    client_hash: value.client_hash,
    created_at: parseIsoDate(value.created_at, "reach_submission.created_at"),
  };
}

function parseAuditLogRow(value: unknown): AuditLogRow {
  if (!isRecord(value)) validationProblem("audit row が不正です。");
  const payloadJson = parseRequiredText(
    value.payload_json,
    "audit.payload_json",
    MAX_AUDIT_PAYLOAD_BYTES,
  );
  if (new TextEncoder().encode(payloadJson).byteLength > MAX_AUDIT_PAYLOAD_BYTES) {
    validationProblem("audit.payload_json が大きすぎます。");
  }
  try {
    JSON.parse(payloadJson);
  } catch {
    validationProblem("audit.payload_json が不正です。");
  }
  return {
    id: parsePositiveInteger(value.id, "audit id"),
    revision: parseNonNegativeInteger(value.revision, "audit.revision"),
    actor: parseRequiredText(value.actor, "audit.actor", 320),
    action: parseRequiredText(value.action, "audit.action", 80),
    payload_json: payloadJson,
    created_at: parseIsoDate(value.created_at, "audit.created_at"),
  };
}

function parseNonNegativeInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    validationProblem(`${label} が不正です。`);
  }
  return value;
}

function parseIsoDate(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length > 32 || !Number.isFinite(Date.parse(value))) {
    validationProblem(`${label} が不正です。`);
  }
  return value;
}

function ensureUnique(values: Array<string | number>, label: string): void {
  if (new Set(values).size !== values.length) {
    validationProblem(`${label} が重複しています。`);
  }
}

function hasControlCharacters(value: string): boolean {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  });
}
