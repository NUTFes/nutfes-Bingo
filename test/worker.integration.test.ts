import { env, runDurableObjectAlarm, runInDurableObject, SELF } from "cloudflare:test";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TURNSTILE_ACTION } from "../worker/turnstile";

type DataEnvelope<T> = { data: T };

const LOCAL_ADMIN_HEADERS = {
  Origin: "http://localhost",
  "X-Local-Admin-Bypass": "true",
} as const;

afterEach(() => {
  vi.restoreAllMocks();
});

function mockSuccessfulTurnstile() {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
    Response.json({
      success: true,
      action: TURNSTILE_ACTION,
      hostname: "example.com",
    }),
  );
}

async function adminCommand<T>(command: Record<string, unknown>) {
  const response = await SELF.fetch("http://localhost/admin/api/command", {
    method: "POST",
    headers: {
      ...LOCAL_ADMIN_HEADERS,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  const body = await response.json<DataEnvelope<T>>();
  return { body, response };
}

async function nextMessage(socket: WebSocket): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("WebSocket message timeout")), 2_000);
    socket.addEventListener(
      "message",
      (event) => {
        clearTimeout(timeout);
        try {
          resolve(JSON.parse(String(event.data)) as Record<string, unknown>);
        } catch (error) {
          reject(error);
        }
      },
      { once: true },
    );
  });
}

async function closeSocket(socket: WebSocket): Promise<void> {
  if (socket.readyState === WebSocket.CLOSED) return;
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(resolve, 2_000);
    socket.addEventListener(
      "close",
      () => {
        clearTimeout(timeout);
        resolve();
      },
      { once: true },
    );
    socket.close(1000, "test complete");
  });
}

async function nextClose(socket: WebSocket): Promise<CloseEvent> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("WebSocket close timeout")), 2_000);
    socket.addEventListener(
      "close",
      (event) => {
        clearTimeout(timeout);
        resolve(event);
      },
      { once: true },
    );
  });
}

