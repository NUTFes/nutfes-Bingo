import type { AdminCommand } from "../shared/protocol";
import { adminCommandSchema } from "../shared/schemas";
import { ValidationError, requirePositiveId, requirePrizeName } from "../shared/validation";
import { BingoRoom } from "./bingo-room";
import { uploadPrizeImage } from "./images";
import { ReactionRoom } from "./reaction-room";
import { createClientCookie, readClientHash, requireAdmin, requireSameOrigin } from "./security";

export { BingoRoom, ReactionRoom };

const MAX_JSON_BYTES = 16 * 1024;
const MAX_PRIZE_FORM_BYTES = 2 * 1024 * 1024 + 64 * 1024;

function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(data), { ...init, headers });
}

function eventId(env: Env): string {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(env.EVENT_ID)) throw new Error("EVENT_ID is invalid");
  return env.EVENT_ID;
}

function shardCount(env: Env): number {
  const count = Number(env.REACTION_SHARDS);
  if (!Number.isInteger(count) || count < 1 || count > 16)
    throw new Error("REACTION_SHARDS must be from 1 to 16");
  return count;
}

function bingoRoom(env: Env): DurableObjectStub<BingoRoom> {
  return env.BINGO_ROOM.getByName(`bingo-room:${eventId(env)}`);
}

async function readJsonCommand(request: Request): Promise<AdminCommand> {
  const declaredLength = Number(request.headers.get("Content-Length") ?? 0);
  if (declaredLength > MAX_JSON_BYTES) throw new ValidationError("Request body is too large");
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_JSON_BYTES)
    throw new ValidationError("Request body is too large");
  try {
    return adminCommandSchema.parse(JSON.parse(text));
  } catch {
    throw new ValidationError("Request body must contain a valid admin command");
  }
}

async function handleSession(request: Request, env: Env): Promise<Response> {
  const existing = await readClientHash(request, env.COOKIE_SIGNING_SECRET);
  if (existing)
    return json({ ready: true, eventId: eventId(env), reactionShards: shardCount(env) });
  const identity = await createClientCookie(env.COOKIE_SIGNING_SECRET);
  const response = json({ ready: true, eventId: eventId(env), reactionShards: shardCount(env) });
  response.headers.append("Set-Cookie", identity.cookie);
  return response;
}

async function handleBingoSocket(request: Request, env: Env): Promise<Response> {
  requireSameOrigin(request, env);
  return bingoRoom(env).fetch(request);
}

async function handleReactionSocket(request: Request, env: Env): Promise<Response> {
  requireSameOrigin(request, env);
  const url = new URL(request.url);
  const role = url.searchParams.get("role") === "screen" ? "screen" : "client";
  const count = shardCount(env);
  let targetShard: number;
  const headers = new Headers(request.headers);
  if (role === "screen") {
    targetShard = Number(url.searchParams.get("shard"));
    if (!Number.isInteger(targetShard) || targetShard < 0 || targetShard >= count) {
      throw new ValidationError("Reaction shard is invalid");
    }
  } else {
    const clientHash = await readClientHash(request, env.COOKIE_SIGNING_SECRET);
    if (!clientHash) throw new Error("Client session is missing or invalid");
    targetShard = Number.parseInt(clientHash.slice(0, 8), 16) % count;
    headers.set("x-client-hash", clientHash);
  }
  return env.REACTION_ROOM.getByName(`reaction-room:${eventId(env)}:${targetShard}`).fetch(
    new Request(request, { headers }),
  );
}

async function handleReach(request: Request, env: Env): Promise<Response> {
  requireSameOrigin(request, env);
  const clientHash = await readClientHash(request, env.COOKIE_SIGNING_SECRET);
  if (!clientHash) return json({ error: "Client session is missing or invalid" }, { status: 401 });
  return json(await bingoRoom(env).submitReach(clientHash));
}

