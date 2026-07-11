import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

const CLIENT_COOKIE = "bingo_client";
const CLIENT_COOKIE_MAX_AGE = 60 * 60 * 24 * 400;
const accessKeySets = new Map<string, JWTVerifyGetKey>();

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function decodeBase64Url(value: string): Uint8Array | null {
  try {
    const padded = value
      .replaceAll("-", "+")
      .replaceAll("_", "/")
      .padEnd(Math.ceil(value.length / 4) * 4, "=");
    return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  if (secret.length < 32)
    throw new Error("COOKIE_SIGNING_SECRET must contain at least 32 characters");
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function createClientCookie(
  secret: string,
): Promise<{ cookie: string; clientHash: string }> {
  const clientId = base64Url(crypto.getRandomValues(new Uint8Array(32)));
  const key = await hmacKey(secret);
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(clientId)),
  );
  const signed = `${clientId}.${base64Url(signature)}`;
  return {
    cookie: `${CLIENT_COOKIE}=${signed}; Path=/; Max-Age=${CLIENT_COOKIE_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`,
    clientHash: await hashClientId(clientId),
  };
}

export async function readClientHash(request: Request, secret: string): Promise<string | null> {
  const rawCookie = request.headers
    .get("Cookie")
    ?.split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${CLIENT_COOKIE}=`))
    ?.slice(CLIENT_COOKIE.length + 1);
  if (!rawCookie) return null;
  const separator = rawCookie.lastIndexOf(".");
  if (separator <= 0) return null;
  const clientId = rawCookie.slice(0, separator);
  const signature = decodeBase64Url(rawCookie.slice(separator + 1));
  if (!signature || !/^[A-Za-z0-9_-]{40,50}$/.test(clientId)) return null;
  const signatureBytes = new Uint8Array(signature.byteLength);
  signatureBytes.set(signature);
  const valid = await crypto.subtle.verify(
    "HMAC",
    await hmacKey(secret),
    signatureBytes,
    new TextEncoder().encode(clientId),
  );
  return valid ? hashClientId(clientId) : null;
}

async function hashClientId(clientId: string): Promise<string> {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(clientId)),
  );
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function verifyAccessToken(
  token: string,
  audience: string,
  issuer: string,
  keySet: JWTVerifyGetKey,
): Promise<void> {
  await jwtVerify(token, keySet, { algorithms: ["RS256"], audience, issuer });
}

export async function requireAdmin(request: Request, env: Env): Promise<void> {
  if (env.ENVIRONMENT === "local" && env.DEV_ACCESS_BYPASS === "true") {
    const supplied = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    if (!env.DEV_ADMIN_TOKEN || supplied.length !== env.DEV_ADMIN_TOKEN.length)
      throw new Error("Unauthorized");
    const suppliedBytes = new TextEncoder().encode(supplied);
    const expectedBytes = new TextEncoder().encode(env.DEV_ADMIN_TOKEN);
    let difference = 0;
    for (let index = 0; index < suppliedBytes.length; index += 1) {
      difference |= suppliedBytes[index]! ^ expectedBytes[index]!;
    }
    if (difference !== 0) throw new Error("Unauthorized");
    return;
  }

  if (!env.ACCESS_AUD || !env.ACCESS_TEAM_DOMAIN) throw new Error("Access is not configured");
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) throw new Error("Cloudflare Access JWT is missing");
  const issuer = env.ACCESS_TEAM_DOMAIN.replace(/\/$/, "");
  let keySet = accessKeySets.get(issuer);
  if (!keySet) {
    keySet = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
    accessKeySets.set(issuer, keySet);
  }
  try {
    await verifyAccessToken(token, env.ACCESS_AUD, issuer, keySet);
  } catch (error) {
    throw new Error("Invalid Cloudflare Access JWT", { cause: error });
  }
}

export function requireSameOrigin(request: Request, env: Env): void {
  const origin = request.headers.get("Origin");
  const expected = env.PUBLIC_ORIGIN || new URL(request.url).origin;
  if (!origin || origin !== expected) throw new Error("Origin is not allowed");
}
