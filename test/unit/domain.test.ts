import { env } from "cloudflare:test";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { describe, expect, it } from "vitest";

import { validatePrizeImage } from "../../src/worker/images";
import { createClientCookie, readClientHash, verifyAccessToken } from "../../src/worker/security";
import { requireBingoNumber, requireSurveyUrl } from "../../src/shared/validation";

describe("bingo invariants", () => {
  it("adds, updates, and deletes numbers", async () => {
    const room = env.BINGO_ROOM.getByName("unit-number-room");
    let snapshot = await room.admin({ type: "number.add", number: 15 });
    expect(snapshot.numbers).toEqual([{ id: 1, number: 15 }]);
    expect(snapshot.version).toBe(1);

    snapshot = await room.admin({ type: "number.update", id: 1, number: 42 });
    expect(snapshot.latestNumber).toBe(42);

    snapshot = await room.admin({ type: "number.delete", id: 1 });
    expect(snapshot.numbers).toEqual([]);
    expect(snapshot.latestNumber).toBeNull();
  });

  it("never lets reach count become negative and deduplicates public reach", async () => {
    const room = env.BINGO_ROOM.getByName("unit-reach-room");
    expect((await room.admin({ type: "reach.decrement" })).reachCount).toBe(0);
    const clientHash = "a".repeat(64);
    expect(await room.submitReach(clientHash)).toEqual({ accepted: true, count: 1 });
    expect(await room.submitReach(clientHash)).toEqual({ accepted: false, count: 1 });
    expect((await room.admin({ type: "reach.reset" })).reachCount).toBe(0);
    expect((await room.submitReach(clientHash)).accepted).toBe(true);
  });

  it("keeps prize ordering deterministic", async () => {
    const room = env.BINGO_ROOM.getByName("unit-prize-room");
    const input = (name: string) => ({
      nameJa: name,
      nameEn: name,
      imageKey: null,
      imageUrl: null,
      isWon: false,
    });
    await room.admin({ type: "prize.create", prize: input("A") });
    await room.admin({ type: "prize.create", prize: input("B") });
    let snapshot = await room.getSnapshot();
    snapshot = await room.admin({
      type: "prize.reorder",
      ids: snapshot.prizes.map((prize) => prize.id).toReversed(),
    });
    expect(snapshot.prizes.map((prize) => prize.nameJa)).toEqual(["B", "A"]);
    snapshot = await room.admin({
      type: "prize.toggleWon",
      id: snapshot.prizes[0]!.id,
      isWon: true,
    });
    expect(snapshot.prizes.map((prize) => prize.nameJa)).toEqual(["A", "B"]);
  });
});

describe("validation", () => {
  it("validates number and HTTPS survey boundaries", () => {
    expect(requireBingoNumber(1)).toBe(1);
    expect(requireBingoNumber(99)).toBe(99);
    expect(() => requireBingoNumber(0)).toThrow();
    expect(() => requireBingoNumber(1.5)).toThrow();
    expect(requireSurveyUrl("https://example.com/form", true)).toBe("https://example.com/form");
    expect(() => requireSurveyUrl("http://example.com", true)).toThrow();
  });

  it("checks both image MIME and file signature", () => {
    const png = Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    expect(validatePrizeImage(png, "image/png").extension).toBe("png");
    expect(() => validatePrizeImage(png, "image/jpeg")).toThrow();
    expect(() => validatePrizeImage(new Uint8Array(2 * 1024 * 1024 + 1), "image/png")).toThrow();
  });
});

describe("authentication primitives", () => {
  it("signs client cookies and rejects tampering", async () => {
    const secret = "unit-test-cookie-signing-secret-at-least-32";
    const identity = await createClientCookie(secret);
    const request = new Request("https://example.com", { headers: { Cookie: identity.cookie } });
    expect(await readClientHash(request, secret)).toBe(identity.clientHash);
    const tampered = identity.cookie.replace("bingo_client=", "bingo_client=x");
    expect(
      await readClientHash(
        new Request("https://example.com", { headers: { Cookie: tampered } }),
        secret,
      ),
    ).toBeNull();
  });

  it("verifies Access signature, issuer, audience, and expiration", async () => {
    const { privateKey, publicKey } = await generateKeyPair("RS256");
    const publicJwk = await exportJWK(publicKey);
    publicJwk.kid = "unit-key";
    publicJwk.alg = "RS256";
    const keySet = createLocalJWKSet({ keys: [publicJwk] });
    const issuer = "https://team.cloudflareaccess.com";
    const token = await new SignJWT({ email: "admin@example.com" })
      .setProtectedHeader({ alg: "RS256", kid: "unit-key" })
      .setIssuer(issuer)
      .setAudience("bingo-admin")
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(privateKey);
    await expect(verifyAccessToken(token, "bingo-admin", issuer, keySet)).resolves.toBeUndefined();
    await expect(verifyAccessToken(token, "wrong-audience", issuer, keySet)).rejects.toThrow();
  });
});
