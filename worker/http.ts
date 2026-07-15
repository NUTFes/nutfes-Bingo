import { DomainProblem } from "./domain";

const JSON_BODY_LIMIT = 64 * 1024;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function jsonResponse(
  value: unknown,
  init: ResponseInit = {},
  options: { cacheControl?: string; requestOrigin?: string | null } = {},
): Response {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", options.cacheControl ?? "no-store");
  applySecurityHeaders(headers);
  applyCorsHeaders(headers, options.requestOrigin ?? null);
  return Response.json(value, { ...init, headers });
}

export function errorResponse(error: unknown, requestOrigin: string | null = null): Response {
  const normalized = normalizeError(error);
  const headers = new Headers();
  if (normalized.retryAfterSeconds !== undefined) {
    headers.set("Retry-After", String(normalized.retryAfterSeconds));
  }
  return jsonResponse(
    { error: normalized.message },
    { status: normalized.status, headers },
    { requestOrigin },
  );
}

export function capacityResponse(message: string, retryAfterSeconds = 30): Response {
  return jsonResponse(
    { error: message },
    { status: 503, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}

export function normalizeError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof DomainProblem)
    return domainProblemToApiError(error.kind, cleanDomainMessage(error));

  const message = error instanceof Error ? error.message : "";
  const match = /^BINGO_(VALIDATION|CONFLICT|NOT_FOUND|CAPACITY):([\s\S]+)$/.exec(message);
  if (match) {
    const kind = match[1].toLowerCase() as "validation" | "conflict" | "not_found" | "capacity";
    return domainProblemToApiError(kind, match[2]);
  }

  return new ApiError(500, "サーバーで予期しないエラーが発生しました。");
}

export function applySecurityHeaders(headers: Headers): void {
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  headers.set(
    "Content-Security-Policy",
    "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; " +
      "form-action 'self'; img-src 'self' data: blob: https:; font-src 'self' data:; " +
      "style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' " +
      "https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; " +
      "connect-src 'self' ws: wss:",
  );
}

export function getSameOrigin(request: Request): string | null {
  const origin = request.headers.get("Origin");
  if (origin === null) return null;

  let parsedOrigin: URL;
  try {
    parsedOrigin = new URL(origin);
  } catch {
    throw new ApiError(403, "Origin が不正です。");
  }

  if (parsedOrigin.origin !== new URL(request.url).origin) {
    throw new ApiError(403, "クロスオリジンのリクエストは許可されていません。");
  }
  return parsedOrigin.origin;
}

export function assertSameOriginMutation(request: Request): string | null {
  const fetchSite = request.headers.get("Sec-Fetch-Site");
  if (fetchSite === "cross-site") {
    throw new ApiError(403, "クロスサイトのリクエストは許可されていません。");
  }
  return getSameOrigin(request);
}

export function assertWebSocketRequest(request: Request): string | null {
  if (request.method !== "GET" || request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
    throw new ApiError(426, "WebSocket Upgrade が必要です。");
  }
  return getSameOrigin(request);
}

export function preflightResponse(request: Request): Response {
  const origin = getSameOrigin(request);
  if (origin === null) throw new ApiError(403, "Origin ヘッダーが必要です。");
  const headers = new Headers({
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Cf-Access-Jwt-Assertion, X-Local-Admin-Email",
    "Access-Control-Max-Age": "600",
    "Cache-Control": "no-store",
  });
  applySecurityHeaders(headers);
  applyCorsHeaders(headers, origin);
  return new Response(null, { status: 204, headers });
}

export async function readJsonBody(request: Request, maxBytes = JSON_BODY_LIMIT): Promise<unknown> {
  const bytes = await readLimitedBody(request, maxBytes);
  if (bytes.byteLength === 0) throw new ApiError(400, "JSON body が必要です。");

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new ApiError(400, "JSON body の文字コードが不正です。");
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError(400, "JSON body が不正です。");
  }
}

export async function readMultipartForm(request: Request, maxBytes: number): Promise<FormData> {
  const contentType = request.headers.get("Content-Type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data;")) {
    throw new ApiError(415, "multipart/form-data が必要です。");
  }

  const bytes = await readLimitedBody(request, maxBytes);
  try {
    return await new Response(bytes, { headers: { "Content-Type": contentType } }).formData();
  } catch {
    throw new ApiError(400, "multipart/form-data が不正です。");
  }
}

export async function sha256Hex(value: string | Uint8Array): Promise<string> {
  const input =
    typeof value === "string" ? new TextEncoder().encode(value) : Uint8Array.from(value);
  const digest = await crypto.subtle.digest("SHA-256", input);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function makeStateEtag(generation: string, revision: number): string {
  return `"${generation}:${revision}"`;
}

export function ifNoneMatch(request: Request, etag: string): boolean {
  const value = request.headers.get("If-None-Match");
  if (value === null) return false;
  return value
    .split(",")
    .map((entry) => entry.trim())
    .some((entry) => entry === etag || entry === "*");
}

export function notModifiedResponse(etag: string): Response {
  const headers = new Headers({
    ETag: etag,
    "Cache-Control": "no-cache",
  });
  applySecurityHeaders(headers);
  return new Response(null, { status: 304, headers });
}

export function assertMethod(request: Request, allowed: readonly string[]): void {
  if (!allowed.includes(request.method)) {
    throw new ApiError(405, "許可されていないHTTPメソッドです。");
  }
}

function applyCorsHeaders(headers: Headers, origin: string | null): void {
  if (origin !== null) headers.set("Access-Control-Allow-Origin", origin);
  headers.append("Vary", "Origin");
}

async function readLimitedBody(
  request: Request,
  maxBytes: number,
): Promise<Uint8Array<ArrayBuffer>> {
  const contentLength = request.headers.get("Content-Length");
  if (contentLength !== null) {
    const parsed = Number(contentLength);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > maxBytes) {
      throw new ApiError(413, "リクエストbodyが大きすぎます。");
    }
  }

  if (request.body === null) return new Uint8Array();

  const reader = request.body.getReader();
  const chunks: Uint8Array<ArrayBufferLike>[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel("body limit exceeded");
        throw new ApiError(413, "リクエストbodyが大きすぎます。");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const result = new Uint8Array(new ArrayBuffer(total));
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

function cleanDomainMessage(error: DomainProblem): string {
  const prefix = `BINGO_${error.kind.toUpperCase()}:`;
  return error.message.startsWith(prefix) ? error.message.slice(prefix.length) : error.message;
}

function domainProblemToApiError(
  kind: "validation" | "conflict" | "not_found" | "capacity",
  message: string,
): ApiError {
  switch (kind) {
    case "validation":
      return new ApiError(400, message);
    case "conflict":
      return new ApiError(409, message);
    case "not_found":
      return new ApiError(404, message);
    case "capacity":
      return new ApiError(503, message, 30);
  }
}
