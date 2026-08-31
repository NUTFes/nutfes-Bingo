import { isClientId, isStampName, type StampName } from "@shared/bingo-transport";

const PUBLIC_CLIENT_ID_KEY = "nutfes-bingo:public-client-id:v1";
const PUBLIC_ACTION_TIMEOUT_MS = 8_000;

let memoryClientId: string | null = null;

function getPublicClientId() {
  try {
    const stored = window.localStorage.getItem(PUBLIC_CLIENT_ID_KEY);
    if (isClientId(stored)) {
      return stored;
    }
  } catch {
    // Some privacy modes disable localStorage. A page-lifetime ID still keeps retries idempotent.
  }

  const clientId = memoryClientId ?? crypto.randomUUID();
  memoryClientId = clientId;
  try {
    window.localStorage.setItem(PUBLIC_CLIENT_ID_KEY, clientId);
  } catch {
    // Continue with the in-memory ID when persistence is unavailable.
  }
  return clientId;
}

async function postPublicAction<T>(url: string, body: Record<string, unknown>, fallback: string) {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(PUBLIC_ACTION_TIMEOUT_MS),
    });
  } catch {
    throw new Error(fallback);
  }
  if (!response.ok) {
    const errorResult = (await response.json().catch(() => null)) as { error?: unknown } | null;
    throw new Error(typeof errorResult?.error === "string" ? errorResult.error : fallback);
  }
  const result = (await response.json().catch(() => null)) as { data?: T } | null;
  return result?.data as T;
}

export async function sendReactionStamp(name: StampName) {
  if (!isStampName(name)) {
    throw new Error("リアクションの種類が不正です。");
  }

  return postPublicAction(
    "/api/bingo/stamps",
    { clientId: getPublicClientId(), stampName: name },
    "リアクション送信に失敗しました。",
  );
}

export async function recordPublicReach(turnstileToken: string) {
  if (
    turnstileToken.length === 0 ||
    turnstileToken.length > 2_048 ||
    turnstileToken.trim() !== turnstileToken
  ) {
    throw new Error("本人確認tokenが不正です。");
  }
  return postPublicAction(
    "/api/bingo/reach",
    { clientId: getPublicClientId(), turnstileToken },
    "リーチ送信に失敗しました。",
  );
}
