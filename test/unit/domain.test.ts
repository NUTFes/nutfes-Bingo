import { env } from "cloudflare:test";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { describe, expect, it, vi } from "vitest";

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

  it("keeps the committed image referenced until deferred old-image cleanup succeeds", async () => {
    const room = env.BINGO_ROOM.getByName("unit-image-outbox-room");
    const oldKey = "prizes/00000000-0000-4000-8000-000000000001.png";
    const newKey = "prizes/00000000-0000-4000-8000-000000000002.png";
    await env.PRIZE_IMAGES.put(oldKey, Uint8Array.of(1));
    await env.PRIZE_IMAGES.put(newKey, Uint8Array.of(2));
    const created = await room.admin({
      type: "prize.create",
      prize: {
        nameJa: "旧景品",
        nameEn: "Old prize",
        imageKey: oldKey,
        imageUrl: null,
        isWon: false,
      },
    });
    const prize = created.prizes[0]!;

    const updated = await room.admin({
      type: "prize.update",
      id: prize.id,
      expectedImageKey: oldKey,
      prize: { imageKey: newKey },
    });
    expect(updated.prizes[0]?.imageKey).toBe(newKey);
    expect(await env.PRIZE_IMAGES.head(newKey)).not.toBeNull();
    expect(await room.maintenanceStatus()).toMatchObject({ pendingImageDeletions: 1 });

    const result = await room.flushMaintenance();
    expect(result.pendingImageDeletions).toBe(0);
    expect(await env.PRIZE_IMAGES.head(oldKey)).toBeNull();
    expect(await env.PRIZE_IMAGES.head(newKey)).not.toBeNull();
  });

  it("retries a failed R2 cleanup without deleting the committed replacement", async () => {
    const room = env.BINGO_ROOM.getByName("unit-image-cleanup-retry-room");
    const key = "prizes/00000000-0000-4000-8000-000000000006.png";
    await env.PRIZE_IMAGES.put(key, Uint8Array.of(6));
    await room.enqueueImageDeletion(key);
    const deleteFailure = vi
      .spyOn(env.PRIZE_IMAGES, "delete")
      .mockRejectedValueOnce(new Error("Injected R2 delete failure"));

    expect(await room.flushMaintenance()).toMatchObject({ pendingImageDeletions: 1 });
    expect(await env.PRIZE_IMAGES.head(key)).not.toBeNull();
    deleteFailure.mockRestore();
    expect(await room.flushMaintenance()).toMatchObject({ pendingImageDeletions: 0 });
    expect(await env.PRIZE_IMAGES.head(key)).toBeNull();
  });

  it("preserves stored survey state while the display flag is disabled", async () => {
    const room = env.BINGO_ROOM.getByName("unit-survey-flag-room");
    await room.admin({ type: "survey.update", active: true, url: "https://example.com/survey" });
    await room.admin({ type: "flags.update", flags: { surveyEnabled: false } });
    const disabledSnapshot = await room.getSnapshot();
    expect(disabledSnapshot.survey.active).toBe(true);
    expect(disabledSnapshot.flags.surveyEnabled).toBe(false);
    const enabledSnapshot = await room.admin({
      type: "flags.update",
      flags: { surveyEnabled: true },
    });
    expect(enabledSnapshot.survey.active).toBe(true);
    expect(enabledSnapshot.flags.surveyEnabled).toBe(true);
  });

  it("converges every reaction shard and applies read-only mode", async () => {
    const room = env.BINGO_ROOM.getByName("unit-reaction-sync-room");
    await room.admin({ type: "flags.update", flags: { readOnlyMode: true } });
    expect((await room.maintenanceStatus()).pendingReactionSyncs).toBe(Number(env.REACTION_SHARDS));
    await room.flushMaintenance();
    for (let shard = 0; shard < Number(env.REACTION_SHARDS); shard += 1) {
      const config = await env.REACTION_ROOM.getByName(
        `reaction-room:${env.EVENT_ID}:${shard}`,
      ).getConfig();
      expect(config.enabled).toBe(false);
      expect(config.version).toBe(1);
    }
  });

  it("resumes event initialization cleanup after a partial reaction-shard result", async () => {
    const room = env.BINGO_ROOM.getByName("unit-initialize-retry-room");
    const imageKey = "prizes/00000000-0000-4000-8000-000000000005.png";
    await env.PRIZE_IMAGES.put(imageKey, Uint8Array.of(5));
    await room.admin({
      type: "prize.create",
      prize: {
        nameJa: "初期化景品",
        nameEn: "Initialize prize",
        imageKey,
        imageUrl: null,
        isWon: false,
      },
    });
    await room.admin({ type: "number.add", number: 42 });
    await room.admin({ type: "flags.update", flags: { reactionsEnabled: false } });

    const initialized = await room.admin({ type: "event.initialize" });
    expect(initialized.numbers).toEqual([]);
    expect(initialized.prizes).toEqual([]);
    expect(await room.maintenanceStatus()).toEqual({
      pendingImageDeletions: 1,
      pendingReactionSyncs: Number(env.REACTION_SHARDS),
    });

    await env.REACTION_ROOM.getByName(`reaction-room:${env.EVENT_ID}:0`).applyConfig(2, true, true);
    await room.flushMaintenance();
    expect(await room.maintenanceStatus()).toEqual({
      pendingImageDeletions: 0,
      pendingReactionSyncs: 0,
    });
    expect(await env.PRIZE_IMAGES.head(imageKey)).toBeNull();
    for (let shard = 0; shard < Number(env.REACTION_SHARDS); shard += 1) {
      const config = await env.REACTION_ROOM.getByName(
        `reaction-room:${env.EVENT_ID}:${shard}`,
      ).getConfig();
      expect(config).toMatchObject({ enabled: true, version: 2, acceptedCount: 0 });
    }
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
    const jpeg = Uint8Array.of(0xff, 0xd8, 0xff);
    const webp = new TextEncoder().encode("RIFF0000WEBP");
    expect(validatePrizeImage(png, "image/png").extension).toBe("png");
    expect(validatePrizeImage(jpeg, "image/jpeg").extension).toBe("jpg");
    expect(validatePrizeImage(webp, "image/webp").extension).toBe("webp");
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
