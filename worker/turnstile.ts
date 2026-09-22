import { ApiError } from "./http";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const SITEVERIFY_TIMEOUT_MS = 3_000;
const MAX_SITEVERIFY_RESPONSE_BYTES = 16 * 1024;
const MAX_TURNSTILE_TOKEN_LENGTH = 2_048;
const TURNSTILE_ALWAYS_PASS_TEST_SECRET = "1x0000000000000000000000000000000AA";

export const TURNSTILE_ACTION = "turnstile-spin-v1";

type SiteverifyResponse = {
  success?: unknown;
  action?: unknown;
  hostname?: unknown;
  "error-codes"?: unknown;
};

export function parseTurnstileToken(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAX_TURNSTILE_TOKEN_LENGTH ||
    value.trim() !== value ||
    hasControlCharacters(value)
  ) {
    throw new ApiError(400, "本人確認tokenが不正です。");
  }
  return value;
}

export async function verifyTurnstileToken(
  request: Request,
  env: Pick<Env, "LOCAL_TURNSTILE_TEST_MODE" | "TURNSTILE_HOSTNAME" | "TURNSTILE_SECRET_KEY">,
  token: string,
): Promise<void> {
  const secret = env.TURNSTILE_SECRET_KEY?.trim();
  if (secret === undefined || secret === "" || secret.length > 1_024) {
    throw new ApiError(503, "本人確認サービスの設定が完了していません。");
  }
  const expectedHostname = parseExpectedHostname(env.TURNSTILE_HOSTNAME);
  if (new URL(request.url).hostname.toLowerCase() !== expectedHostname) {
    throw new ApiError(403, "本人確認に失敗しました。もう一度お試しください。");
  }

  const payload: Record<string, string> = {
    secret,
    response: token,
    idempotency_key: crypto.randomUUID(),
  };
  const remoteIp = trustedConnectingIp(request);
  if (remoteIp !== null) payload.remoteip = remoteIp;

  let response: Response;
  try {
    response = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      // Workers does not implement redirect: "error". Manual mode preserves the
      // security property we need here: never forward the secret to a redirect.
      redirect: "manual",
      signal: AbortSignal.timeout(SITEVERIFY_TIMEOUT_MS),
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "turnstile siteverify request failed",
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    throw new ApiError(503, "本人確認サービスに接続できません。もう一度お試しください。");
  }

  let text: string;
  try {
    text = await response.text();
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "turnstile siteverify response read failed",
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    throw new ApiError(503, "本人確認サービスに接続できません。もう一度お試しください。");
  }
  if (!response.ok || text.length > MAX_SITEVERIFY_RESPONSE_BYTES) {
    console.error(
      JSON.stringify({
        message: "turnstile siteverify returned an upstream error",
        status: response.status,
        oversized: text.length > MAX_SITEVERIFY_RESPONSE_BYTES,
      }),
    );
    throw new ApiError(503, "本人確認サービスに接続できません。もう一度お試しください。");
  }

  let result: SiteverifyResponse;
  try {
    const parsed = JSON.parse(text) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error();
    result = parsed as SiteverifyResponse;
  } catch {
    throw new ApiError(503, "本人確認サービスから不正な応答を受信しました。");
  }

  const action = typeof result.action === "string" ? result.action : "";
  const hostname = typeof result.hostname === "string" ? result.hostname.toLowerCase() : "";
  if (isLocalTestResponse(request, env, secret, result)) return;
  if (result.success !== true || action !== TURNSTILE_ACTION || hostname !== expectedHostname) {
    console.warn(
      JSON.stringify({
        message: "turnstile challenge rejected",
        success: result.success === true,
        actionMatches: action === TURNSTILE_ACTION,
        hostnameMatches: hostname === expectedHostname,
        errorCodes: readErrorCodes(result["error-codes"]),
      }),
    );
    throw new ApiError(403, "本人確認に失敗しました。もう一度お試しください。");
  }
}

function isLocalTestResponse(
  request: Request,
  env: Pick<Env, "LOCAL_TURNSTILE_TEST_MODE">,
  secret: string,
  result: SiteverifyResponse,
): boolean {
  if (
    env.LOCAL_TURNSTILE_TEST_MODE !== "true" ||
    secret !== TURNSTILE_ALWAYS_PASS_TEST_SECRET ||
    result.success !== true
  ) {
    return false;
  }
  const hostname = new URL(request.url).hostname.toLowerCase();
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

function parseExpectedHostname(value: string): string {
  const hostname = value.trim().toLowerCase();
  if (
    hostname === "" ||
    hostname.length > 253 ||
    !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(
      hostname,
    )
  ) {
    throw new ApiError(503, "本人確認サービスのhostname設定が不正です。");
  }
  return hostname;
}

function trustedConnectingIp(request: Request): string | null {
  const value = request.headers.get("CF-Connecting-IP");
  if (
    value === null ||
    value.length < 2 ||
    value.length > 45 ||
    !/^[0-9a-f:.]+$/i.test(value) ||
    (!value.includes(".") && !value.includes(":"))
  ) {
    return null;
  }
  return value;
}

function readErrorCodes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .slice(0, 8)
    .map((entry) => entry.slice(0, 80));
}

function hasControlCharacters(value: string): boolean {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  });
}
