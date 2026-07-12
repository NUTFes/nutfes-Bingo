import { SELF, env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import {
  bingoSnapshotSchema,
  reactionBatchSchema,
  serverEventSchema,
} from "../../src/shared/schemas";
import { readClientHash } from "../../src/worker/security";

const ORIGIN = "http://localhost:5173";
const ADMIN_HEADERS = {
  Origin: ORIGIN,
  Authorization: "Bearer local-admin",
  "Content-Type": "application/json",
};

async function admin(command: unknown): Promise<Response> {
  return SELF.fetch(`${ORIGIN}/api/admin/command`, {
    method: "POST",
    headers: ADMIN_HEADERS,
    body: JSON.stringify(command),
  });
}

async function sessionCookie(): Promise<string> {
  const response = await SELF.fetch(`${ORIGIN}/api/session`);
  const cookie = response.headers.get("Set-Cookie");
  if (!cookie) throw new Error("Session cookie missing");
  return cookie;
}

const acceptedSockets = new WeakSet<WebSocket>();

function socketFrom(response: Response): WebSocket {
  if (response.status !== 101 || !response.webSocket)
    throw new Error(`Expected WebSocket upgrade, got ${response.status}`);
  return response.webSocket;
}

function nextSocketData(socket: WebSocket): Promise<unknown> {
  const { promise, resolve, reject } = Promise.withResolvers<unknown>();
  socket.addEventListener(
    "message",
    (event) => {
      try {
        resolve(JSON.parse(String(event.data)));
      } catch (error) {
        reject(error);
      }
    },
    { once: true },
  );
  socket.addEventListener("error", () => reject(new Error("WebSocket failed")), { once: true });
  if (!acceptedSockets.has(socket)) {
    acceptedSockets.add(socket);
    socket.accept();
  }
  return promise;
}

describe("Worker HTTP and realtime API", () => {
  it("serves a snapshot and broadcasts number deltas to multiple clients", async () => {
    const cookie = await sessionCookie();
    const first = socketFrom(
      await SELF.fetch(`${ORIGIN}/api/ws`, {
        headers: { Upgrade: "websocket", Origin: ORIGIN, Cookie: cookie },
      }),
    );
    expect(bingoSnapshotSchema.parse(await nextSocketData(first)).version).toBe(0);
    const second = socketFrom(
      await SELF.fetch(`${ORIGIN}/api/ws`, {
        headers: { Upgrade: "websocket", Origin: ORIGIN, Cookie: cookie },
      }),
    );
    expect(bingoSnapshotSchema.parse(await nextSocketData(second)).version).toBe(0);

    const firstDelta = nextSocketData(first);
    const secondDelta = nextSocketData(second);
    const response = await admin({ type: "number.add", number: 15 });
    expect(response.status).toBe(200);
    expect(serverEventSchema.parse(await firstDelta)).toMatchObject({
      type: "number.added",
      version: 1,
    });
    expect(serverEventSchema.parse(await secondDelta)).toMatchObject({
      type: "number.added",
      version: 1,
    });
    expect((await admin({ type: "number.add", number: 15 })).status).toBe(409);
    expect((await admin({ type: "number.add", number: 100 })).status).toBe(400);
    first.close();
    second.close();
  });

  it("reconnects from the last version and sends a snapshot when history cannot match", async () => {
    const cookie = await sessionCookie();
    const initial = bingoSnapshotSchema.parse(
      await (await SELF.fetch(`${ORIGIN}/api/state`)).json(),
    );
    await admin({ type: "number.add", number: 42 });
    const resumed = socketFrom(
      await SELF.fetch(`${ORIGIN}/api/ws?lastVersion=${initial.version}`, {
        headers: { Upgrade: "websocket", Origin: ORIGIN, Cookie: cookie },
      }),
    );
    expect(serverEventSchema.parse(await nextSocketData(resumed)).type).toBe("number.added");
    resumed.close();

    const mismatched = socketFrom(
      await SELF.fetch(`${ORIGIN}/api/ws?lastVersion=9999`, {
        headers: { Upgrade: "websocket", Origin: ORIGIN, Cookie: cookie },
      }),
    );
    expect(bingoSnapshotSchema.parse(await nextSocketData(mismatched)).latestNumber).toBe(42);
    mismatched.close();
  });

  it("creates a signed session and deduplicates reach submissions", async () => {
    const session = await SELF.fetch(`${ORIGIN}/api/session`);
    const cookie = session.headers.get("Set-Cookie");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    if (!cookie) throw new Error("Session cookie missing");
    const first = await SELF.fetch(`${ORIGIN}/api/reach`, {
      method: "POST",
      headers: { Origin: ORIGIN, Cookie: cookie },
    });
    const second = await SELF.fetch(`${ORIGIN}/api/reach`, {
      method: "POST",
      headers: { Origin: ORIGIN, Cookie: cookie },
    });
    expect(await first.json()).toEqual({ accepted: true, count: 1 });
    expect(await second.json()).toEqual({ accepted: false, count: 1 });
  });

  it("uploads, serves, and deletes a validated R2 prize image", async () => {
    const form = new FormData();
    form.set("nameJa", "景品");
    form.set("nameEn", "Prize");
    form.set("isWon", "false");
    form.set(
      "image",
      new File([Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)], "ignored.png", {
        type: "image/png",
      }),
    );
    const createdResponse = await SELF.fetch(`${ORIGIN}/api/admin/prizes`, {
      method: "POST",
      headers: { Origin: ORIGIN, Authorization: "Bearer local-admin" },
      body: form,
    });
    expect(createdResponse.status).toBe(201);
    const created = bingoSnapshotSchema.parse(await createdResponse.json());
    const prize = created.prizes[0];
    if (!prize?.imageUrl) throw new Error("Prize image URL missing");
    const image = await SELF.fetch(`${ORIGIN}${prize.imageUrl}`);
    expect(image.status).toBe(200);
    expect(image.headers.get("Content-Type")).toBe("image/png");

    const deleted = await SELF.fetch(`${ORIGIN}/api/admin/prizes/${prize.id}`, {
      method: "DELETE",
      headers: { Origin: ORIGIN, Authorization: "Bearer local-admin" },
    });
    expect(deleted.status).toBe(200);
    expect((await env.PRIZE_IMAGES.list()).objects).toHaveLength(0);
  });
  it("removes every prize image during event initialization", async () => {
    const form = new FormData();
    form.set("nameJa", "初期化景品");
    form.set("nameEn", "Reset prize");
    form.set("isWon", "false");
    form.set(
      "image",
      new File([Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)], "reset.png", {
        type: "image/png",
      }),
    );
    const created = await SELF.fetch(`${ORIGIN}/api/admin/prizes`, {
      method: "POST",
      headers: { Origin: ORIGIN, Authorization: "Bearer local-admin" },
      body: form,
    });
    expect(created.status).toBe(201);
    const initialized = await admin({ type: "event.initialize" });
    expect(initialized.status).toBe(200);
    expect(bingoSnapshotSchema.parse(await initialized.json()).prizes).toEqual([]);
    expect((await env.PRIZE_IMAGES.list()).objects).toHaveLength(0);
  });

  it("shards reactions and rate-limits a client on the server", async () => {
    const session = await SELF.fetch(`${ORIGIN}/api/session`);
    const cookie = session.headers.get("Set-Cookie");
    if (!cookie) throw new Error("Session cookie missing");
    const clientHash = await readClientHash(
      new Request(ORIGIN, { headers: { Cookie: cookie } }),
      env.COOKIE_SIGNING_SECRET,
    );
    if (!clientHash) throw new Error("Signed client hash missing");
    const shard = Number.parseInt(clientHash.slice(0, 8), 16) % Number(env.REACTION_SHARDS);
    const screen = socketFrom(
      await SELF.fetch(`${ORIGIN}/api/reactions/ws?role=screen&shard=${shard}`, {
        headers: { Upgrade: "websocket", Origin: ORIGIN, Cookie: cookie },
      }),
    );
    const client = socketFrom(
      await SELF.fetch(`${ORIGIN}/api/reactions/ws?role=client`, {
        headers: { Upgrade: "websocket", Origin: ORIGIN, Cookie: cookie },
      }),
    );

    const batch = nextSocketData(screen);
    const accepted = nextSocketData(client);
    client.send(JSON.stringify({ type: "reaction", name: "heart" }));
    expect(reactionBatchSchema.parse(await batch).reactions[0]?.name).toBe("heart");
    expect(await accepted).toMatchObject({ type: "reaction.accepted" });

    const rejected = nextSocketData(client);
    client.send(JSON.stringify({ type: "reaction", name: "smile" }));
    expect(await rejected).toMatchObject({ type: "error", code: "reaction_rejected" });
    client.close();
    screen.close();
  });

  it("detects concurrent image updates and cleans the losing upload", async () => {
    await admin({ type: "event.initialize" });
    const createForm = new FormData();
    createForm.set("nameJa", "競合景品");
    createForm.set("nameEn", "Concurrent prize");
    createForm.set("isWon", "false");
    const createdResponse = await SELF.fetch(`${ORIGIN}/api/admin/prizes`, {
      method: "POST",
      headers: { Origin: ORIGIN, Authorization: "Bearer local-admin" },
      body: createForm,
    });
    const created = bingoSnapshotSchema.parse(await createdResponse.json());
    const id = created.prizes[0]!.id;
    const updateForm = (filename: string) => {
      const form = new FormData();
      form.set("nameJa", "競合景品");
      form.set("nameEn", "Concurrent prize");
      form.set("isWon", "false");
      form.set(
        "image",
        new File([Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)], filename, {
          type: "image/png",
        }),
      );
      return form;
    };

    const responses = await Promise.all([
      SELF.fetch(`${ORIGIN}/api/admin/prizes/${id}`, {
        method: "PUT",
        headers: { Origin: ORIGIN, Authorization: "Bearer local-admin" },
        body: updateForm("first.png"),
      }),
      SELF.fetch(`${ORIGIN}/api/admin/prizes/${id}`, {
        method: "PUT",
        headers: { Origin: ORIGIN, Authorization: "Bearer local-admin" },
        body: updateForm("second.png"),
      }),
    ]);
    expect(responses.map(({ status }) => status).toSorted()).toEqual([200, 409]);
    const objects = (await env.PRIZE_IMAGES.list()).objects;
    expect(objects).toHaveLength(1);
    const state = bingoSnapshotSchema.parse(await (await SELF.fetch(`${ORIGIN}/api/state`)).json());
    expect(state.prizes[0]?.imageKey).toBe(objects[0]?.key);
  });

  it("keeps a newly uploaded image out of R2 when the Durable Object rejects the command", async () => {
    await admin({ type: "event.initialize" });
    await admin({ type: "flags.update", flags: { readOnlyMode: true } });
    const form = new FormData();
    form.set("nameJa", "失敗景品");
    form.set("nameEn", "Rejected prize");
    form.set("isWon", "false");
    form.set(
      "image",
      new File([Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)], "rejected.png", {
        type: "image/png",
      }),
    );
    const response = await SELF.fetch(`${ORIGIN}/api/admin/prizes`, {
      method: "POST",
      headers: { Origin: ORIGIN, Authorization: "Bearer local-admin" },
      body: form,
    });
    expect(response.status).toBe(503);
    expect((await env.PRIZE_IMAGES.list()).objects).toHaveLength(0);
    await admin({ type: "flags.update", flags: { readOnlyMode: false } });
  });

  it("broadcasts a complete initialized snapshot and reconnects with a full snapshot", async () => {
    await admin({ type: "event.initialize" });
    const cookie = await sessionCookie();
    const socket = socketFrom(
      await SELF.fetch(`${ORIGIN}/api/ws`, {
        headers: { Upgrade: "websocket", Origin: ORIGIN, Cookie: cookie },
      }),
    );
    await nextSocketData(socket);
    const added = nextSocketData(socket);
    await admin({ type: "number.add", number: 77 });
    await added;

    const initializedMessage = nextSocketData(socket);
    const initializedResponse = await admin({ type: "event.initialize" });
    const initialized = serverEventSchema.parse(await initializedMessage);
    expect(initialized.type).toBe("event.initialized");
    expect(bingoSnapshotSchema.parse(initialized.payload)).toEqual(
      bingoSnapshotSchema.parse(await initializedResponse.json()),
    );
    socket.close();

    const reconnected = socketFrom(
      await SELF.fetch(`${ORIGIN}/api/ws`, {
        headers: { Upgrade: "websocket", Origin: ORIGIN, Cookie: cookie },
      }),
    );
    expect(bingoSnapshotSchema.parse(await nextSocketData(reconnected)).numbers).toEqual([]);
    reconnected.close();
  });

  it("rejects reactions while read-only mode is active", async () => {
    await admin({ type: "event.initialize" });
    await admin({ type: "flags.update", flags: { readOnlyMode: true } });
    const cookie = await sessionCookie();
    const client = socketFrom(
      await SELF.fetch(`${ORIGIN}/api/reactions/ws?role=client`, {
        headers: { Upgrade: "websocket", Origin: ORIGIN, Cookie: cookie },
      }),
    );
    const rejected = nextSocketData(client);
    client.send(JSON.stringify({ type: "reaction", name: "heart" }));
    expect(await rejected).toMatchObject({
      type: "error",
      code: "reaction_rejected",
      message: "Reactions are disabled",
    });
    client.close();
    await admin({ type: "flags.update", flags: { readOnlyMode: false } });
  });

  it("returns explicit errors for invalid origin, role, authentication, and missing resources", async () => {
    const cookie = await sessionCookie();
    expect(
      (
        await SELF.fetch(`${ORIGIN}/api/reach`, {
          method: "POST",
          headers: { Origin: "https://attacker.example", Cookie: cookie },
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await SELF.fetch(`${ORIGIN}/api/reactions/ws?role=administrator`, {
          headers: { Upgrade: "websocket", Origin: ORIGIN, Cookie: cookie },
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await SELF.fetch(`${ORIGIN}/api/admin/command`, {
          method: "POST",
          headers: { Origin: ORIGIN, "Content-Type": "application/json" },
          body: JSON.stringify({ type: "number.add", number: 1 }),
        })
      ).status,
    ).toBe(403);
    expect((await admin({ type: "number.update", id: 999_999, number: 1 })).status).toBe(404);
  });

  it("requires a signed session for the public Bingo WebSocket", async () => {
    const response = await SELF.fetch(`${ORIGIN}/api/ws`, {
      headers: { Upgrade: "websocket", Origin: ORIGIN },
    });
    expect(response.status).toBe(401);
  });

  it("enforces the BingoRoom WebSocket connection limit", async () => {
    const room = env.BINGO_ROOM.getByName("integration-connection-limit-room");
    const sockets: WebSocket[] = [];
    for (let index = 0; index < 1_000; index += 1) {
      const response = await room.fetch(
        new Request(`${ORIGIN}/api/ws`, {
          headers: { Upgrade: "websocket", "x-client-hash": "a".repeat(64) },
        }),
      );
      expect(response.status).toBe(101);
      if (!response.webSocket) throw new Error("WebSocket missing from accepted response");
      response.webSocket.accept();
      sockets.push(response.webSocket);
    }
    const overflow = await room.fetch(
      new Request(`${ORIGIN}/api/ws`, {
        headers: { Upgrade: "websocket", "x-client-hash": "b".repeat(64) },
      }),
    );
    expect(overflow.status).toBe(429);
    for (const socket of sockets) socket.close();
  });
});
