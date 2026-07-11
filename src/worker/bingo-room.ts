import { DurableObject } from "cloudflare:workers";

import {
  type AdminCommand,
  type BingoSnapshot,
  type FeatureFlags,
  type Prize,
  type ServerEvent,
} from "../shared/protocol";
import { bingoClientMessageSchema } from "../shared/schemas";
import {
  requireBingoNumber,
  requirePositiveId,
  requirePrizeName,
  requireSurveyUrl,
} from "../shared/validation";

const EVENT_HISTORY_LIMIT = 256;
const MAX_SOCKET_MESSAGE_BYTES = 4096;

type SocketAttachment = { invalidMessages: number };
type NumberRow = { id: number; number: number };
type PrizeRow = {
  id: number;
  name_ja: string;
  name_en: string;
  image_key: string | null;
  is_won: number;
  sort_order: number;
};
type ConfigRow = {
  event_id: string;
  survey_active: number;
  survey_url: string;
  reactions_enabled: number;
  reach_submission_enabled: number;
  survey_enabled: number;
  admin_writes_enabled: number;
  read_only_mode: number;
};

export class BingoRoom extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS event_config (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        event_id TEXT NOT NULL,
        survey_active INTEGER NOT NULL DEFAULT 0 CHECK (survey_active IN (0, 1)),
        survey_url TEXT NOT NULL DEFAULT '',
        reactions_enabled INTEGER NOT NULL DEFAULT 1 CHECK (reactions_enabled IN (0, 1)),
        reach_submission_enabled INTEGER NOT NULL DEFAULT 1 CHECK (reach_submission_enabled IN (0, 1)),
        survey_enabled INTEGER NOT NULL DEFAULT 1 CHECK (survey_enabled IN (0, 1)),
        admin_writes_enabled INTEGER NOT NULL DEFAULT 1 CHECK (admin_writes_enabled IN (0, 1)),
        read_only_mode INTEGER NOT NULL DEFAULT 0 CHECK (read_only_mode IN (0, 1))
      );
      CREATE TABLE IF NOT EXISTS live_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        version INTEGER NOT NULL DEFAULT 0,
        reach_count INTEGER NOT NULL DEFAULT 0 CHECK (reach_count >= 0)
      );
      CREATE TABLE IF NOT EXISTS numbers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        number INTEGER NOT NULL UNIQUE CHECK (number BETWEEN 1 AND 99)
      );
      CREATE TABLE IF NOT EXISTS prizes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name_ja TEXT NOT NULL,
        name_en TEXT NOT NULL,
        image_key TEXT,
        is_won INTEGER NOT NULL DEFAULT 0 CHECK (is_won IN (0, 1)),
        sort_order INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS reach_submissions (
        client_hash TEXT PRIMARY KEY,
        submitted_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS versioned_events (
        version INTEGER PRIMARY KEY,
        event_type TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      INSERT OR IGNORE INTO live_state (id) VALUES (1);
    `);
    this.ctx.storage.sql.exec(
      "INSERT OR IGNORE INTO event_config (id, event_id) VALUES (1, ?)",
      env.EVENT_ID,
    );
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("WebSocket upgrade required", { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    if (!client || !server) throw new Error("WebSocket pair creation failed");
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ invalidMessages: 0 } satisfies SocketAttachment);

    const lastVersionValue = new URL(request.url).searchParams.get("lastVersion");
    const lastVersion = lastVersionValue === null ? null : Number(lastVersionValue);
    const messages =
      lastVersion !== null && Number.isInteger(lastVersion) && lastVersion >= 0
        ? this.eventsSince(lastVersion)
        : [this.getSnapshot()];
    for (const message of messages) server.send(JSON.stringify(message));

    return new Response(null, { status: 101, webSocket: client });
  }

  getSnapshot(): BingoSnapshot {
    const config = this.ctx.storage.sql
      .exec<ConfigRow>("SELECT * FROM event_config WHERE id = 1")
      .one();
    const live = this.ctx.storage.sql
      .exec<{ version: number; reach_count: number }>(
        "SELECT version, reach_count FROM live_state WHERE id = 1",
      )
      .one();
    const numbers = this.ctx.storage.sql
      .exec<NumberRow>("SELECT id, number FROM numbers ORDER BY id")
      .toArray();
    const prizes = this.readPrizes();

    return {
      type: "snapshot",
      version: live.version,
      eventId: config.event_id,
      numbers,
      latestNumber: numbers.at(-1)?.number ?? null,
      reachCount: live.reach_count,
      survey: {
        active: Boolean(config.survey_active) && Boolean(config.survey_enabled),
        url: config.survey_url,
      },
      prizes,
      flags: this.flagsFromRow(config),
    };
  }

  submitReach(clientHash: string): { accepted: boolean; count: number } {
    if (!/^[a-f0-9]{64}$/.test(clientHash)) throw new Error("Invalid client identity");
    const result = this.ctx.storage.transactionSync(() => {
      const config = this.ctx.storage.sql
        .exec<ConfigRow>("SELECT * FROM event_config WHERE id = 1")
        .one();
      if (config.read_only_mode || !config.reach_submission_enabled)
        throw new Error("Reach submissions are disabled");
      const existing = this.ctx.storage.sql
        .exec<{ client_hash: string }>(
          "SELECT client_hash FROM reach_submissions WHERE client_hash = ?",
          clientHash,
        )
        .toArray();
      const count = this.currentReachCount();
      if (existing.length > 0) return { accepted: false, count, event: null };
      this.ctx.storage.sql.exec(
        "INSERT INTO reach_submissions (client_hash, submitted_at) VALUES (?, ?)",
        clientHash,
        Date.now(),
      );
      const event = this.recordEvent("reach.updated", { count: count + 1 }, () => {
        this.ctx.storage.sql.exec(
          "UPDATE live_state SET reach_count = reach_count + 1 WHERE id = 1",
        );
      });
      return { accepted: true, count: count + 1, event };
    });
    if (result.event) this.broadcast(result.event);
    return { accepted: result.accepted, count: result.count };
  }

  admin(command: AdminCommand): BingoSnapshot {
    const event = this.ctx.storage.transactionSync(() => {
      const config = this.ctx.storage.sql
        .exec<ConfigRow>("SELECT * FROM event_config WHERE id = 1")
        .one();
      if (
        command.type !== "flags.update" &&
        (config.read_only_mode || !config.admin_writes_enabled)
      ) {
        throw new Error("Administrative writes are disabled");
      }
      return this.applyAdminCommand(command);
    });
    this.broadcast(event);
    return this.getSnapshot();
  }

  getPrize(id: number): Prize | null {
    requirePositiveId(id);
    const rows = this.ctx.storage.sql
      .exec<PrizeRow>("SELECT * FROM prizes WHERE id = ?", id)
      .toArray();
    return rows[0] ? this.prizeFromRow(rows[0]) : null;
  }

  webSocketMessage(socket: WebSocket, message: ArrayBuffer | string): void {
    if (
      typeof message !== "string" ||
      new TextEncoder().encode(message).byteLength > MAX_SOCKET_MESSAGE_BYTES
    ) {
      socket.close(1009, "Message too large");
      return;
    }
    try {
      const parsed = bingoClientMessageSchema.parse(JSON.parse(message));
      if (parsed.type === "ping") {
        const version = this.ctx.storage.sql
          .exec<{ version: number }>("SELECT version FROM live_state WHERE id = 1")
          .one().version;
        socket.send(JSON.stringify({ type: "pong", version }));
        return;
      }
      if (parsed.type === "resync") {
        for (const event of this.eventsSince(parsed.lastVersion))
          socket.send(JSON.stringify(event));
        return;
      }
      throw new Error("Unsupported message");
    } catch {
      const attachment = (socket.deserializeAttachment() as SocketAttachment | null) ?? {
        invalidMessages: 0,
      };
      attachment.invalidMessages += 1;
      socket.serializeAttachment(attachment);
      socket.send(
        JSON.stringify({
          type: "error",
          code: "invalid_message",
          message: "Invalid WebSocket message",
        }),
      );
      if (attachment.invalidMessages >= 3) socket.close(1008, "Too many invalid messages");
    }
  }
  webSocketClose(socket: WebSocket, code: number, reason: string): void {
    if (code !== 1005 && code !== 1006 && code !== 1015) socket.close(code, reason);
  }

  private applyAdminCommand(command: AdminCommand): ServerEvent {
    switch (command.type) {
      case "number.add": {
        const number = requireBingoNumber(command.number);
        let created!: NumberRow;
        return this.recordEvent(
          "number.added",
          null,
          () => {
            created = this.ctx.storage.sql
              .exec<NumberRow>(
                "INSERT INTO numbers (number) VALUES (?) RETURNING id, number",
                number,
              )
              .one();
          },
          () => created,
        );
      }
      case "number.update": {
        const id = requirePositiveId(command.id);
        const number = requireBingoNumber(command.number);
        let updated!: NumberRow;
        return this.recordEvent(
          "number.updated",
          null,
          () => {
            updated = this.ctx.storage.sql
              .exec<NumberRow>(
                "UPDATE numbers SET number = ? WHERE id = ? RETURNING id, number",
                number,
                id,
              )
              .one();
          },
          () => updated,
        );
      }
      case "number.delete": {
        const id = requirePositiveId(command.id);
        let deleted!: NumberRow;
        return this.recordEvent(
          "number.deleted",
          null,
          () => {
            deleted = this.ctx.storage.sql
              .exec<NumberRow>("DELETE FROM numbers WHERE id = ? RETURNING id, number", id)
              .one();
          },
          () => deleted,
        );
      }
      case "numbers.reset":
        return this.recordEvent("numbers.reset", {}, () =>
          this.ctx.storage.sql.exec("DELETE FROM numbers"),
        );
      case "reach.increment": {
        const count = this.currentReachCount() + 1;
        return this.recordEvent("reach.updated", { count }, () =>
          this.ctx.storage.sql.exec("UPDATE live_state SET reach_count = ? WHERE id = 1", count),
        );
      }
      case "reach.decrement": {
        const count = Math.max(0, this.currentReachCount() - 1);
        return this.recordEvent("reach.updated", { count }, () =>
          this.ctx.storage.sql.exec("UPDATE live_state SET reach_count = ? WHERE id = 1", count),
        );
      }
      case "reach.reset":
        return this.recordEvent("reach.reset", { count: 0 }, () => {
          this.ctx.storage.sql.exec("UPDATE live_state SET reach_count = 0 WHERE id = 1");
          this.ctx.storage.sql.exec("DELETE FROM reach_submissions");
        });
      case "survey.update": {
        const url = requireSurveyUrl(command.url, command.active);
        return this.recordEvent("survey.updated", { active: command.active, url }, () =>
          this.ctx.storage.sql.exec(
            "UPDATE event_config SET survey_active = ?, survey_url = ? WHERE id = 1",
            Number(command.active),
            url,
          ),
        );
      }
      case "prize.create": {
        const nameJa = requirePrizeName(command.prize.nameJa, "Japanese prize name");
        const nameEn = requirePrizeName(command.prize.nameEn, "English prize name");
        return this.recordEvent(
          "prizes.updated",
          null,
          () => {
            const order = this.ctx.storage.sql
              .exec<{ next_order: number }>(
                "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM prizes",
              )
              .one().next_order;
            this.ctx.storage.sql.exec(
              "INSERT INTO prizes (name_ja, name_en, image_key, is_won, sort_order) VALUES (?, ?, ?, ?, ?)",
              nameJa,
              nameEn,
              command.prize.imageKey,
              Number(command.prize.isWon),
              order,
            );
          },
          () => this.readPrizes(),
        );
      }
      case "prize.update": {
        const id = requirePositiveId(command.id);
        const current = this.getPrize(id);
        if (!current) throw new Error("Prize not found");
        const next = { ...current, ...command.prize };
        const nameJa = requirePrizeName(next.nameJa, "Japanese prize name");
        const nameEn = requirePrizeName(next.nameEn, "English prize name");
        return this.recordEvent(
          "prizes.updated",
          null,
          () => {
            this.ctx.storage.sql.exec(
              "UPDATE prizes SET name_ja = ?, name_en = ?, image_key = ?, is_won = ? WHERE id = ?",
              nameJa,
              nameEn,
              next.imageKey,
              Number(next.isWon),
              id,
            );
          },
          () => this.readPrizes(),
        );
      }
      case "prize.delete": {
        const id = requirePositiveId(command.id);
        return this.recordEvent(
          "prizes.updated",
          null,
          () => {
            this.ctx.storage.sql.exec("DELETE FROM prizes WHERE id = ?", id);
            this.resequencePrizes();
          },
          () => this.readPrizes(),
        );
      }
      case "prize.toggleWon": {
        const id = requirePositiveId(command.id);
        return this.recordEvent(
          "prizes.updated",
          null,
          () => {
            this.ctx.storage.sql.exec(
              "UPDATE prizes SET is_won = ? WHERE id = ?",
              Number(command.isWon),
              id,
            );
          },
          () => this.readPrizes(),
        );
      }
      case "prize.reorder": {
        const ids = command.ids.map(requirePositiveId);
        if (new Set(ids).size !== ids.length) throw new Error("Prize order contains duplicate IDs");
        const existing = this.ctx.storage.sql
          .exec<{ id: number }>("SELECT id FROM prizes ORDER BY id")
          .toArray();
        if (existing.length !== ids.length || existing.some(({ id }) => !ids.includes(id))) {
          throw new Error("Prize order must include every prize exactly once");
        }
        return this.recordEvent(
          "prizes.updated",
          null,
          () => {
            ids.forEach((id, order) =>
              this.ctx.storage.sql.exec("UPDATE prizes SET sort_order = ? WHERE id = ?", order, id),
            );
          },
          () => this.readPrizes(),
        );
      }
      case "flags.update": {
        const current = this.flagsFromRow(
          this.ctx.storage.sql.exec<ConfigRow>("SELECT * FROM event_config WHERE id = 1").one(),
        );
        const flags = { ...current, ...command.flags };
        return this.recordEvent("flags.updated", flags, () => {
          this.ctx.storage.sql.exec(
            `UPDATE event_config SET reactions_enabled = ?, reach_submission_enabled = ?, survey_enabled = ?,
             admin_writes_enabled = ?, read_only_mode = ? WHERE id = 1`,
            Number(flags.reactionsEnabled),
            Number(flags.reachSubmissionEnabled),
            Number(flags.surveyEnabled),
            Number(flags.adminWritesEnabled),
            Number(flags.readOnlyMode),
          );
        });
      }
      case "event.initialize":
        return this.recordEvent("event.initialized", {}, () => {
          this.ctx.storage.sql.exec("DELETE FROM numbers");
          this.ctx.storage.sql.exec("DELETE FROM prizes");
          this.ctx.storage.sql.exec("DELETE FROM reach_submissions");
          this.ctx.storage.sql.exec("UPDATE live_state SET reach_count = 0 WHERE id = 1");
          this.ctx.storage.sql.exec(
            `UPDATE event_config SET survey_active = 0, survey_url = '', reactions_enabled = 1,
             reach_submission_enabled = 1, survey_enabled = 1, admin_writes_enabled = 1, read_only_mode = 0 WHERE id = 1`,
          );
        });
    }
  }

  private recordEvent(
    type: ServerEvent["type"],
    payload: unknown,
    mutate: () => void,
    resolvePayload?: () => unknown,
  ): ServerEvent {
    mutate();
    const version = this.ctx.storage.sql
      .exec<{ version: number }>(
        "UPDATE live_state SET version = version + 1 WHERE id = 1 RETURNING version",
      )
      .one().version;
    const finalPayload = resolvePayload ? resolvePayload() : payload;
    this.ctx.storage.sql.exec(
      "INSERT INTO versioned_events (version, event_type, payload_json, created_at) VALUES (?, ?, ?, ?)",
      version,
      type,
      JSON.stringify(finalPayload),
      Date.now(),
    );
    this.ctx.storage.sql.exec(
      "DELETE FROM versioned_events WHERE version <= (SELECT MAX(version) - ? FROM versioned_events)",
      EVENT_HISTORY_LIMIT,
    );
    return { type, version, payload: finalPayload };
  }

  private eventsSince(lastVersion: number): Array<BingoSnapshot | ServerEvent> {
    const currentVersion = this.ctx.storage.sql
      .exec<{ version: number }>("SELECT version FROM live_state WHERE id = 1")
      .one().version;
    if (lastVersion === currentVersion) return [];
    const rows = this.ctx.storage.sql
      .exec<{ version: number; event_type: ServerEvent["type"]; payload_json: string }>(
        "SELECT version, event_type, payload_json FROM versioned_events WHERE version > ? ORDER BY version",
        lastVersion,
      )
      .toArray();
    if (
      rows.length === 0 ||
      rows[0]?.version !== lastVersion + 1 ||
      rows.at(-1)?.version !== currentVersion
    ) {
      return [this.getSnapshot()];
    }
    return rows.map((row) => ({
      type: row.event_type,
      version: row.version,
      payload: JSON.parse(row.payload_json),
    }));
  }

  private broadcast(event: ServerEvent): void {
    const encoded = JSON.stringify(event);
    for (const socket of this.ctx.getWebSockets()) {
      try {
        socket.send(encoded);
      } catch {
        socket.close(1011, "Broadcast failed");
      }
    }
  }

  private readPrizes(): Prize[] {
    return this.ctx.storage.sql
      .exec<PrizeRow>("SELECT * FROM prizes ORDER BY is_won ASC, sort_order ASC, id ASC")
      .toArray()
      .map((row) => this.prizeFromRow(row));
  }

  private prizeFromRow(row: PrizeRow): Prize {
    return {
      id: row.id,
      nameJa: row.name_ja,
      nameEn: row.name_en,
      imageKey: row.image_key,
      imageUrl: row.image_key ? `/api/prize-images/${encodeURIComponent(row.image_key)}` : null,
      isWon: Boolean(row.is_won),
      sortOrder: row.sort_order,
    };
  }

  private currentReachCount(): number {
    return this.ctx.storage.sql
      .exec<{ reach_count: number }>("SELECT reach_count FROM live_state WHERE id = 1")
      .one().reach_count;
  }

  private resequencePrizes(): void {
    const ids = this.ctx.storage.sql
      .exec<{ id: number }>("SELECT id FROM prizes ORDER BY sort_order, id")
      .toArray();
    ids.forEach(({ id }, index) =>
      this.ctx.storage.sql.exec("UPDATE prizes SET sort_order = ? WHERE id = ?", index, id),
    );
  }

  private flagsFromRow(row: ConfigRow): FeatureFlags {
    return {
      reactionsEnabled: Boolean(row.reactions_enabled),
      reachSubmissionEnabled: Boolean(row.reach_submission_enabled),
      surveyEnabled: Boolean(row.survey_enabled),
      adminWritesEnabled: Boolean(row.admin_writes_enabled),
      readOnlyMode: Boolean(row.read_only_mode),
    };
  }
}
