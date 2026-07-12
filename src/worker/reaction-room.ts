import { DurableObject } from "cloudflare:workers";

import type { ReactionEvent } from "../shared/protocol";
import { reactionClientMessageSchema } from "../shared/schemas";

const CLIENT_COOLDOWN_MS = 10_000;
const MAX_REACTIONS_PER_SECOND = 100;
const MAX_REACTIONS_PER_EVENT = 16_000;
const MAX_MESSAGE_BYTES = 4096;
const MAX_CLIENT_CONNECTIONS = 500;
const MAX_SCREEN_CONNECTIONS = 32;

type ReactionAttachment =
  | { role: "client"; clientHash: string; invalidMessages: number }
  | { role: "screen"; clientHash: null; invalidMessages: number };

export class ReactionRoom extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS reaction_rate_limits (
        client_hash TEXT PRIMARY KEY,
        last_sent_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS global_rate_limits (
        second_bucket INTEGER PRIMARY KEY,
        reaction_count INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS reaction_config (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
        version INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS reaction_budget (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        accepted_count INTEGER NOT NULL DEFAULT 0 CHECK (accepted_count >= 0)
      );
      INSERT OR IGNORE INTO reaction_config (id, enabled) VALUES (1, 1);
      INSERT OR IGNORE INTO reaction_budget (id, accepted_count) VALUES (1, 0);
    `);
    const configColumns = this.ctx.storage.sql
      .exec<{ name: string }>("PRAGMA table_info(reaction_config)")
      .toArray();
    if (!configColumns.some(({ name }) => name === "version")) {
      this.ctx.storage.sql.exec(
        "ALTER TABLE reaction_config ADD COLUMN version INTEGER NOT NULL DEFAULT 0",
      );
    }
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("WebSocket upgrade required", { status: 426 });
    }
    const url = new URL(request.url);
    const roleValue = url.searchParams.get("role");
    if (roleValue !== "client" && roleValue !== "screen") {
      return new Response("Reaction role is invalid", { status: 400 });
    }
    const role = roleValue;
    const connectionLimit = role === "client" ? MAX_CLIENT_CONNECTIONS : MAX_SCREEN_CONNECTIONS;
    if (this.ctx.getWebSockets(role).length >= connectionLimit) {
      return new Response("Reaction connection limit reached", { status: 429 });
    }
    const clientHash = request.headers.get("x-client-hash");
    let attachment: ReactionAttachment;
    if (role === "client") {
      if (!clientHash || !/^[a-f0-9]{64}$/.test(clientHash)) {
        return new Response("Valid client identity required", { status: 401 });
      }
      attachment = { role, clientHash, invalidMessages: 0 };
    } else {
      attachment = { role, clientHash: null, invalidMessages: 0 };
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    if (!client || !server) throw new Error("WebSocket pair creation failed");
    this.ctx.acceptWebSocket(server, [role]);
    server.serializeAttachment(attachment);
    return new Response(null, { status: 101, webSocket: client });
  }

  applyConfig(version: number, enabled: boolean, resetBudget: boolean): void {
    if (!Number.isInteger(version) || version < 0)
      throw new Error("Invalid reaction config version");
    let disabled = false;
    this.ctx.storage.transactionSync(() => {
      const current = this.ctx.storage.sql
        .exec<{ version: number }>("SELECT version FROM reaction_config WHERE id = 1")
        .one().version;
      if (version <= current) return;
      if (resetBudget) {
        this.ctx.storage.sql.exec("DELETE FROM reaction_rate_limits");
        this.ctx.storage.sql.exec("DELETE FROM global_rate_limits");
        this.ctx.storage.sql.exec("UPDATE reaction_budget SET accepted_count = 0 WHERE id = 1");
      }
      this.ctx.storage.sql.exec(
        "UPDATE reaction_config SET enabled = ?, version = ? WHERE id = 1",
        Number(enabled),
        version,
      );
      disabled = !enabled;
    });
    if (disabled) {
      const message = JSON.stringify({ type: "reaction.disabled" });
      for (const socket of this.ctx.getWebSockets("client")) socket.send(message);
    }
  }

  getConfig(): { enabled: boolean; version: number; acceptedCount: number } {
    const config = this.ctx.storage.sql
      .exec<{ enabled: number; version: number }>(
        "SELECT enabled, version FROM reaction_config WHERE id = 1",
      )
      .one();
    const acceptedCount = this.ctx.storage.sql
      .exec<{ accepted_count: number }>("SELECT accepted_count FROM reaction_budget WHERE id = 1")
      .one().accepted_count;
    return { enabled: Boolean(config.enabled), version: config.version, acceptedCount };
  }

  webSocketMessage(socket: WebSocket, message: ArrayBuffer | string): void {
    const attachment = socket.deserializeAttachment() as ReactionAttachment | null;
    if (!attachment || attachment.role !== "client") {
      socket.close(1008, "Screen sockets are receive-only");
      return;
    }
    if (
      typeof message !== "string" ||
      new TextEncoder().encode(message).byteLength > MAX_MESSAGE_BYTES
    ) {
      socket.close(1009, "Message too large");
      return;
    }

    try {
      const parsed = reactionClientMessageSchema.parse(JSON.parse(message));
      if (parsed.type === "ping") {
        socket.send(JSON.stringify({ type: "pong" }));
        return;
      }
      const name = parsed.name;
      const now = Date.now();
      this.ctx.storage.transactionSync(() => this.enforceRateLimits(attachment.clientHash, now));
      const encoded = JSON.stringify({
        type: "reaction.batch",
        reactions: [{ name, at: now }],
      } satisfies ReactionEvent);
      for (const screen of this.ctx.getWebSockets("screen")) screen.send(encoded);
      socket.send(JSON.stringify({ type: "reaction.accepted", at: now }));
    } catch (error) {
      attachment.invalidMessages += 1;
      socket.serializeAttachment(attachment);
      const messageText = error instanceof Error ? error.message : "Reaction rejected";
      socket.send(
        JSON.stringify({ type: "error", code: "reaction_rejected", message: messageText }),
      );
      if (attachment.invalidMessages >= 3) socket.close(1008, "Too many rejected messages");
    }
  }
  webSocketClose(socket: WebSocket, code: number, reason: string): void {
    if (code !== 1005 && code !== 1006 && code !== 1015) socket.close(code, reason);
  }

  private enforceRateLimits(clientHash: string, now: number): void {
    const enabled = this.ctx.storage.sql
      .exec<{ enabled: number }>("SELECT enabled FROM reaction_config WHERE id = 1")
      .one().enabled;
    if (!enabled) throw new Error("Reactions are disabled");
    const acceptedCount = this.ctx.storage.sql
      .exec<{ accepted_count: number }>("SELECT accepted_count FROM reaction_budget WHERE id = 1")
      .one().accepted_count;
    const configuredShards = Number(this.env.REACTION_SHARDS);
    const shardCount =
      Number.isInteger(configuredShards) && configuredShards > 0 ? configuredShards : 4;
    const perShardBudget = Math.floor(MAX_REACTIONS_PER_EVENT / shardCount);
    if (acceptedCount >= perShardBudget) {
      this.ctx.storage.sql.exec("UPDATE reaction_config SET enabled = 0 WHERE id = 1");
      throw new Error("Event reaction budget exhausted");
    }

    const existing = this.ctx.storage.sql
      .exec<{ last_sent_at: number }>(
        "SELECT last_sent_at FROM reaction_rate_limits WHERE client_hash = ?",
        clientHash,
      )
      .toArray()[0];
    if (existing && now - existing.last_sent_at < CLIENT_COOLDOWN_MS) {
      throw new Error("Reaction rate limit exceeded");
    }

    const bucket = Math.floor(now / 1000);
    const count =
      this.ctx.storage.sql
        .exec<{ reaction_count: number }>(
          "SELECT reaction_count FROM global_rate_limits WHERE second_bucket = ?",
          bucket,
        )
        .toArray()[0]?.reaction_count ?? 0;
    if (count >= MAX_REACTIONS_PER_SECOND) throw new Error("Global reaction rate limit exceeded");

    this.ctx.storage.sql.exec(
      `INSERT INTO reaction_rate_limits (client_hash, last_sent_at) VALUES (?, ?)
       ON CONFLICT(client_hash) DO UPDATE SET last_sent_at = excluded.last_sent_at`,
      clientHash,
      now,
    );
    this.ctx.storage.sql.exec(
      `INSERT INTO global_rate_limits (second_bucket, reaction_count) VALUES (?, 1)
       ON CONFLICT(second_bucket) DO UPDATE SET reaction_count = reaction_count + 1`,
      bucket,
    );
    this.ctx.storage.sql.exec(
      "UPDATE reaction_budget SET accepted_count = accepted_count + 1 WHERE id = 1",
    );
    this.ctx.storage.sql.exec("DELETE FROM global_rate_limits WHERE second_bucket < ?", bucket - 2);
  }
}
