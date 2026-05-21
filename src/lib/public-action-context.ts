import "server-only";

import { cookies } from "next/headers";

import { isValidPublicClientId, PUBLIC_CLIENT_ID_COOKIE } from "@/lib/public-client";

export class PublicActionError extends Error {
  constructor(
    message: string,
    readonly code: "PUBLIC_CLIENT_REQUIRED" | "PUBLIC_ACTION_RATE_LIMITED",
  ) {
    super(message);
    this.name = "PublicActionError";
  }
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function getPublicActionSalt() {
  return (
    process.env.NUTFES_PUBLIC_ACTION_HASH_SALT ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "nutfes-bingo-dev-public-action-salt"
  );
}

export async function getPublicActionClientHash() {
  const cookieStore = await cookies();
  const clientId = cookieStore.get(PUBLIC_CLIENT_ID_COOKIE)?.value;

  if (!isValidPublicClientId(clientId)) {
    throw new PublicActionError(
      "ページを再読み込みしてからもう一度お試しください。",
      "PUBLIC_CLIENT_REQUIRED",
    );
  }

  return sha256(`public-client:${getPublicActionSalt()}:${clientId}`);
}