describe("public Worker routes", () => {
  it("serves static assets and initializes a healthy game", async () => {
    const asset = await SELF.fetch("http://example.com/");
    expect(asset.status).toBe(200);
    expect(asset.headers.get("content-type")).toContain("text/html");

    const health = await SELF.fetch("http://example.com/api/health");
    expect(health.status).toBe(200);
    await expect(health.json()).resolves.toMatchObject({
      status: "ok",
      releaseSha: "test-release-sha",
      eventId: "initial",
      revision: 0,
    });
  });

  it("returns an ETag and a 304 for an unchanged state", async () => {
    const initial = await SELF.fetch("http://example.com/api/bingo/state");
    expect(initial.status).toBe(200);
    const etag = initial.headers.get("etag");
    expect(etag).toBe('"state:0"');

    const unchanged = await SELF.fetch("http://example.com/api/bingo/state", {
      headers: { "If-None-Match": etag ?? "" },
    });
    expect(unchanged.status).toBe(304);
    expect(unchanged.headers.get("cache-control")).toBe("no-cache");
  });

  it("deduplicates public reach submissions and rejects cross-origin mutation", async () => {
    const siteverify = mockSuccessfulTurnstile();
    const clientId = crypto.randomUUID();
    const first = await SELF.fetch("http://example.com/api/bingo/reach", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://example.com" },
      body: JSON.stringify({ clientId, turnstileToken: "fresh-token-1" }),
    });
    expect(first.status).toBe(200);
    await expect(first.json()).resolves.toEqual({ data: 1 });
    const stateAfterFirst = await SELF.fetch("http://example.com/api/bingo/state");
    const firstState = await stateAfterFirst.json<{
      latestReachLog: unknown;
      revision: number;
    }>();

    const duplicate = await SELF.fetch("http://example.com/api/bingo/reach", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://example.com" },
      body: JSON.stringify({ clientId, turnstileToken: "fresh-token-2" }),
    });
    expect(duplicate.status).toBe(200);
    await expect(duplicate.json()).resolves.toEqual({ data: 1 });
    const stateAfterRetry = await SELF.fetch("http://example.com/api/bingo/state");
    await expect(stateAfterRetry.json()).resolves.toMatchObject({
      latestReachLog: firstState.latestReachLog,
      revision: firstState.revision,
    });

    const crossOrigin = await SELF.fetch("http://example.com/api/bingo/reach", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://attacker.example",
      },
      body: JSON.stringify({
        clientId: crypto.randomUUID(),
        turnstileToken: "cross-origin-token",
      }),
    });
    expect(crossOrigin.status).toBe(403);

    const missingOrigin = await SELF.fetch("http://example.com/api/bingo/reach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: crypto.randomUUID(),
        turnstileToken: "missing-origin-token",
      }),
    });
    expect(missingOrigin.status).toBe(403);

    const wrongMediaType = await SELF.fetch("http://example.com/api/bingo/reach", {
      method: "POST",
      headers: { "Content-Type": "text/plain", Origin: "http://example.com" },
      body: JSON.stringify({
        clientId: crypto.randomUUID(),
        turnstileToken: "wrong-media-type-token",
      }),
    });
    expect(wrongMediaType.status).toBe(415);
    expect(siteverify).toHaveBeenCalledTimes(2);
  });

  it("rejects a missing or failed Turnstile challenge without mutating game state", async () => {
    const beforeResponse = await SELF.fetch("http://example.com/api/bingo/state");
    const before = await beforeResponse.json<{ revision: number }>();

    const missing = await SELF.fetch("http://example.com/api/bingo/reach", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://example.com" },
      body: JSON.stringify({ clientId: crypto.randomUUID() }),
    });
    expect(missing.status).toBe(400);

    const siteverify = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () =>
        Response.json({ success: false, "error-codes": ["invalid-input-response"] }),
      );
    const rejected = await SELF.fetch("http://example.com/api/bingo/reach", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://example.com" },
      body: JSON.stringify({
        clientId: crypto.randomUUID(),
        turnstileToken: "rejected-token",
      }),
    });
    expect(rejected.status).toBe(403);
    expect(siteverify).toHaveBeenCalledOnce();

    const afterResponse = await SELF.fetch("http://example.com/api/bingo/state");
    await expect(afterResponse.json()).resolves.toMatchObject({ revision: before.revision });
  });
});

describe("Durable Object state", () => {
  it("persists mutations, increments revision, and enforces unique numbers", async () => {
    const state = env.GAME_STATE.getByName("game:test-state");
    expect((await state.getState()).revision).toBe(0);

    const created = await state.createNumber("admin@example.com", 42);
    expect(created.number).toBe(42);
    const updated = await state.getState();
    expect(updated.revision).toBe(1);
    expect(updated.numbers).toHaveLength(1);
    expect(updated.numbers[0]?.number).toBe(42);
  });
});

