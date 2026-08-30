import { DurableObject } from "cloudflare:workers";
import { isStampName, type StampSocketMessage } from "../shared/bingo-transport";

import { type StampSubmissionResult, type StampTriggerRow, validationProblem } from "./domain";
import { capacityResponse } from "./http";
import { expireScreenSockets, scheduleScreenSocketExpiration } from "./screen-socket-expiration";

type ReactionStateSqlRow = {
  day: string;
  daily_count: number;
  next_id: number;
};

type StampSocketAttachment = {
  kind: "stamps";
  expires_at: number;
};

const CLIENT_INTERVAL_MS = 2_000;
const SAMPLE_THRESHOLD_PER_SECOND = 50;
const DROP_THRESHOLD_PER_SECOND = 100;
const MAX_DAILY_LIMIT = 25_000;
const MAX_SCREEN_SOCKETS = 16;
const JST_OFFSET_MS = 9 * 60 * 60 * 1_000;

export class ReactionHub extends DurableObject<Env> {
  private readonly lastAcceptedByClient = new Map<string, number>();
  private recentAccepted: number[] = [];
  private sampleSequence = 0;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => this.migrate());
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
  }

  async submitStamp(
    clientHash: string,
    stampName: string,
    requestedDailyLimit: number,
  ): Promise<StampSubmissionResult> {
    this.ensureState();
    assertClientHash(clientHash);
    if (!isStampName(stampName)) validationProblem("リアクションの種類が不正です。");
    const dailyLimit = normalizeDailyLimit(requestedDailyLimit);

    const nowMs = Date.now();
    const previous = this.lastAcceptedByClient.get(clientHash);
    if (previous !== undefined && nowMs - previous < CLIENT_INTERVAL_MS) {
      return {
        accepted: false,
        reason: "rate_limited",
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((CLIENT_INTERVAL_MS - (nowMs - previous)) / 1_000),
        ),
      };
    }

    this.recentAccepted = this.recentAccepted.filter((timestamp) => nowMs - timestamp < 1_000);
    if (this.recentAccepted.length >= DROP_THRESHOLD_PER_SECOND) {
      return { accepted: false, reason: "overloaded", retryAfterSeconds: 2 };
    }
    if (this.recentAccepted.length >= SAMPLE_THRESHOLD_PER_SECOND) {
      this.sampleSequence += 1;
      if (this.sampleSequence % 4 !== 0) return { accepted: false, reason: "sampled" };
    }

    const day = jstCalendarDay(nowMs);
    const persisted = this.ctx.storage.transactionSync(() => {
      const state = this.readStateRow();
      const currentCount = state.day === day ? state.daily_count : 0;
      if (currentCount >= dailyLimit) return null;
      return this.ctx.storage.sql
        .exec<{ daily_count: number; stamp_id: number }>(
          "UPDATE reaction_state SET day = ?, daily_count = ?, next_id = next_id + 1 " +
            "WHERE id = 1 RETURNING daily_count, next_id - 1 AS stamp_id",
          day,
          currentCount + 1,
        )
        .one();
    });
    if (persisted === null) return { accepted: false, reason: "daily_limit" };

    this.lastAcceptedByClient.set(clientHash, nowMs);
    this.pruneClientRateLimits(nowMs);
    this.recentAccepted.push(nowMs);
    const stamp: StampTriggerRow = {
      id: persisted.stamp_id,
      name: stampName,
      created_at: new Date(nowMs).toISOString(),
    };
    const socketMessage: StampSocketMessage = { type: "stamp", stamp };
    const message = JSON.stringify(socketMessage);
    for (const socket of this.ctx.getWebSockets("stamps")) safeSend(socket, message);
    return { accepted: true, stamp, dailyCount: persisted.daily_count };
  }

  async getStatus(): Promise<{
    day: string;
    dailyCount: number;
    connectedScreens: number;
  }> {
    this.ensureState();
    const state = this.readStateRow();
    return {
      day: state.day,
      dailyCount: state.daily_count,
      connectedScreens: this.ctx.getWebSockets("stamps").length,
    };
  }

  async fetch(request: Request): Promise<Response> {
    if (request.method !== "GET" || request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return Response.json({ error: "WebSocket Upgrade が必要です。" }, { status: 426 });
    }
    this.ensureState();
    if (this.ctx.getWebSockets("stamps").length >= MAX_SCREEN_SOCKETS) {
      return capacityResponse("リアクション配信の接続上限に達しています。");
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.ctx.acceptWebSocket(server, ["stamps"]);
    const attachment: StampSocketAttachment = {
      kind: "stamps",
      expires_at: Date.now() + 30 * 60 * 1_000,
    };
    server.serializeAttachment(attachment);
    await scheduleScreenSocketExpiration(this.ctx, "stamps");
    const readyMessage: StampSocketMessage = { type: "ready" };
    safeSend(server, JSON.stringify(readyMessage));
    return new Response(null, { status: 101, webSocket: client });
  }

  async alarm(): Promise<void> {
    await expireScreenSockets(this.ctx, "stamps");
  }

  async webSocketMessage(socket: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (message !== "ping") safeClose(socket, 1008, "unsupported message");
  }

  async webSocketError(socket: WebSocket, error: unknown): Promise<void> {
    console.error(
      JSON.stringify({
        message: "reaction websocket error",
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    safeClose(socket, 1011, "websocket error");
  }

  webSocketClose(_socket: WebSocket, _code: number, _reason: string, _wasClean: boolean): void {
    // With the current compatibility date the runtime replies to close frames automatically.
  }

  private migrate(): void {
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS _sql_schema_migrations (
        id INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      );
    `);
    const currentVersion =
      this.ctx.storage.sql
        .exec<{ version: number }>(
          "SELECT COALESCE(MAX(id), 0) AS version FROM _sql_schema_migrations",
        )
        .one().version ?? 0;
    if (currentVersion >= 1) return;

    const now = new Date().toISOString();
    this.ctx.storage.transactionSync(() => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS reaction_state (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          day TEXT NOT NULL,
          daily_count INTEGER NOT NULL CHECK (daily_count >= 0),
          next_id INTEGER NOT NULL CHECK (next_id >= 1)
        );
      `);
      this.ctx.storage.sql.exec(
        "INSERT OR IGNORE INTO _sql_schema_migrations (id, applied_at) VALUES (1, ?)",
        now,
      );
    });
  }

  private ensureState(): void {
    const existing = this.ctx.storage.sql
      .exec<{ id: number }>("SELECT id FROM reaction_state WHERE id = 1")
      .toArray()[0];
    if (existing !== undefined) return;
    this.ctx.storage.sql.exec(
      "INSERT INTO reaction_state (id, day, daily_count, next_id) VALUES (1, ?, 0, 1)",
      jstCalendarDay(),
    );
  }

  private readStateRow(): ReactionStateSqlRow {
    return this.ctx.storage.sql
      .exec<ReactionStateSqlRow>(
        "SELECT day, daily_count, next_id FROM reaction_state WHERE id = 1",
      )
      .one();
  }

  private pruneClientRateLimits(nowMs: number): void {
    if (this.lastAcceptedByClient.size <= 2_000) return;
    const targetSize = 1_500;
    for (const [clientHash, timestamp] of this.lastAcceptedByClient) {
      if (nowMs - timestamp > 60_000 || this.lastAcceptedByClient.size > targetSize) {
        this.lastAcceptedByClient.delete(clientHash);
      }
      if (this.lastAcceptedByClient.size <= targetSize) break;
    }
  }
}

function jstCalendarDay(timestampMs = Date.now()): string {
  return new Date(timestampMs + JST_OFFSET_MS).toISOString().slice(0, 10);
}

function normalizeDailyLimit(value: number): number {
  if (!Number.isInteger(value) || value < 0) return MAX_DAILY_LIMIT;
  return Math.min(value, MAX_DAILY_LIMIT);
}

function assertClientHash(value: string): void {
  if (!/^[a-f0-9]{64}$/.test(value)) validationProblem("client hash が不正です。");
}

function safeSend(socket: WebSocket, message: string): void {
  try {
    socket.send(message);
  } catch {
    safeClose(socket, 1011, "send failed");
  }
}

function safeClose(socket: WebSocket, code: number, reason: string): void {
  try {
    socket.close(code, reason);
  } catch {
    // The socket may already have been closed by the peer.
  }
}
