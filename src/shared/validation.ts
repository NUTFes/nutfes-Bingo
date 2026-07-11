const HTTPS_URL = /^https:\/\//i;

export class ValidationError extends Error {
  readonly status = 400;
}

export function requireBingoNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 99) {
    throw new ValidationError("Number must be an integer from 1 to 99");
  }
  return value;
}

export function requirePositiveId(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new ValidationError("ID must be a positive integer");
  }
  return value;
}

export function requireSurveyUrl(value: unknown, active: boolean): string {
  if (typeof value !== "string") {
    throw new ValidationError("Survey URL must be a string");
  }
  const normalized = value.trim();
  if (!active && normalized === "") return "";
  if (!HTTPS_URL.test(normalized)) {
    throw new ValidationError("Survey URL must use HTTPS");
  }
  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== "https:") throw new Error("protocol");
    return parsed.toString();
  } catch {
    throw new ValidationError("Survey URL must be a valid HTTPS URL");
  }
}

export function requirePrizeName(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0 || value.trim().length > 120) {
    throw new ValidationError(`${label} must contain 1 to 120 characters`);
  }
  return value.trim();
}