async function handleAdminCommand(request: Request, env: Env): Promise<Response> {
  requireSameOrigin(request, env);
  await requireAdmin(request, env);
  const command = await readJsonCommand(request);
  if (
    command.type === "prize.create" ||
    command.type === "prize.update" ||
    command.type === "prize.delete"
  ) {
    throw new ValidationError(
      "Prize create, update, and delete must use the image lifecycle endpoint",
    );
  }
  const imageKeysToDelete =
    command.type === "event.initialize"
      ? (await bingoRoom(env).getSnapshot()).prizes.flatMap((prize) =>
          prize.imageKey ? [prize.imageKey] : [],
        )
      : [];
  if (command.type === "number.add" || command.type === "number.update") {
    const current = await bingoRoom(env).getSnapshot();
    const duplicate = current.numbers.some(
      (item) =>
        item.number === command.number && (command.type === "number.add" || item.id !== command.id),
    );
    if (duplicate) throw new Error("duplicate number");
  }
  const snapshot = await bingoRoom(env).admin(command);
  if (imageKeysToDelete.length > 0) await env.PRIZE_IMAGES.delete(imageKeysToDelete);
  if (command.type === "event.initialize") {
    const resets: Promise<void>[] = [];
    for (let shard = 0; shard < shardCount(env); shard += 1) {
      resets.push(
        env.REACTION_ROOM.getByName(`reaction-room:${eventId(env)}:${shard}`).resetEvent(),
      );
    }
    await Promise.all(resets);
  }
  if (command.type === "flags.update" && command.flags.reactionsEnabled !== undefined) {
    const updates: Promise<void>[] = [];
    for (let shard = 0; shard < shardCount(env); shard += 1) {
      updates.push(
        env.REACTION_ROOM.getByName(`reaction-room:${eventId(env)}:${shard}`).setEnabled(
          command.flags.reactionsEnabled,
        ),
      );
    }
    await Promise.all(updates);
  }
  return json(snapshot);
}

function requirePrizeFormSize(request: Request): void {
  const value = request.headers.get("Content-Length");
  if (value === null) return;
  const bytes = Number(value);
  if (!Number.isInteger(bytes) || bytes < 0 || bytes > MAX_PRIZE_FORM_BYTES) {
    throw new ValidationError("Prize form is too large");
  }
}

function readPrizeForm(form: FormData): {
  nameJa: string;
  nameEn: string;
  isWon: boolean;
  file: File | null;
} {
  const nameJa = requirePrizeName(form.get("nameJa"), "Japanese prize name");
  const nameEn = requirePrizeName(form.get("nameEn"), "English prize name");
  const fileEntry = form.get("image");
  return {
    nameJa,
    nameEn,
    isWon: form.get("isWon") === "true",
    file: fileEntry instanceof File && fileEntry.size > 0 ? fileEntry : null,
  };
}

async function handlePrizeCreate(request: Request, env: Env): Promise<Response> {
  requireSameOrigin(request, env);
  await requireAdmin(request, env);
  requirePrizeFormSize(request);
  const form = readPrizeForm(await request.formData());
  let imageKey: string | null = null;
  try {
    if (form.file) imageKey = await uploadPrizeImage(form.file, env.PRIZE_IMAGES);
    const snapshot = await bingoRoom(env).admin({
      type: "prize.create",
      prize: {
        nameJa: form.nameJa,
        nameEn: form.nameEn,
        imageKey,
        imageUrl: null,
        isWon: form.isWon,
      },
    });
    return json(snapshot, { status: 201 });
  } catch (error) {
    if (imageKey) await env.PRIZE_IMAGES.delete(imageKey);
    throw error;
  }
}