describe("admin authorization and mutations", () => {
  it("fails closed on a deployed host and scopes the development bypass to localhost", async () => {
    const wrongHost = await SELF.fetch("http://example.com/admin/api/state", {
      headers: LOCAL_ADMIN_HEADERS,
    });
    expect(wrongHost.status).toBe(503);

    const local = await SELF.fetch("http://localhost/admin/api/state", {
      headers: LOCAL_ADMIN_HEADERS,
    });
    expect(local.status).toBe(200);
  });

  it("runs an admin command and exposes its revision publicly", async () => {
    const { body, response } = await adminCommand<{ number: number }>({
      type: "createNumber",
      number: 55,
    });
    expect(response.status).toBe(200);
    expect(body.data.number).toBe(55);

    const state = await SELF.fetch("http://example.com/api/bingo/state");
    const publicState = await state.json<{ numbers: { number: number }[]; revision: number }>();
    expect(publicState.numbers).toContainEqual(expect.objectContaining({ number: 55 }));
    expect(publicState.revision).toBeGreaterThanOrEqual(1);
  });

  it("rejects invalid PITR preparation before invoking the remote-only storage API", async () => {
    const state = await SELF.fetch("http://localhost/admin/api/state", {
      headers: LOCAL_ADMIN_HEADERS,
    });
    const revision = (await state.json<DataEnvelope<{ revision: number }>>()).data.revision;
    const response = await SELF.fetch("http://localhost/admin/api/recovery/prepare", {
      method: "POST",
      headers: { ...LOCAL_ADMIN_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({
        targetTime: new Date(Date.now() + 60_000).toISOString(),
        expectedRevision: revision,
      }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringMatching(/過去30日以内/),
    });
  });

  it("freezes writes after PITR recovery is scheduled", async () => {
    const state = env.GAME_STATE.getByName("game");
    await state.getState();
    await runInDurableObject(state, async (_instance, ctx) => {
      ctx.storage.sql.exec(
        "INSERT OR REPLACE INTO game_metadata (key, value) VALUES ('pitr_pending_target', ?)",
        "0123456789abcdef",
      );
    });

    try {
      const { body, response } = await adminCommand<{ error: string }>({
        type: "incrementReach",
      });
      expect(response.status).toBe(409);
      expect(body).toMatchObject({ error: expect.stringMatching(/PITR recovery中/) });
    } finally {
      await runInDurableObject(state, async (_instance, ctx) => {
        ctx.storage.sql.exec(
          "DELETE FROM game_metadata WHERE key IN " +
            "('pitr_pending_target', 'pitr_pending_undo', 'pitr_pending_actor', 'pitr_pending_at')",
        );
      });
    }
  });

  it("atomically starts a new annual event without weakening the PITR boundary", async () => {
    const state = env.GAME_STATE.getByName("annual-reset");
    await state.createNumber("admin@example.com", 42);
    await state.createPrize("admin@example.com", "景品", "Prize");
    await state.saveSurveyState("admin@example.com", "https://example.com/survey", true);
    await state.recordPublicReach("a".repeat(64));
    const before = await state.getState();
    const pitrEarliestAt = await runInDurableObject(
      state,
      async (_instance, ctx) =>
        ctx.storage.sql
          .exec<{ value: string }>("SELECT value FROM game_metadata WHERE key = 'pitr_earliest_at'")
          .one().value,
    );

    await expect(
      state.startAnnualEvent(
        "admin@example.com",
        before.revision,
        before.appState.event_id,
        "2027-nutfes-bingo",
      ),
    ).resolves.toEqual({
      eventId: "2027-nutfes-bingo",
      revision: before.revision + 1,
    });

    const reset = await state.getState();
    expect(reset).toMatchObject({
      revision: before.revision + 1,
      numbers: [],
      prizes: [],
      latestReachLog: null,
      appState: {
        event_id: "2027-nutfes-bingo",
        survey_url: "",
        is_survey_active: false,
        reach_count: 0,
      },
    });
    await runInDurableObject(state, async (_instance, ctx) => {
      expect(
        ctx.storage.sql
          .exec<{ value: string }>("SELECT value FROM game_metadata WHERE key = 'pitr_earliest_at'")
          .one().value,
      ).toBe(pitrEarliestAt);
      expect(
        ctx.storage.sql
          .exec<{ value: string }>(
            "SELECT value FROM game_metadata WHERE key = 'reach_submission_count'",
          )
          .one().value,
      ).toBe("0");
      expect(
        ctx.storage.sql
          .exec<{ action: string }>("SELECT action FROM audit_log ORDER BY id")
          .toArray(),
      ).toEqual([{ action: "startAnnualEvent" }]);
    });

    await state.createNumber("admin@example.com", 9);
    const retryError = await runInDurableObject(state, async (instance) => {
      try {
        await instance.startAnnualEvent(
          "admin@example.com",
          before.revision,
          before.appState.event_id,
          "2027-nutfes-bingo",
        );
        return null;
      } catch (error) {
        return error instanceof Error ? error.message : String(error);
      }
    });
    expect(retryError).toMatch(/revision/);
    await expect(state.getState()).resolves.toMatchObject({
      numbers: [expect.objectContaining({ number: 9 })],
    });
  });

  it("does not expose removed generation and logical snapshot routes", async () => {
    for (const path of [
      "/admin/api/snapshots",
      "/admin/api/snapshots/restore",
      "/admin/api/generations/activate",
      "/admin/api/import",
    ]) {
      const response = await SELF.fetch(`http://localhost${path}`, {
        method: "POST",
        headers: { ...LOCAL_ADMIN_HEADERS, "Content-Type": "application/json" },
        body: "{}",
      });
      expect(response.status).toBe(404);
    }
  });
});

describe("R2 prize images", () => {
  it("validates, stores, and serves an immutable prize image", async () => {
    const pngBytes = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00,
    ]);
    const form = new FormData();
    form.set("file", new File([pngBytes], "prize.png", { type: "image/png" }));
    const upload = await SELF.fetch("http://localhost/admin/api/images", {
      method: "POST",
      headers: LOCAL_ADMIN_HEADERS,
      body: form,
    });
    expect(upload.status).toBe(201);
    const uploaded = await upload.json<DataEnvelope<{ image_path: string }>>();
    expect(uploaded.data.image_path).toMatch(/^prizes\/[a-f0-9]{64}\.png$/);
    expect(await env.PRIZE_IMAGES.head(uploaded.data.image_path)).not.toBeNull();

    const image = await SELF.fetch(
      `http://example.com/api/prize-images/${uploaded.data.image_path}`,
    );
    expect(image.status).toBe(200);
    expect(image.headers.get("cache-control")).toContain("immutable");
    const etag = image.headers.get("etag");
    expect(etag).toBeTruthy();

    const cached = await SELF.fetch(
      `http://example.com/api/prize-images/${uploaded.data.image_path}`,
      { headers: { "If-None-Match": etag ?? "" } },
    );
    expect(cached.status).toBe(304);

    await env.PRIZE_IMAGES.put(uploaded.data.image_path, new Uint8Array([1, 2, 3]));
    const corrupted = await SELF.fetch(
      `http://example.com/api/prize-images/${uploaded.data.image_path}`,
    );
    expect(corrupted.status).toBe(500);
    await expect(corrupted.json()).resolves.toMatchObject({
      error: expect.stringMatching(/整合性/),
    });
  });
});

