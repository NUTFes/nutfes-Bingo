import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { beforeAll, describe, expect, it } from "vitest";

import { requireAdmin, requireScreen, verifyAccessAssertion } from "../worker/access";

const ISSUER = "https://test-team.cloudflareaccess.com";
const AUDIENCE = "test-access-audience";
const SCREEN_AUDIENCE = "test-screen-access-audience";
const KEY_ID = "test-access-key";
const CONFIG = {
  issuer: ISSUER,
  audience: AUDIENCE,
} as const;
const SCREEN_CONFIG = {
  issuer: ISSUER,
  audience: SCREEN_AUDIENCE,
} as const;

let keys: Awaited<ReturnType<typeof generateKeyPair>>;
let localJwks: ReturnType<typeof createLocalJWKSet>;

beforeAll(async () => {
  keys = await generateKeyPair("RS256", { extractable: true });
  const publicJwk = await exportJWK(keys.publicKey);
  localJwks = createLocalJWKSet({
    keys: [{ ...publicJwk, alg: "RS256", kid: KEY_ID, use: "sig" }],
  });
});

async function signAssertion(input?: {
  audience?: string;
  email?: string;
  expiration?: number | string;
  issuer?: string;
  subject?: string;
}) {
  return new SignJWT({
    email: input?.email ?? "Admin@Example.com",
    sub: input?.subject ?? "access-user-id",
  })
    .setProtectedHeader({ alg: "RS256", kid: KEY_ID })
    .setIssuedAt()
    .setIssuer(input?.issuer ?? ISSUER)
    .setAudience(input?.audience ?? AUDIENCE)
    .setExpirationTime(input?.expiration ?? "5m")
    .sign(keys.privateKey);
}

describe("Cloudflare Access JWT verification", () => {
  it("accepts a valid signed assertion for any email and normalizes it", async () => {
    const assertion = await signAssertion({ email: "New-Admin@Example.com" });

    await expect(verifyAccessAssertion(assertion, CONFIG, localJwks)).resolves.toEqual({
      email: "new-admin@example.com",
    });
  });

  it("rejects an expired assertion", async () => {
    const assertion = await signAssertion({ expiration: Math.floor(Date.now() / 1_000) - 60 });

    await expect(verifyAccessAssertion(assertion, CONFIG, localJwks)).rejects.toThrow();
  });

  it("rejects an assertion for another Access application", async () => {
    const assertion = await signAssertion({ audience: "another-application" });

    await expect(verifyAccessAssertion(assertion, CONFIG, localJwks)).rejects.toThrow();
  });

  it("rejects a correctly signed assertion from another issuer", async () => {
    const assertion = await signAssertion({ issuer: "https://attacker.cloudflareaccess.com" });

    await expect(verifyAccessAssertion(assertion, CONFIG, localJwks)).rejects.toThrow();
  });

  it("rejects an assertion with an untrusted signature", async () => {
    const untrusted = await generateKeyPair("RS256");
    const assertion = await new SignJWT({ email: "admin@example.com", sub: "access-user-id" })
      .setProtectedHeader({ alg: "RS256", kid: KEY_ID })
      .setIssuedAt()
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setExpirationTime("5m")
      .sign(untrusted.privateKey);

    await expect(verifyAccessAssertion(assertion, CONFIG, localJwks)).rejects.toThrow();
  });

  it("accepts a venue operator only for the dedicated Screen application", async () => {
    const assertion = await signAssertion({
      audience: SCREEN_AUDIENCE,
      email: "Screen@Example.com",
    });

    await expect(verifyAccessAssertion(assertion, SCREEN_CONFIG, localJwks)).resolves.toEqual({
      email: "screen@example.com",
    });
    await expect(verifyAccessAssertion(assertion, CONFIG, localJwks)).rejects.toThrow();
  });

  it("rejects an Admin application token for the Screen audience", async () => {
    const adminAssertion = await signAssertion();

    await expect(verifyAccessAssertion(adminAssertion, SCREEN_CONFIG, localJwks)).rejects.toThrow();
  });

  it("fails closed on both routes when Admin and Screen use the same Access application", async () => {
    const env = {
      LOCAL_ADMIN_BYPASS: "false",
      LOCAL_SCREEN_BYPASS: "false",
      ACCESS_AUD: AUDIENCE,
      SCREEN_ACCESS_AUD: AUDIENCE,
    } as unknown as Env;

    await expect(requireAdmin(new Request("https://example.com/admin"), env)).rejects.toThrow(
      /異なる Access application/,
    );
    await expect(requireScreen(new Request("https://example.com/screen"), env)).rejects.toThrow(
      /異なる Access application/,
    );
  });

  it("rejects a bare Access team domain instead of accepting an unused legacy format", async () => {
    const env = {
      LOCAL_ADMIN_BYPASS: "false",
      ACCESS_AUD: AUDIENCE,
      SCREEN_ACCESS_AUD: SCREEN_AUDIENCE,
      ACCESS_TEAM_DOMAIN: "test-team.cloudflareaccess.com",
    } as unknown as Env;

    await expect(requireAdmin(new Request("https://example.com/admin"), env)).rejects.toThrow(
      /team domain が不正/,
    );
  });

  it("rejects an empty email", async () => {
    const assertion = await signAssertion({ email: "   " });

    await expect(verifyAccessAssertion(assertion, CONFIG, localJwks)).rejects.toThrow(/email/);
  });

  it("rejects an empty subject", async () => {
    const assertion = await signAssertion({ subject: "" });

    await expect(verifyAccessAssertion(assertion, CONFIG, localJwks)).rejects.toThrow(/subject/);
  });
});
