"use client";

import { STAMP_NAMES, type StampName } from "@/types/bingo/types";

const PUBLIC_CLIENT_ID_KEY = "nutfes-bingo:public-client-id:v1";
const PUBLIC_ACTION_TIMEOUT_MS = 8_000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let memoryClientId: string | null = null;

function isStampName(value: string): value is StampName {
  return (STAMP_NAMES as readonly string[]).includes(value);
}

function getPublicClientId() {
  try {
    const stored = window.localStorage.getItem(PUBLIC_CLIENT_ID_KEY);
    if (stored && UUID_PATTERN.test(stored)) {
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
  const result = (await response.json().catch(() => null)) as { data?: T; error?: unknown } | null;
  if (!response.ok) {
    throw new Error(typeof result?.error === "string" ? result.error : fallback);
  }
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