describe("venue Screen authorization", () => {
  it("fails closed off localhost and allows the explicit local development bypass", async () => {
    const deployedScreenHtml = await SELF.fetch("http://example.com/screen");
    expect(deployedScreenHtml.status).toBe(503);

    const deployedHost = await SELF.fetch("http://example.com/screen/api/state");
    expect(deployedHost.status).toBe(503);

    const local = await SELF.fetch("http://localhost/screen/api/state");
    expect(local.status).toBe(200);
    await expect(local.json()).resolves.toMatchObject({
      appState: { event_id: "initial" },
    });
  });

  it("does not expose legacy Screen and reaction-consumer API routes", async () => {
    const legacyState = await SELF.fetch("http://example.com/api/bingo/screen");
    expect(legacyState.status).toBe(404);

    const legacyReactionSocket = await SELF.fetch("http://example.com/api/bingo/stamps/socket", {
      headers: { Upgrade: "websocket" },
    });
    expect(legacyReactionSocket.status).toBe(404);
  });
});

describe("Hibernation WebSockets", () => {
  it("sends the current state over the state socket", async () => {
    const response = await SELF.fetch("http://example.com/api/bingo/socket", {
      headers: { Upgrade: "websocket" },
    });
    expect(response.status).toBe(101);
    const socket = response.webSocket;
    expect(socket).not.toBeNull();
    socket?.accept();
    await expect(nextMessage(socket as WebSocket)).resolves.toMatchObject({
      type: "state",
      state: { appState: { event_id: "initial" } },
    });
    await closeSocket(socket as WebSocket);
  });

  it("routes the protected Screen socket explicitly and ignores the legacy view query", async () => {
    const publicSockets: WebSocket[] = [];
    try {
      for (let index = 0; index < 17; index += 1) {
        const publicResponse = await SELF.fetch("http://example.com/api/bingo/socket?view=screen", {
          headers: { Upgrade: "websocket" },
        });
        expect(publicResponse.status).toBe(101);
        const publicSocket = publicResponse.webSocket as WebSocket;
        publicSocket.accept();
        await expect(nextMessage(publicSocket)).resolves.toMatchObject({ type: "state" });
        publicSockets.push(publicSocket);
      }

      const screenResponse = await SELF.fetch("http://localhost/screen/api/socket", {
        headers: { Upgrade: "websocket" },
      });
      expect(screenResponse.status).toBe(101);
      const screenSocket = screenResponse.webSocket as WebSocket;
      screenSocket.accept();
      await expect(nextMessage(screenSocket)).resolves.toMatchObject({ type: "state" });
      await closeSocket(screenSocket);
    } finally {
      await Promise.all(publicSockets.map(closeSocket));
    }

    const protectedOnDeployedHost = await SELF.fetch("http://example.com/screen/api/socket", {
      headers: { Upgrade: "websocket" },
    });
    expect(protectedOnDeployedHost.status).toBe(503);
  });

  it("enforces the Screen state-socket cap and releases capacity after close", async () => {
    const sockets: WebSocket[] = [];
    try {
      for (let index = 0; index < 16; index += 1) {
        const response = await SELF.fetch("http://localhost/screen/api/socket", {
          headers: { Upgrade: "websocket" },
        });
        expect(response.status).toBe(101);
        const socket = response.webSocket as WebSocket;
        socket.accept();
        await expect(nextMessage(socket)).resolves.toMatchObject({ type: "state" });
        sockets.push(socket);
      }

      const rejected = await SELF.fetch("http://localhost/screen/api/socket", {
        headers: { Upgrade: "websocket" },
      });
      expect(rejected.status).toBe(503);
      expect(rejected.headers.get("retry-after")).toBe("30");

      await closeSocket(sockets.shift() as WebSocket);
      const resumed = await SELF.fetch("http://localhost/screen/api/socket", {
        headers: { Upgrade: "websocket" },
      });
      expect(resumed.status).toBe(101);
      const resumedSocket = resumed.webSocket as WebSocket;
      resumedSocket.accept();
      await expect(nextMessage(resumedSocket)).resolves.toMatchObject({ type: "state" });
      sockets.push(resumedSocket);
    } finally {
      await Promise.all(sockets.map(closeSocket));
    }
  });

  it("reserves state-socket capacity for Screen when the public pool is full", async () => {
    const state = env.GAME_STATE.getByName("screen-reserved-capacity");
    await state.getState();

    const statuses = await runInDurableObject(state, async (instance, ctx) => {
      for (let index = 0; index < 1_984; index += 1) {
        const pair = new WebSocketPair();
        ctx.acceptWebSocket(pair[1], ["state", "public"]);
      }
      try {
        const publicResponse = await instance.fetch(
          new Request("http://internal/api/bingo/socket", {
            headers: {
              Upgrade: "websocket",
              "X-Bingo-View": "public",
            },
          }),
        );
        const screenResponse = await instance.fetch(
          new Request("http://internal/screen/api/socket", {
            headers: {
              Upgrade: "websocket",
              "X-Bingo-View": "screen",
            },
          }),
        );
        return { public: publicResponse.status, screen: screenResponse.status };
      } finally {
        for (const socket of ctx.getWebSockets("state")) socket.close(1000, "test complete");
      }
    });

    expect(statuses).toEqual({ public: 503, screen: 101 });
  }, 20_000);

  it("hard-closes venue sockets after their authorization window", async () => {
    const stateResponse = await SELF.fetch("http://localhost/screen/api/socket", {
      headers: { Upgrade: "websocket" },
    });
    const stateSocket = stateResponse.webSocket as WebSocket;
    stateSocket.accept();
    await nextMessage(stateSocket);

    const reactionResponse = await SELF.fetch("http://localhost/screen/api/stamps/socket", {
      headers: { Upgrade: "websocket" },
    });
    const reactionSocket = reactionResponse.webSocket as WebSocket;
    reactionSocket.accept();
    await nextMessage(reactionSocket);

    const stateClose = nextClose(stateSocket);
    const reactionClose = nextClose(reactionSocket);
    const expiredAt = Date.now() - 1;
    const state = env.GAME_STATE.getByName("game");
    const reactions = env.REACTION_HUB.getByName("reactions");

    await runInDurableObject(state, async (_instance, ctx) => {
      expect(await ctx.storage.getAlarm()).not.toBeNull();
      for (const socket of ctx.getWebSockets("screen")) {
        const attachment = socket.deserializeAttachment() as Record<string, unknown>;
        socket.serializeAttachment({ ...attachment, expires_at: expiredAt });
      }
    });
    await runInDurableObject(reactions, async (_instance, ctx) => {
      expect(await ctx.storage.getAlarm()).not.toBeNull();
      for (const socket of ctx.getWebSockets("stamps")) {
        const attachment = socket.deserializeAttachment() as Record<string, unknown>;
        socket.serializeAttachment({ ...attachment, expires_at: expiredAt });
      }
    });

    await expect(runDurableObjectAlarm(state)).resolves.toBe(true);
    await expect(runDurableObjectAlarm(reactions)).resolves.toBe(true);
    await expect(stateClose).resolves.toMatchObject({ code: 1012 });
    await expect(reactionClose).resolves.toMatchObject({ code: 1012 });
  });

  it("broadcasts loss-tolerant stamps on the separate reaction socket", async () => {
    const response = await SELF.fetch("http://localhost/screen/api/stamps/socket", {
      headers: { Upgrade: "websocket" },
    });
    expect(response.status).toBe(101);
    const socket = response.webSocket as WebSocket;
    socket.accept();
    await expect(nextMessage(socket)).resolves.toMatchObject({
      type: "ready",
    });

    const stampMessage = nextMessage(socket);
    const stamp = await SELF.fetch("http://example.com/api/bingo/stamps", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://example.com" },
      body: JSON.stringify({ clientId: crypto.randomUUID(), stampName: "good" }),
    });
    expect(stamp.status).toBe(201);
    await expect(stampMessage).resolves.toMatchObject({
      type: "stamp",
      stamp: { name: "good" },
    });
    await closeSocket(socket);
  });

  it("rejects reaction sockets over capacity and accepts one after a close", async () => {
    const sockets: WebSocket[] = [];
    try {
      for (let index = 0; index < 16; index += 1) {
        const response = await SELF.fetch("http://localhost/screen/api/stamps/socket", {
          headers: { Upgrade: "websocket" },
        });
        expect(response.status).toBe(101);
        const socket = response.webSocket as WebSocket;
        socket.accept();
        await expect(nextMessage(socket)).resolves.toMatchObject({ type: "ready" });
        sockets.push(socket);
      }

      const rejected = await SELF.fetch("http://localhost/screen/api/stamps/socket", {
        headers: { Upgrade: "websocket" },
      });
      expect(rejected.status).toBe(503);
      expect(rejected.headers.get("retry-after")).toBe("30");

      await closeSocket(sockets.shift() as WebSocket);
      const resumed = await SELF.fetch("http://localhost/screen/api/stamps/socket", {
        headers: { Upgrade: "websocket" },
      });
      expect(resumed.status).toBe(101);
      const resumedSocket = resumed.webSocket as WebSocket;
      resumedSocket.accept();
      await expect(nextMessage(resumedSocket)).resolves.toMatchObject({ type: "ready" });
      sockets.push(resumedSocket);
    } finally {
      await Promise.all(sockets.map(closeSocket));
    }
  });
});
