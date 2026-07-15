import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { beforeAll, describe, expect, it } from "vitest";

import { verifyAdminAssertion, verifyScreenAssertion } from "../worker/access";

const ISSUER = "https://test-team.cloudflareaccess.com";
const AUDIENCE = "test-access-audience";
const SCREEN_AUDIENCE = "test-screen-access-audience";
const KEY_ID = "test-access-key";
const CONFIG = {
  issuer: ISSUER,
  audiences: [AUDIENCE],
  allowedEmails: ["admin@example.com"],
} as const;
const SCREEN_CONFIG = {
  issuer: ISSUER,
  audiences: [SCREEN_AUDIENCE],
  allowedEmails: ["screen@example.com"],
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
}) {
  return new SignJWT({
    email: input?.email ?? "Admin@Example.com",
    sub: "access-user-id",
  })
    .setProtectedHeader({ alg: "RS256", kid: KEY_ID })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(input?.audience ?? AUDIENCE)
    .setExpirationTime(input?.expiration ?? "5m")
    .sign(keys.privateKey);
}

describe("Cloudflare Access JWT verification", () => {
  it("accepts a valid signed assertion and normalizes its email", async () => {
    const assertion = await signAssertion();

    await expect(verifyAdminAssertion(assertion, CONFIG, localJwks)).resolves.toEqual({
      email: "admin@example.com",
      subject: "access-user-id",
    });
  });

  it("rejects an expired assertion", async () => {
    const assertion = await signAssertion({ expiration: Math.floor(Date.now() / 1_000) - 60 });

    await expect(verifyAdminAssertion(assertion, CONFIG, localJwks)).rejects.toThrow();
  });

  it("rejects an assertion for another Access application", async () => {
    const assertion = await signAssertion({ audience: "another-application" });

    await expect(verifyAdminAssertion(assertion, CONFIG, localJwks)).rejects.toThrow();
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

    await expect(verifyAdminAssertion(assertion, CONFIG, localJwks)).rejects.toThrow();
  });

  it("rejects a signed assertion for an email outside the allowlist", async () => {
    const assertion = await signAssertion({ email: "not-allowed@example.com" });

    await expect(verifyAdminAssertion(assertion, CONFIG, localJwks)).rejects.toThrow(
      /管理者権限がありません/,
    );
  });

  it("accepts a venue operator only for the dedicated Screen application", async () => {
    const assertion = await signAssertion({
      audience: SCREEN_AUDIENCE,
      email: "Screen@Example.com",
    });

    await expect(verifyScreenAssertion(assertion, SCREEN_CONFIG, localJwks)).resolves.toEqual({
      email: "screen@example.com",
      subject: "access-user-id",
    });
    await expect(verifyAdminAssertion(assertion, CONFIG, localJwks)).rejects.toThrow();
  });

  it("rejects an admin application token and a non-allowlisted identity for Screen", async () => {
    const adminAssertion = await signAssertion();
    await expect(verifyScreenAssertion(adminAssertion, SCREEN_CONFIG, localJwks)).rejects.toThrow();

    const outsiderAssertion = await signAssertion({
      audience: SCREEN_AUDIENCE,
      email: "outsider@example.com",
    });
    await expect(
      verifyScreenAssertion(outsiderAssertion, SCREEN_CONFIG, localJwks),
    ).rejects.toThrow(/会場画面を利用する権限がありません/);
  });
});
