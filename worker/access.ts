import { createRemoteJWKSet, errors, jwtVerify, type JWTVerifyGetKey } from "jose";

import { ApiError } from "./http";

// Configuration-scoped cache only. jose owns key freshness/reload semantics; no request data is stored.
const accessJwks = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

type AccessIdentity = {
  email: string;
};

export type AdminIdentity = AccessIdentity;

export async function requireAdmin(request: Request, env: Env): Promise<AdminIdentity> {
  if (isLocalBypass(request, env.LOCAL_ADMIN_BYPASS)) {
    const actorOverride = request.headers.get("X-Local-Admin-Email");
    const email =
      actorOverride === null ? "local-development@localhost" : parseLocalActor(actorOverride);
    return { email };
  }

  const { adminAudience } = parseAccessAudiences(env);
  return requireAccessIdentity(request, env, {
    audience: adminAudience,
    authenticationMessage: "管理者認証が必要です。",
  });
}

export async function requireScreen(request: Request, env: Env): Promise<AccessIdentity> {
  if (isLocalBypass(request, env.LOCAL_SCREEN_BYPASS)) {
    return { email: "local-screen@localhost" };
  }

  const { screenAudience } = parseAccessAudiences(env);
  return requireAccessIdentity(request, env, {
    audience: screenAudience,
    authenticationMessage: "会場画面の認証が必要です。",
  });
}

async function requireAccessIdentity(
  request: Request,
  env: Env,
  requirement: {
    audience: string;
    authenticationMessage: string;
  },
): Promise<AccessIdentity> {
  const issuer = parseTeamIssuer(env.ACCESS_TEAM_DOMAIN);

  const assertion = request.headers.get("Cf-Access-Jwt-Assertion");
  if (assertion === null || assertion.length === 0 || assertion.length > 16_384) {
    throw new ApiError(401, requirement.authenticationMessage);
  }

  try {
    const jwks = getAccessJwks(issuer);
    return await verifyAccessAssertion(assertion, { issuer, audience: requirement.audience }, jwks);
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

export async function verifyAccessAssertion(
  assertion: string,
  config: { issuer: string; audience: string },
  jwks: JWTVerifyGetKey,
): Promise<AccessIdentity> {
  const { payload } = await jwtVerify(assertion, jwks, {
    algorithms: ["RS256"],
    issuer: config.issuer,
    audience: config.audience,
    clockTolerance: 10,
    requiredClaims: ["exp", "email", "sub"],
  });

  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  if (email === "") {
    throw new ApiError(401, "Cloudflare Access token の email が不正です。");
  }
  if (typeof payload.sub !== "string" || payload.sub.trim() === "") {
    throw new ApiError(401, "Cloudflare Access token の subject が不正です。");
  }
  return { email };
}

function parseAccessAudiences(env: Env): { adminAudience: string; screenAudience: string } {
  const adminAudience = env.ACCESS_AUD.trim();
  const screenAudience = env.SCREEN_ACCESS_AUD.trim();
  if (adminAudience === "" || screenAudience === "") {
    throw new ApiError(503, "Cloudflare Access の設定が完了していません。");
  }
  if (adminAudience === screenAudience) {
    throw new ApiError(503, "管理画面と会場画面には異なる Access application が必要です。");
  }
  return { adminAudience, screenAudience };
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
    parsed = new URL(trimmed);
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
