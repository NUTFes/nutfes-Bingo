import { env, runDurableObjectAlarm, runInDurableObject, SELF } from "cloudflare:test";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TURNSTILE_ACTION } from "../worker/turnstile";

type DataEnvelope<T> = { data: T };

const LOCAL_ADMIN_HEADERS = {
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
      generation: "initial",
      revision: 0,
    });
  });

  it("returns an ETag and a 304 for an unchanged state", async () => {
    const initial = await SELF.fetch("http://example.com/api/bingo/state");
    expect(initial.status).toBe(200);
    const etag = initial.headers.get("etag");
    expect(etag).toBe('"initial:0"');

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
      headers: { "Content-Type": "application/json" },
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
      headers: { "Content-Type": "application/json" },
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
    expect(siteverify).toHaveBeenCalledTimes(2);
  });

  it("rejects a missing or failed Turnstile challenge without mutating game state", async () => {
    const beforeResponse = await SELF.fetch("http://example.com/api/bingo/state");
    const before = await beforeResponse.json<{ revision: number }>();

    const missing = await SELF.fetch("http://example.com/api/bingo/reach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
      headers: { "Content-Type": "application/json" },
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
    expect((await state.getState("test-state")).revision).toBe(0);

    const created = await state.createNumber("test-state", "admin@example.com", 42);
    expect(created.number).toBe(42);
    const updated = await state.getState("test-state");
    expect(updated.revision).toBe(1);
    expect(updated.numbers).toHaveLength(1);
    expect(updated.numbers[0]?.number).toBe(42);
  });

  it("keeps the active generation pointer separate from game state", async () => {
    const directory = env.GAME_DIRECTORY.getByName("active");
    const target = env.GAME_STATE.getByName("game:next-generation");
    await target.getState("next-generation");

    const activation = await directory.activateGeneration("next-generation", "admin@example.com");
    expect(activation).toMatchObject({
      generation: "next-generation",
      previousGeneration: "initial",
    });
    expect((await directory.getStatus()).generation).toBe("next-generation");

    const rollback = await directory.activateGeneration("initial", "admin@example.com");
    expect(rollback).toMatchObject({
      generation: "initial",
      previousGeneration: "next-generation",
    });
    expect((await directory.getStatus()).generation).toBe("initial");
  });

  it("ignores a stale redirect after a generation is reactivated", async () => {
    const generation = "activation-race";
    const state = env.GAME_STATE.getByName(`game:${generation}`);
    await state.getState(generation);

    await state.prepareActivation(generation, "activation-token-1");
    expect(await state.redirectClients(generation, "race-successor", "activation-token-1")).toBe(0);
    const retiredError = await runInDurableObject(state, async (instance) => {
      try {
        await instance.getState(generation);
        return null;
      } catch (error) {
        return error instanceof Error ? error.message : String(error);
      }
    });
    expect(retiredError).toMatch(/切り替え済み/);

    await state.prepareActivation(generation, "activation-token-2");
    await expect(state.getState(generation)).resolves.toMatchObject({ generation });

    expect(await state.redirectClients(generation, "race-successor", "activation-token-1")).toBe(0);
    await expect(state.getState(generation)).resolves.toMatchObject({ generation });
  });

  it("fences writes before a generation pointer can move and can safely unfreeze", async () => {
    const generation = "write-fence";
    const state = env.GAME_STATE.getByName(`game:${generation}`);
    await state.getState(generation);
    await state.prepareActivation(generation, "write-fence-token");
    await state.freezeWrites(generation, "write-fence-next", "write-fence-token");

    const fencedError = await runInDurableObject(state, async (instance) => {
      try {
        await instance.createNumber(generation, "admin@example.com", 41);
        return null;
      } catch (error) {
        return error instanceof Error ? error.message : String(error);
      }
    });
    expect(fencedError).toMatch(/切り替え済み/);

    await state.unfreezeWrites(generation, "write-fence-token");
    await expect(state.createNumber(generation, "admin@example.com", 41)).resolves.toMatchObject({
      number: 41,
    });
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

  it("rejects a generation switch when the expected directory version is stale", async () => {
    const health = await SELF.fetch("http://localhost/api/health");
    const status = await health.json<{ directoryVersion: number; generation: string }>();
    const response = await SELF.fetch("http://localhost/admin/api/generations/activate", {
      method: "POST",
      headers: { ...LOCAL_ADMIN_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({
        generation: status.generation,
        expectedGeneration: status.generation,
        expectedVersion: status.directoryVersion + 1,
      }),
    });

    expect(response.status).toBe(409);
  });
});

describe("R2 images and logical snapshots", () => {
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
  });

  it("creates an R2 snapshot, restores a new generation, and rolls back by pointer", async () => {
    const command = await adminCommand({ type: "createNumber", number: 73 });
    expect(command.response.status).toBe(200);

    const snapshotResponse = await SELF.fetch("http://localhost/admin/api/snapshots", {
      method: "POST",
      headers: LOCAL_ADMIN_HEADERS,
    });
    expect(snapshotResponse.status).toBe(201);
    const snapshot = await snapshotResponse.json<DataEnvelope<{ key: string }>>();
    expect(await env.GAME_BACKUPS.head(snapshot.data.key)).not.toBeNull();

    const restore = await SELF.fetch("http://localhost/admin/api/snapshots/restore", {
      method: "POST",
      headers: { ...LOCAL_ADMIN_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ key: snapshot.data.key, generation: "restored-test" }),
    });
    expect(restore.status).toBe(201);
    await expect(restore.json()).resolves.toMatchObject({
      data: { activated: true, generation: "restored-test" },
    });

    const restoredState = await SELF.fetch("http://example.com/api/bingo/state");
    await expect(restoredState.json()).resolves.toMatchObject({
      generation: "restored-test",
      numbers: expect.arrayContaining([expect.objectContaining({ number: 73 })]),
    });

    const rollback = await SELF.fetch("http://localhost/admin/api/generations/activate", {
      method: "POST",
      headers: { ...LOCAL_ADMIN_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ generation: "initial" }),
    });
    expect(rollback.status).toBe(200);
    const rolledBackState = await SELF.fetch("http://example.com/api/bingo/state");
    await expect(rolledBackState.json()).resolves.toMatchObject({ generation: "initial" });
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
    await expect(local.json()).resolves.toMatchObject({ generation: "initial" });
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
      state: { generation: "initial" },
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
    const generation = "screen-reserved-capacity";
    const state = env.GAME_STATE.getByName(`game:${generation}`);
    await state.getState(generation);

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
              "X-Bingo-Generation": generation,
              "X-Bingo-View": "public",
            },
          }),
        );
        const screenResponse = await instance.fetch(
          new Request("http://internal/screen/api/socket", {
            headers: {
              Upgrade: "websocket",
              "X-Bingo-Generation": generation,
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
    const stateMessage = await nextMessage(stateSocket);

    const reactionResponse = await SELF.fetch("http://localhost/screen/api/stamps/socket", {
      headers: { Upgrade: "websocket" },
    });
    const reactionSocket = reactionResponse.webSocket as WebSocket;
    reactionSocket.accept();
    await nextMessage(reactionSocket);

    const stateClose = nextClose(stateSocket);
    const reactionClose = nextClose(reactionSocket);
    const expiredAt = new Date(Date.now() - 31 * 60 * 1_000).toISOString();
    const generation = (stateMessage.state as { generation: string }).generation;
    const state = env.GAME_STATE.getByName(`game:${generation}`);
    const reactions = env.REACTION_HUB.getByName("reactions");

    await runInDurableObject(state, async (_instance, ctx) => {
      expect(await ctx.storage.getAlarm()).not.toBeNull();
      for (const socket of ctx.getWebSockets("screen")) {
        const attachment = socket.deserializeAttachment() as Record<string, unknown>;
        socket.serializeAttachment({ ...attachment, connected_at: expiredAt });
      }
    });
    await runInDurableObject(reactions, async (_instance, ctx) => {
      expect(await ctx.storage.getAlarm()).not.toBeNull();
      for (const socket of ctx.getWebSockets("stamps")) {
        const attachment = socket.deserializeAttachment() as Record<string, unknown>;
        socket.serializeAttachment({ ...attachment, connected_at: expiredAt });
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
      headers: { "Content-Type": "application/json" },
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
