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

export type StampTriggerRow = {
  id: number;
  name: StampName;
  created_at: string;
};

export type StampSubmissionResult =
  | { accepted: true; stamp: StampTriggerRow; dailyCount: number }
  | {
      accepted: false;
      reason: "daily_limit" | "overloaded" | "rate_limited" | "sampled";
      retryAfterSeconds?: number;
    };

export const PRIZE_SORT_ORDER_STEP = 1000;
export const MAX_PRIZES = 100;
export const MAX_REACH_LOGS = 2_000;
export const MAX_REACH_SUBMISSIONS = 2_000;
export const MAX_AUDIT_LOG_ROWS = 200;
export const MAX_AUDIT_PAYLOAD_BYTES = 4 * 1024;
export const MAX_PRIZE_IMAGE_BYTES = 2 * 1024 * 1024;

const MAX_SURVEY_URL_LENGTH = 2_048;

const IMMUTABLE_IMAGE_PATTERN = /^prizes\/[a-f0-9]{64}\.(?:jpg|png|webp)$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EVENT_ID_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/;

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

export function isClientId(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function isStampName(value: unknown): value is StampName {
  return typeof value === "string" && (STAMP_NAMES as readonly string[]).includes(value);
}

function isPrizeImagePath(value: unknown): value is string | null {
  if (value === null) return true;
  return typeof value === "string" && IMMUTABLE_IMAGE_PATTERN.test(value);
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

export function parseEventId(value: unknown): string {
  const eventId = parseRequiredText(value, "イベントID", 64).toLowerCase();
  if (!EVENT_ID_PATTERN.test(eventId)) {
    validationProblem(
      "イベントIDは英小文字、数字、ピリオド、ハイフン、アンダースコアで指定してください。",
    );
  }
  return eventId;
}
