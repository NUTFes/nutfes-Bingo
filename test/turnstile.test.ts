import { afterEach, describe, expect, it, vi } from "vitest";

import { parseTurnstileToken, TURNSTILE_ACTION, verifyTurnstileToken } from "../worker/turnstile";

const REQUEST = new Request("https://bingo.example.com/api/bingo/reach", {
  method: "POST",
  headers: { "CF-Connecting-IP": "203.0.113.8" },
});
const CONFIG = {
  LOCAL_TURNSTILE_TEST_MODE: "false",
  TURNSTILE_HOSTNAME: "bingo.example.com",
  TURNSTILE_SECRET_KEY: "test-secret",
} as const;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Turnstile token validation", () => {
  it("rejects missing, padded, and oversized tokens before Siteverify", () => {
    expect(() => parseTurnstileToken(undefined)).toThrow();
    expect(() => parseTurnstileToken(" token ")).toThrow();
    expect(() => parseTurnstileToken("x".repeat(2_049))).toThrow();
  });

  it("sends the token to Siteverify and accepts the expected action and hostname", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      expect(String(input)).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
      expect(init?.method).toBe("POST");
      expect(init?.redirect).toBe("manual");
      const body = JSON.parse(String(init?.body)) as Record<string, string>;
      expect(body).toMatchObject({
        secret: "test-secret",
        response: "valid-token",
        remoteip: "203.0.113.8",
      });
      expect(body.idempotency_key).toMatch(/^[0-9a-f-]{36}$/);
      return Response.json({
        success: true,
        action: TURNSTILE_ACTION,
        hostname: "bingo.example.com",
      });
    });

    await expect(verifyTurnstileToken(REQUEST, CONFIG, "valid-token")).resolves.toBeUndefined();
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it.each([
    [{ success: false, "error-codes": ["invalid-input-response"] }, "challenge failure"],
    [{ success: true, action: "another-action", hostname: "bingo.example.com" }, "action mismatch"],
    [
      { success: true, action: TURNSTILE_ACTION, hostname: "attacker.example" },
      "hostname mismatch",
    ],
  ])("rejects %s without trusting a successful-looking response (%s)", async (body, _label) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(body));

    await expect(verifyTurnstileToken(REQUEST, CONFIG, "invalid-token")).rejects.toMatchObject({
      status: 403,
    });
  });

  it.each([
    [new Response("upstream failed", { status: 500 }), "upstream error"],
    [
      new Response(null, {
        status: 302,
        headers: { Location: "https://attacker.example/collect" },
      }),
      "redirect response",
    ],
    [new Response("not json", { status: 200 }), "malformed JSON"],
  ])("fails closed on %s (%s)", async (response) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response);

    await expect(verifyTurnstileToken(REQUEST, CONFIG, "valid-token")).rejects.toMatchObject({
      status: 503,
    });
  });

  it("fails closed before fetch when its secret, hostname, or request host is wrong", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await expect(
      verifyTurnstileToken(REQUEST, { ...CONFIG, TURNSTILE_SECRET_KEY: "" }, "valid-token"),
    ).rejects.toMatchObject({ status: 503 });
    await expect(
      verifyTurnstileToken(REQUEST, { ...CONFIG, TURNSTILE_HOSTNAME: "" }, "valid-token"),
    ).rejects.toMatchObject({ status: 503 });
    await expect(
      verifyTurnstileToken(
        REQUEST,
        { ...CONFIG, TURNSTILE_HOSTNAME: "another.example.com" },
        "valid-token",
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("fails closed when Siteverify cannot be reached", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network unavailable"));

    await expect(verifyTurnstileToken(REQUEST, CONFIG, "valid-token")).rejects.toMatchObject({
      status: 503,
    });
  });

  it("normalizes a Siteverify response-body failure to a service error", async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.error(new Error("response interrupted"));
      },
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(stream, { status: 200 }));

    await expect(verifyTurnstileToken(REQUEST, CONFIG, "valid-token")).rejects.toMatchObject({
      status: 503,
    });
  });

  it("accepts the official always-pass response only in explicit loopback test mode", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      Response.json({ success: true, action: "", hostname: "example.com" }),
    );
    const localRequest = new Request("http://localhost/api/bingo/reach", { method: "POST" });
    const localConfig = {
      LOCAL_TURNSTILE_TEST_MODE: "true",
      TURNSTILE_HOSTNAME: "localhost",
      TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
    };

    await expect(
      verifyTurnstileToken(localRequest, localConfig, "official-test-token"),
    ).resolves.toBeUndefined();
    await expect(
      verifyTurnstileToken(
        new Request("https://bingo.example.com/api/bingo/reach", { method: "POST" }),
        { ...localConfig, TURNSTILE_HOSTNAME: "bingo.example.com" },
        "official-test-token",
      ),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      verifyTurnstileToken(
        localRequest,
        { ...localConfig, TURNSTILE_SECRET_KEY: "production-secret" },
        "official-test-token",
      ),
    ).rejects.toMatchObject({ status: 403 });
  });
});