async function handlePrizeUpdate(request: Request, env: Env, id: number): Promise<Response> {
  requireSameOrigin(request, env);
  await requireAdmin(request, env);
  requirePrizeFormSize(request);
  const current = await bingoRoom(env).getPrize(id);
  if (!current) return json({ error: "Prize not found" }, { status: 404 });
  const form = readPrizeForm(await request.formData());
  let uploadedKey: string | null = null;
  try {
    if (form.file) uploadedKey = await uploadPrizeImage(form.file, env.PRIZE_IMAGES);
    const imageKey = uploadedKey ?? current.imageKey;
    const snapshot = await bingoRoom(env).admin({
      type: "prize.update",
      id,
      prize: {
        nameJa: form.nameJa,
        nameEn: form.nameEn,
        imageKey,
        imageUrl: null,
        isWon: form.isWon,
      },
    });
    if (uploadedKey && current.imageKey) await env.PRIZE_IMAGES.delete(current.imageKey);
    return json(snapshot);
  } catch (error) {
    if (uploadedKey) await env.PRIZE_IMAGES.delete(uploadedKey);
    throw error;
  }
}

async function handlePrizeDelete(request: Request, env: Env, id: number): Promise<Response> {
  requireSameOrigin(request, env);
  await requireAdmin(request, env);
  const current = await bingoRoom(env).getPrize(id);
  if (!current) return json({ error: "Prize not found" }, { status: 404 });
  const snapshot = await bingoRoom(env).admin({ type: "prize.delete", id });
  if (current.imageKey) await env.PRIZE_IMAGES.delete(current.imageKey);
  return json(snapshot);
}

async function handlePrizeImage(pathname: string, env: Env): Promise<Response> {
  const encoded = pathname.slice("/api/prize-images/".length);
  let key: string;
  try {
    key = decodeURIComponent(encoded);
  } catch {
    return new Response("Invalid image key", { status: 400 });
  }
  if (!/^prizes\/[0-9a-f-]+\.(jpg|png|webp)$/.test(key))
    return new Response("Not found", { status: 404 });
  const object = await env.PRIZE_IMAGES.get(key);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("ETag", object.httpEtag);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(object.body, { headers });
}

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const { pathname } = url;
  if (pathname === "/api/health" && request.method === "GET") return json({ ok: true });
  if (pathname === "/api/session" && request.method === "GET") return handleSession(request, env);
  if (pathname === "/api/state" && request.method === "GET")
    return json(await bingoRoom(env).getSnapshot());
  if (pathname === "/api/ws" && request.method === "GET") return handleBingoSocket(request, env);
  if (pathname === "/api/reactions/ws" && request.method === "GET")
    return handleReactionSocket(request, env);
  if (pathname === "/api/reach" && request.method === "POST") return handleReach(request, env);
  if (pathname === "/api/admin/session" && request.method === "GET") {
    await requireAdmin(request, env);
    return json({ authenticated: true });
  }
  if (pathname === "/api/admin/command" && request.method === "POST")
    return handleAdminCommand(request, env);
  if (pathname === "/api/admin/prizes" && request.method === "POST")
    return handlePrizeCreate(request, env);
  const prizeMatch = pathname.match(/^\/api\/admin\/prizes\/(\d+)$/);
  if (prizeMatch) {
    const id = requirePositiveId(Number(prizeMatch[1]));
    if (request.method === "PUT") return handlePrizeUpdate(request, env, id);
    if (request.method === "DELETE") return handlePrizeDelete(request, env, id);
  }
  if (pathname.startsWith("/api/prize-images/") && request.method === "GET")
    return handlePrizeImage(pathname, env);
  return json({ error: "Not found" }, { status: 404 });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await route(request, env);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error";
      const status =
        error instanceof ValidationError
          ? 400
          : /Unauthorized|Access|JWT/i.test(message)
            ? 403
            : /missing or invalid|session/i.test(message)
              ? 401
              : /UNIQUE|duplicate/i.test(message)
                ? 409
                : /disabled|read.only/i.test(message)
                  ? 503
                  : 500;
      console.error(
        JSON.stringify({
          event: "request.failed",
          path: new URL(request.url).pathname,
          status,
          message,
        }),
      );
      return json({ error: message }, { status });
    }
  },
} satisfies ExportedHandler<Env>;
