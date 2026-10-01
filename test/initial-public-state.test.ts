import { afterEach, describe, expect, it, vi } from "vitest";

// Dynamic imports reload the one-shot singleton after vi.resetModules; static imports retain state.

afterEach(() => {
  vi.restoreAllMocks();
});

describe("initial public state lifecycle", () => {
  it("delivers an early request failure to its first consumer without replay", async () => {
    let rejectFetch!: (error: unknown) => void;
    const failure = new Error("state unavailable");
    vi.spyOn(globalThis, "fetch").mockImplementation(
      () =>
        new Promise<Response>((_resolve, reject) => {
          rejectFetch = reject;
        }),
    );
    vi.resetModules();
    const { primeInitialPublicState, takeInitialPublicState } =
      await import("../src/lib/initial-public-state");

    primeInitialPublicState();
    rejectFetch(failure);
    await Promise.resolve();

    await expect(takeInitialPublicState(new AbortController().signal)).rejects.toBe(failure);
    expect(takeInitialPublicState(new AbortController().signal)).toBeUndefined();
  });

  it("does not let a canceled consumer replay or retain the body request", async () => {
    let bodyController: ReadableStreamDefaultController<Uint8Array> | undefined;
    vi.spyOn(globalThis, "fetch").mockImplementation((_input, init) => {
      const signal = init?.signal as AbortSignal;
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          bodyController = controller;
          controller.enqueue(new TextEncoder().encode('{"numbers":'));
        },
      });
      signal.addEventListener("abort", () => {
        bodyController?.error(new DOMException("Aborted", "AbortError"));
      });
      return Promise.resolve(new Response(body, { headers: { ETag: '"state-1"' } }));
    });
    vi.resetModules();
    const { primeInitialPublicState, takeInitialPublicState } =
      await import("../src/lib/initial-public-state");

    primeInitialPublicState();
    const consumer = new AbortController();
    const initial = takeInitialPublicState(consumer.signal);
    await Promise.resolve();
    consumer.abort();

    await expect(initial).rejects.toMatchObject({ name: "AbortError" });
    expect(takeInitialPublicState(new AbortController().signal)).toBeUndefined();
  });

  it("leaves the pending snapshot available when the first signal is already aborted", async () => {
    const payload = { revision: 3, prizes: [] };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json(payload, { headers: { ETag: '"state-3"' } }),
    );
    vi.resetModules();
    const { primeInitialPublicState, takeInitialPublicState } =
      await import("../src/lib/initial-public-state");

    primeInitialPublicState();
    const canceled = new AbortController();
    canceled.abort();

    expect(takeInitialPublicState(canceled.signal)).toBeUndefined();
    await expect(takeInitialPublicState(new AbortController().signal)).resolves.toEqual({
      data: payload,
      etag: '"state-3"',
    });
    expect(takeInitialPublicState(new AbortController().signal)).toBeUndefined();
  });

  it("rejects cancellation after the body completes but before the consumer receives it", async () => {
    const consumer = new AbortController();
    const response = Response.json({ revision: 4, prizes: [] });
    const readBody = response.json.bind(response);
    vi.spyOn(response, "json").mockImplementation(async () => {
      const data: unknown = await readBody();
      consumer.abort();
      return data;
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response);
    vi.resetModules();
    const { primeInitialPublicState, takeInitialPublicState } =
      await import("../src/lib/initial-public-state");

    primeInitialPublicState();
    await expect(takeInitialPublicState(consumer.signal)).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(takeInitialPublicState(new AbortController().signal)).toBeUndefined();
  });
});
