import "server-only";

import { cookies } from "next/headers";

import {
  createPublicClientId,
  isValidPublicClientId,
  PUBLIC_CLIENT_ID_COOKIE,
  PUBLIC_CLIENT_ID_MAX_AGE,
} from "@/lib/public-client";

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
  let clientId = cookieStore.get(PUBLIC_CLIENT_ID_COOKIE)?.value;

  if (!isValidPublicClientId(clientId)) {
    clientId = createPublicClientId();
    cookieStore.set(PUBLIC_CLIENT_ID_COOKIE, clientId, {
      httpOnly: true,
      maxAge: PUBLIC_CLIENT_ID_MAX_AGE,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  return sha256(`public-client:${getPublicActionSalt()}:${clientId}`);
}
