import { createRemoteJWKSet, errors, jwtVerify, type JWTVerifyGetKey } from "jose";

import { ApiError } from "./http";

// Configuration-scoped cache only. jose owns key freshness/reload semantics; no request data is stored.
const accessJwks = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

type AccessIdentity = {
  email: string;
  subject: string;
};

export type AdminIdentity = AccessIdentity;
export type ScreenIdentity = AccessIdentity;

type AccessAssertionConfig = {
  issuer: string;
  audiences: readonly string[];
  allowedEmails: readonly string[];
};

export type AdminAssertionConfig = AccessAssertionConfig;
export type ScreenAssertionConfig = AccessAssertionConfig;

export async function requireAdmin(request: Request, env: Env): Promise<AdminIdentity> {
  if (isLocalBypass(request, env.LOCAL_ADMIN_BYPASS)) {
    const actorOverride = request.headers.get("X-Local-Admin-Email");
    const email =
      actorOverride === null ? "local-development@localhost" : parseLocalActor(actorOverride);
    return { email, subject: "local-development" };
  }

  return requireAccessIdentity(request, env, {
    audiences: env.ACCESS_AUD,
    allowedEmails: env.ADMIN_EMAILS,
    authenticationMessage: "管理者認証が必要です。",
    permissionMessage: "管理者権限がありません。",
  });
}

export async function requireScreen(request: Request, env: Env): Promise<ScreenIdentity> {
  if (isLocalBypass(request, env.LOCAL_SCREEN_BYPASS)) {
    return { email: "local-screen@localhost", subject: "local-screen" };
  }

  const adminAudiences = new Set(parseStringList(env.ACCESS_AUD));
  const screenAudiences = parseStringList(env.SCREEN_ACCESS_AUD);
  if (screenAudiences.some((audience) => adminAudiences.has(audience))) {
    throw new ApiError(503, "管理画面と会場画面には異なる Access application が必要です。");
  }

  return requireAccessIdentity(request, env, {
    audiences: JSON.stringify(screenAudiences),
    allowedEmails: env.SCREEN_EMAILS,
    authenticationMessage: "会場画面の認証が必要です。",
    permissionMessage: "会場画面を利用する権限がありません。",
  });
}

async function requireAccessIdentity(
  request: Request,
  env: Env,
  requirement: {
    audiences: string;
    allowedEmails: string;
    authenticationMessage: string;
    permissionMessage: string;
  },
): Promise<AccessIdentity> {
  const issuer = parseTeamIssuer(env.ACCESS_TEAM_DOMAIN);
  const audiences = parseStringList(requirement.audiences);
  const allowedEmails = parseStringList(requirement.allowedEmails).map((email) =>
    email.toLowerCase(),
  );
  if (audiences.length === 0 || allowedEmails.length === 0) {
    throw new ApiError(503, "Cloudflare Access の設定が完了していません。");
  }

  const assertion = request.headers.get("Cf-Access-Jwt-Assertion");
  if (assertion === null || assertion.length === 0 || assertion.length > 16_384) {
    throw new ApiError(401, requirement.authenticationMessage);
  }

  try {
    const jwks = getAccessJwks(issuer);
    return await verifyAccessAssertion(
      assertion,
      { issuer, audiences, allowedEmails },
      jwks,
      requirement.permissionMessage,
    );
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (isAccessKeyServiceError(error)) {
      throw new ApiError(503, "Cloudflare Access の検証サービスに接続できません。");
    }
    throw new ApiError(401, "Cloudflare Access token の検証に失敗しました。");
  }
}

function isAccessKeyServiceError(error: unknown): boolean {
  return (
    error instanceof TypeError ||
    error instanceof errors.JWKSTimeout ||
    error instanceof errors.JWKSInvalid ||
    (error instanceof errors.JOSEError && error.constructor === errors.JOSEError)
  );
}

export async function verifyAdminAssertion(
  assertion: string,
  config: AdminAssertionConfig,
  jwks: JWTVerifyGetKey,
): Promise<AdminIdentity> {
  return verifyAccessAssertion(assertion, config, jwks, "管理者権限がありません。");
}

export async function verifyScreenAssertion(
  assertion: string,
  config: ScreenAssertionConfig,
  jwks: JWTVerifyGetKey,
): Promise<ScreenIdentity> {
  return verifyAccessAssertion(assertion, config, jwks, "会場画面を利用する権限がありません。");
}

async function verifyAccessAssertion(
  assertion: string,
  config: AccessAssertionConfig,
  jwks: JWTVerifyGetKey,
  permissionMessage: string,
): Promise<AccessIdentity> {
  const { payload } = await jwtVerify(assertion, jwks, {
    algorithms: ["RS256"],
    issuer: config.issuer,
    audience: [...config.audiences],
    clockTolerance: 10,
    requiredClaims: ["exp", "email", "sub"],
  });

  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  if (email === "" || !config.allowedEmails.includes(email)) {
    throw new ApiError(403, permissionMessage);
  }
  if (typeof payload.sub !== "string" || payload.sub === "") {
    throw new ApiError(401, "Cloudflare Access token の subject が不正です。");
  }
  return { email, subject: payload.sub };
}

function isLocalBypass(request: Request, enabled: string): boolean {
  if (enabled !== "true") return false;
  const hostname = new URL(request.url).hostname.toLowerCase();
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

function parseTeamIssuer(value: string): string {
  const trimmed = value.trim();
  if (trimmed === "") {
    throw new ApiError(503, "Cloudflare Access team domain が設定されていません。");
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed.startsWith("https://") ? trimmed : `https://${trimmed}`);
  } catch {
    throw new ApiError(503, "Cloudflare Access team domain が不正です。");
  }

  if (
    parsed.protocol !== "https:" ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.pathname !== "/" ||
    parsed.port !== "" ||
    parsed.search !== "" ||
    parsed.hash !== "" ||
    !parsed.hostname.toLowerCase().endsWith(".cloudflareaccess.com")
  ) {
    throw new ApiError(503, "Cloudflare Access team domain が不正です。");
  }
  return parsed.origin;
}

function getAccessJwks(issuer: string): ReturnType<typeof createRemoteJWKSet> {
  const existing = accessJwks.get(issuer);
  if (existing !== undefined) return existing;
  const created = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`), {
    timeoutDuration: 3_000,
    cooldownDuration: 30_000,
    cacheMaxAge: 10 * 60_000,
    headers: { Accept: "application/json" },
  });
  accessJwks.set(issuer, created);
  return created;
}

function parseLocalActor(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (
    normalized.length > 320 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ||
    hasControlCharacters(normalized)
  ) {
    throw new ApiError(400, "X-Local-Admin-Email が不正です。");
  }
  return normalized;
}

function hasControlCharacters(value: string): boolean {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  });
}

function parseStringList(value: string): string[] {
  const trimmed = value.trim();
  if (trimmed === "") return [];

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed) && parsed.every((entry) => typeof entry === "string")) {
        return parsed.map((entry) => entry.trim()).filter((entry) => entry !== "");
      }
    } catch {
      return [];
    }
    return [];
  }

  return trimmed
    .split(/[\s,]+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "");
}
