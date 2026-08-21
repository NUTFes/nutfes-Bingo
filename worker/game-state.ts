import { DurableObject } from "cloudflare:workers";
import type { BingoUnifiedState, StateSocketMessage } from "../shared/bingo-transport";

import {
  assertGeneration,
  assertPrizeImagePath,
  capacityProblem,
  conflictProblem,
  type AppStateRow,
  type AuditLogRow,
  type GameSnapshot,
  MAX_AUDIT_LOG_ROWS,
  MAX_AUDIT_PAYLOAD_BYTES,
  MAX_PRIZES,
  MAX_REACH_LOGS,
  MAX_REACH_SUBMISSIONS,
  type NumberRow,
  notFoundProblem,
  parseOptionalText,
  parsePositiveInteger,
  parseRequiredText,
  parseSnapshot,
  PRIZE_SORT_ORDER_STEP,
  type PrizeRow,
  type ReachLogRow,
  type ReachSubmissionRow,
  resolveImageUrl,
  type StoredPrizeRow,
  validationProblem,
  normalizeHttpsUrl,
} from "./domain";
import { capacityResponse, sha256Hex } from "./http";
import { expireScreenSockets, scheduleScreenSocketExpiration } from "./screen-socket-expiration";
import { storeSnapshot } from "./snapshots";

type MetadataSqlRow = { value: string };
type RevisionSqlRow = { revision: number };
type NumberSqlRow = NumberRow;
type PrizeSqlRow = Omit<StoredPrizeRow, "is_won"> & { is_won: number };
type AppStateSqlRow = Omit<AppStateRow, "is_survey_active"> & { is_survey_active: number };
type ReachLogSqlRow = ReachLogRow;
type ReachSubmissionSqlRow = ReachSubmissionRow;
type AuditLogSqlRow = AuditLogRow;
type CachedGameState = Omit<BingoUnifiedState, "serverTime">;

type StateSocketAttachment = {
  kind: "state";
  generation: string;
  view: "public" | "screen";
  expires_at: number;
};

const MAX_STATE_SOCKETS = 2_000;
const MAX_SCREEN_STATE_SOCKETS = 16;
const MAX_PUBLIC_STATE_SOCKETS = MAX_STATE_SOCKETS - MAX_SCREEN_STATE_SOCKETS;
const INITIAL_ACTIVATION_TOKEN = "initial";
const SNAPSHOT_INSTALL_CHECKSUM_KEY = "snapshot_install_checksum";
const SNAPSHOT_INSTALL_STATUS_KEY = "snapshot_install_status";
const SNAPSHOT_INSTALL_INSTALLED = "installed";
const SNAPSHOT_INSTALL_READY = "ready";

export class GameState extends DurableObject<Env> {
  private cachedState: CachedGameState | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => this.migrate());
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
  }

  async getState(generation: string): Promise<BingoUnifiedState> {
    this.ensureActiveGeneration(generation);
    return this.readState(generation);
  }

  async getStatus(generation: string): Promise<{ generation: string; revision: number }> {
    this.ensureActiveGeneration(generation);
    return { generation, revision: this.readRevision() };
  }

  async isInitialized(generation: string): Promise<boolean> {
    assertGeneration(generation);
    return this.readMetadata("generation") === generation;
  }

  async createNumber(generation: string, actor: string, numberInput: number): Promise<NumberRow> {
    const number = parsePositiveInteger(numberInput, "番号", { max: 99 });
    return this.runAdminMutation(generation, actor, "createNumber", { number }, () => {
      if (this.findNumberByValue(number) !== null)
        conflictProblem("同じ番号が既に登録されています。");
      const now = new Date().toISOString();
      return this.ctx.storage.sql
        .exec<NumberSqlRow>(
          "INSERT INTO numbers (number, created_at, updated_at) VALUES (?, ?, ?) " +
            "RETURNING id, number, created_at, updated_at",
          number,
          now,
          now,
        )
        .one();
    });
  }

  async deleteNumber(generation: string, actor: string, numberInput: number): Promise<NumberRow> {
    const number = parsePositiveInteger(numberInput, "番号", { max: 99 });
    return this.runAdminMutation(generation, actor, "deleteNumber", { number }, () => {
      const existing = this.findNumberByValue(number);
      if (existing === null) notFoundProblem("番号が見つかりません。");
      this.ctx.storage.sql.exec("DELETE FROM numbers WHERE number = ?", number);
      return existing;
    });
  }

  async updateNumber(
    generation: string,
    actor: string,
    idInput: number,
    numberInput: number,
  ): Promise<NumberRow> {
    const id = parsePositiveInteger(idInput, "番号ID");
    const number = parsePositiveInteger(numberInput, "番号", { max: 99 });
    return this.runAdminMutation(generation, actor, "updateNumber", { id, number }, () => {
      const existing = this.findNumberById(id);
      if (existing === null) notFoundProblem("番号が見つかりません。");
      const conflicting = this.findNumberByValue(number);
      if (conflicting !== null && conflicting.id !== id) {
        conflictProblem("同じ番号が既に登録されています。");
      }
      const now = new Date().toISOString();
      return this.ctx.storage.sql
        .exec<NumberSqlRow>(
          "UPDATE numbers SET number = ?, updated_at = ? WHERE id = ? " +
            "RETURNING id, number, created_at, updated_at",
          number,
          now,
          id,
        )
        .one();
    });
  }

  async incrementReach(generation: string, actor: string): Promise<number> {
    return this.changeAdminReach(generation, actor, 1);
  }

  async decrementReach(generation: string, actor: string): Promise<number> {
    return this.changeAdminReach(generation, actor, -1);
  }

  async recordPublicReach(generation: string, clientHash: string): Promise<number> {
    this.ensureActiveGeneration(generation);
    assertClientHash(clientHash);

    const mutation = this.ctx.storage.transactionSync(() => {
      const existing = this.ctx.storage.sql
        .exec<{ client_hash: string }>(
          "SELECT client_hash FROM reach_submissions WHERE client_hash = ? LIMIT 1",
          clientHash,
        )
        .toArray()[0];
      if (existing !== undefined) {
        return {
          changed: false as const,
          count: this.readAppState().reach_count,
          revision: this.readRevision(),
        };
      }
      const submissionCount = Number(this.readMetadata("reach_submission_count") ?? "0");
      if (!Number.isSafeInteger(submissionCount) || submissionCount < 0) {
        throw new Error("reach submission count metadata is corrupt");
      }
      if (submissionCount >= MAX_REACH_SUBMISSIONS) {
        capacityProblem("参加上限に達したため、公開リーチ受付を停止しています。");
      }
      const now = new Date().toISOString();
      this.ctx.storage.sql.exec(
        "INSERT INTO reach_submissions (client_hash, created_at) VALUES (?, ?)",
        clientHash,
        now,
      );
      this.ctx.storage.sql.exec(
        "UPDATE game_metadata SET value = CAST(value AS INTEGER) + 1 " +
          "WHERE key = 'reach_submission_count'",
      );

      const next = this.ctx.storage.sql
        .exec<{ reach_count: number }>(
          "UPDATE app_state SET reach_count = reach_count + 1, updated_at = ? WHERE id = 1 " +
            "RETURNING reach_count",
          now,
        )
        .one().reach_count;
      this.ctx.storage.sql.exec(
        "INSERT INTO reach_logs (delta, reach_num, source, created_at) VALUES (1, ?, 'public', ?)",
        next,
        now,
      );
      this.trimReachLogs();
      const revision = this.incrementRevision();
      return { changed: true as const, count: next, revision };
    });
    if (!mutation.changed) return mutation.count;

    const latestReachLog = this.readLatestReachLog();
    if (latestReachLog === null) {
      throw new Error("public reach mutation did not create a reach log");
    }
    const message: StateSocketMessage = {
      type: "reach",
      generation,
      revision: mutation.revision,
      reachCount: mutation.count,
      latestReachLog,
      serverTime: new Date().toISOString(),
    };
    const serializedMessage = JSON.stringify(message);
    for (const socket of this.ctx.getWebSockets("screen")) safeSend(socket, serializedMessage);
    return mutation.count;
  }

  async saveSurveyState(
    generation: string,
    actor: string,
    surveyUrlInput: string,
    isSurveyActiveInput: boolean,
  ): Promise<AppStateRow> {
    const surveyUrl = normalizeHttpsUrl(surveyUrlInput);
    if (typeof isSurveyActiveInput !== "boolean") validationProblem("公開設定が不正です。");
    if (isSurveyActiveInput && surveyUrl === "") {
      validationProblem("アンケートを公開する場合はURLを入力してください。");
    }

    return this.runAdminMutation(
      generation,
      actor,
      "saveSurveyState",
      { surveyUrl, isSurveyActive: isSurveyActiveInput },
      () => {
        const now = new Date().toISOString();
        const row = this.ctx.storage.sql
          .exec<AppStateSqlRow>(
            "UPDATE app_state SET survey_url = ?, is_survey_active = ?, updated_at = ? " +
              "WHERE id = 1 RETURNING id, survey_url, is_survey_active, reach_count, updated_at",
            surveyUrl,
            isSurveyActiveInput ? 1 : 0,
            now,
          )
          .one();
        return toAppStateRow(row);
      },
    );
  }

  async createPrize(
    generation: string,
    actor: string,
    nameJpInput: string,
    nameEnInput: string | null,
    imagePathInput?: string | null,
  ): Promise<PrizeRow> {
    const nameJp = parseRequiredText(nameJpInput, "景品名", 120);
    const nameEn = parseOptionalText(nameEnInput, "英語景品名", 160);
    const imagePath = imagePathInput ?? null;
    assertPrizeImagePath(imagePath);

    return this.runAdminMutation(
      generation,
      actor,
      "createPrize",
      { nameJp, nameEn, imagePath },
      () => {
        const prizeCount = this.ctx.storage.sql
          .exec<{ count: number }>("SELECT COUNT(*) AS count FROM prizes")
          .one().count;
        if (prizeCount >= MAX_PRIZES) {
          capacityProblem("景品の登録上限に達しています。");
        }
        const maxSortOrder = this.ctx.storage.sql
          .exec<{ sort_order: number }>(
            "SELECT COALESCE(MAX(sort_order), 0) AS sort_order FROM prizes WHERE is_won = 0",
          )
          .one().sort_order;
        const now = new Date().toISOString();
        const row = this.ctx.storage.sql
          .exec<PrizeSqlRow>(
            "INSERT INTO prizes " +
              "(name_jp, name_en, image_path, is_won, sort_order, created_at, updated_at) " +
              "VALUES (?, ?, ?, 0, ?, ?, ?) RETURNING *",
            nameJp,
            nameEn,
            imagePath,
            maxSortOrder + PRIZE_SORT_ORDER_STEP,
            now,
            now,
          )
          .one();
        return this.toPrizeRow(row);
      },
    );
  }

  async updatePrize(
    generation: string,
    actor: string,
    idInput: number,
    nameJpInput: string,
    nameEnInput: string | null,
    imagePathInput?: string | null,
  ): Promise<PrizeRow> {
    const id = parsePositiveInteger(idInput, "景品ID");
    const nameJp = parseRequiredText(nameJpInput, "景品名", 120);
    const nameEn = parseOptionalText(nameEnInput, "英語景品名", 160);
    if (imagePathInput !== undefined) assertPrizeImagePath(imagePathInput);

    return this.runAdminMutation(
      generation,
      actor,
      "updatePrize",
      {
        id,
        nameJp,
        nameEn,
        ...(imagePathInput === undefined ? {} : { imagePath: imagePathInput }),
      },
      () => {
        const existing = this.findPrizeById(id);
        if (existing === null) notFoundProblem("景品が見つかりません。");
        const imagePath = imagePathInput === undefined ? existing.image_path : imagePathInput;
        const now = new Date().toISOString();
        const row = this.ctx.storage.sql
          .exec<PrizeSqlRow>(
            "UPDATE prizes SET name_jp = ?, name_en = ?, image_path = ?, updated_at = ? " +
              "WHERE id = ? RETURNING *",
            nameJp,
            nameEn,
            imagePath,
            now,
            id,
          )
          .one();
        return this.toPrizeRow(row);
      },
    );
  }

  async togglePrizeWon(
    generation: string,
    actor: string,
    idInput: number,
    isWonInput: boolean,
  ): Promise<PrizeRow> {
    const id = parsePositiveInteger(idInput, "景品ID");
    if (typeof isWonInput !== "boolean") validationProblem("景品状態が不正です。");
    return this.runAdminMutation(
      generation,
      actor,
      "togglePrizeWon",
      { id, isWon: isWonInput },
      () => {
        if (this.findPrizeById(id) === null) notFoundProblem("景品が見つかりません。");
        const row = this.ctx.storage.sql
          .exec<PrizeSqlRow>(
            "UPDATE prizes SET is_won = ?, updated_at = ? WHERE id = ? RETURNING *",
            isWonInput ? 1 : 0,
            new Date().toISOString(),
            id,
          )
          .one();
        return this.toPrizeRow(row);
      },
    );
  }

  async reorderPrizeGroup(
    generation: string,
    actor: string,
    orderedIdsInput: number[],
  ): Promise<PrizeRow[]> {
    if (!Array.isArray(orderedIdsInput) || orderedIdsInput.length < 2) {
      validationProblem("景品の表示順が不正です。");
    }
    const orderedIds = orderedIdsInput.map((id) => parsePositiveInteger(id, "景品ID"));
    if (new Set(orderedIds).size !== orderedIds.length) {
      validationProblem("景品の表示順が不正です。");
    }

    return this.runAdminMutation(generation, actor, "reorderPrizeGroup", { orderedIds }, () => {
      const requested = orderedIds.map((id) => {
        const prize = this.findPrizeById(id);
        if (prize === null) notFoundProblem("表示順を変更する景品が見つかりません。");
        return prize;
      });
      const groupIsWon = requested[0].is_won;
      if (requested.some((prize) => prize.is_won !== groupIsWon)) {
        validationProblem("未当選と当選済みをまたいだ並び替えはできません。");
      }

      const group = this.ctx.storage.sql
        .exec<PrizeSqlRow>(
          "SELECT * FROM prizes WHERE is_won = ? ORDER BY sort_order ASC, id ASC",
          groupIsWon,
        )
        .toArray();
      const requestedSet = new Set(orderedIds);
      const nextIds = [
        ...orderedIds,
        ...group.map((prize) => prize.id).filter((id) => !requestedSet.has(id)),
      ];
      const now = new Date().toISOString();
      nextIds.forEach((id, index) => {
        this.ctx.storage.sql.exec(
          "UPDATE prizes SET sort_order = ?, updated_at = ? WHERE id = ? AND is_won = ?",
          (index + 1) * PRIZE_SORT_ORDER_STEP,
          now,
          id,
          groupIsWon,
        );
      });
      return this.readPrizes();
    });
  }

  async deletePrize(generation: string, actor: string, idInput: number): Promise<null> {
    const id = parsePositiveInteger(idInput, "景品ID");
    return this.runAdminMutation(generation, actor, "deletePrize", { id }, () => {
      if (this.findPrizeById(id) === null) notFoundProblem("景品が見つかりません。");
      this.ctx.storage.sql.exec("DELETE FROM prizes WHERE id = ?", id);
      return null;
    });
  }

  async exportSnapshot(generation: string): Promise<GameSnapshot> {
    this.ensureActiveGeneration(generation);
    return {
      schema_version: 1,
      source_generation: generation,
      revision: this.readRevision(),
      created_at: new Date().toISOString(),
      numbers: this.readNumbers(),
      prizes: this.readStoredPrizes(),
      app_state: this.readAppState(),
      reach_logs: this.ctx.storage.sql
        .exec<ReachLogSqlRow>("SELECT * FROM reach_logs ORDER BY id ASC")
        .toArray(),
      reach_submissions: this.ctx.storage.sql
        .exec<ReachSubmissionSqlRow>(
          "SELECT client_hash, created_at FROM reach_submissions ORDER BY created_at ASC, client_hash ASC",
        )
        .toArray(),
      audit_log: this.ctx.storage.sql
        .exec<AuditLogSqlRow>("SELECT * FROM audit_log ORDER BY id ASC")
        .toArray(),
    };
  }

  async createSnapshot(generation: string) {
    return storeSnapshot(this.env, await this.exportSnapshot(generation));
  }

  async storeImportedSnapshot(generation: string, snapshotInput: GameSnapshot) {
    this.ensureActiveGeneration(generation);
    const snapshot = parseSnapshot(snapshotInput);
    return storeSnapshot(this.env, { ...snapshot, source_generation: generation });
  }

  async initializeFromSnapshot(
    generation: string,
    snapshotInput: GameSnapshot,
    actor: string,
  ): Promise<BingoUnifiedState> {
    assertGeneration(generation);
    this.assertActor(actor);
    const snapshot = parseSnapshot(snapshotInput);
    const installChecksum = await sha256Hex(JSON.stringify(snapshot));
    const existingGeneration = this.readMetadata("generation");
    if (existingGeneration !== null) {
      const installStatus = this.readMetadata(SNAPSHOT_INSTALL_STATUS_KEY);
      if (
        existingGeneration === generation &&
        this.readMetadata(SNAPSHOT_INSTALL_CHECKSUM_KEY) === installChecksum &&
        (installStatus === SNAPSHOT_INSTALL_INSTALLED || installStatus === SNAPSHOT_INSTALL_READY)
      ) {
        return this.readState(generation);
      }
      conflictProblem("復元先generationは既に別の状態で初期化されています。");
    }

    this.ctx.storage.transactionSync(() => {
      this.ctx.storage.sql.exec(
        "INSERT INTO game_metadata (key, value) VALUES " +
          "('generation', ?), ('revision', ?), ('initialized_by', ?), " +
          "('initialized_at', ?), ('source_generation', ?), ('reach_submission_count', ?), " +
          "('activation_token', ?), (?, ?), (?, ?)",
        generation,
        String(snapshot.revision),
        actor,
        new Date().toISOString(),
        snapshot.source_generation,
        String(snapshot.reach_submissions.length),
        INITIAL_ACTIVATION_TOKEN,
        SNAPSHOT_INSTALL_CHECKSUM_KEY,
        installChecksum,
        SNAPSHOT_INSTALL_STATUS_KEY,
        SNAPSHOT_INSTALL_INSTALLED,
      );
      this.ctx.storage.sql.exec(
        "INSERT INTO app_state " +
          "(id, survey_url, is_survey_active, reach_count, updated_at) VALUES (1, ?, ?, ?, ?)",
        snapshot.app_state.survey_url,
        snapshot.app_state.is_survey_active ? 1 : 0,
        snapshot.app_state.reach_count,
        snapshot.app_state.updated_at,
      );
      for (const row of snapshot.numbers) {
        this.ctx.storage.sql.exec(
          "INSERT INTO numbers (id, number, created_at, updated_at) VALUES (?, ?, ?, ?)",
          row.id,
          row.number,
          row.created_at,
          row.updated_at,
        );
      }
      for (const row of snapshot.prizes) {
        this.ctx.storage.sql.exec(
          "INSERT INTO prizes " +
            "(id, name_jp, name_en, image_path, is_won, sort_order, created_at, updated_at) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          row.id,
          row.name_jp,
          row.name_en,
          row.image_path,
          row.is_won ? 1 : 0,
          row.sort_order,
          row.created_at,
          row.updated_at,
        );
      }
      for (const row of snapshot.reach_logs) {
        this.ctx.storage.sql.exec(
          "INSERT INTO reach_logs (id, delta, reach_num, source, created_at) VALUES (?, ?, ?, ?, ?)",
          row.id,
          row.delta,
          row.reach_num,
          row.source,
          row.created_at,
        );
      }
      for (const row of snapshot.reach_submissions) {
        this.ctx.storage.sql.exec(
          "INSERT INTO reach_submissions (client_hash, created_at) VALUES (?, ?)",
          row.client_hash,
          row.created_at,
        );
      }
      for (const row of snapshot.audit_log) {
        this.ctx.storage.sql.exec(
          "INSERT INTO audit_log " +
            "(id, revision, actor, action, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)",
          row.id,
          row.revision,
          row.actor,
          row.action,
          row.payload_json,
          row.created_at,
        );
      }
    });
    return this.readState(generation);
  }

  async completeSnapshotInstallation(generation: string): Promise<void> {
    this.ensureGeneration(generation);
    const status = this.readMetadata(SNAPSHOT_INSTALL_STATUS_KEY);
    if (status === SNAPSHOT_INSTALL_READY) return;
    if (
      status !== SNAPSHOT_INSTALL_INSTALLED ||
      this.readMetadata(SNAPSHOT_INSTALL_CHECKSUM_KEY) === null
    ) {
      conflictProblem("snapshot installation marker が不正です。");
    }
    this.ctx.storage.sql.exec(
      "UPDATE game_metadata SET value = ? WHERE key = ?",
      SNAPSHOT_INSTALL_READY,
      SNAPSHOT_INSTALL_STATUS_KEY,
    );
  }

  async prepareActivation(generation: string, activationToken: string): Promise<void> {
    this.ensureGeneration(generation);
    if (this.readMetadata(SNAPSHOT_INSTALL_STATUS_KEY) === SNAPSHOT_INSTALL_INSTALLED) {
      conflictProblem("snapshot installation が完了していません。");
    }
    assertActivationToken(activationToken);
    this.ctx.storage.transactionSync(() => {
      this.ctx.storage.sql.exec(
        "INSERT INTO game_metadata (key, value) VALUES ('activation_token', ?) " +
          "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        activationToken,
      );
      this.ctx.storage.sql.exec("DELETE FROM game_metadata WHERE key = 'retired_to'");
    });
  }

  async freezeWrites(
    generation: string,
    nextGeneration: string,
    expectedActivationToken: string,
  ): Promise<void> {
    this.ensureGeneration(generation);
    assertGeneration(nextGeneration);
    assertActivationToken(expectedActivationToken);
    if (this.readMetadata("activation_token") !== expectedActivationToken) {
      conflictProblem("generation切り替えtokenが一致しません。");
    }
    this.ctx.storage.sql.exec(
      "INSERT INTO game_metadata (key, value) VALUES ('retired_to', ?) " +
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      nextGeneration,
    );
  }

  async unfreezeWrites(generation: string, expectedActivationToken: string): Promise<void> {
    this.ensureGeneration(generation);
    assertActivationToken(expectedActivationToken);
    if (this.readMetadata("activation_token") !== expectedActivationToken) {
      conflictProblem("generation切り替えtokenが一致しません。");
    }
    this.ctx.storage.sql.exec("DELETE FROM game_metadata WHERE key = 'retired_to'");
  }

  async redirectClients(
    generation: string,
    nextGeneration: string,
    expectedActivationToken: string,
  ): Promise<number> {
    this.ensureGeneration(generation);
    assertGeneration(nextGeneration);
    assertActivationToken(expectedActivationToken);
    if (this.readMetadata("activation_token") !== expectedActivationToken) return 0;
    this.ctx.storage.sql.exec(
      "INSERT INTO game_metadata (key, value) VALUES ('retired_to', ?) " +
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      nextGeneration,
    );
    const sockets = this.ctx.getWebSockets("state");
    const socketMessage: StateSocketMessage = { type: "generation", generation: nextGeneration };
    const message = JSON.stringify(socketMessage);
    for (const socket of sockets) {
      safeSend(socket, message);
      safeClose(socket, 1012, "game generation changed");
    }
    return sockets.length;
  }

  async fetch(request: Request): Promise<Response> {
    if (request.method !== "GET" || request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return Response.json({ error: "WebSocket Upgrade が必要です。" }, { status: 426 });
    }
    const generation = request.headers.get("X-Bingo-Generation");
    assertGeneration(generation);
    this.ensureActiveGeneration(generation);
    const requestedView = request.headers.get("X-Bingo-View");
    const view = requestedView === "screen" ? "screen" : "public";
    if (view === "screen") {
      if (this.ctx.getWebSockets("screen").length >= MAX_SCREEN_STATE_SOCKETS) {
        return capacityResponse("会場画面の接続上限に達しています。");
      }
    } else if (this.ctx.getWebSockets("public").length >= MAX_PUBLIC_STATE_SOCKETS) {
      return capacityResponse("状態配信の接続上限に達しています。");
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.ctx.acceptWebSocket(server, ["state", view]);
    const attachment: StateSocketAttachment = {
      kind: "state",
      generation,
      view,
      expires_at: Date.now() + 30 * 60 * 1_000,
    };
    server.serializeAttachment(attachment);
    if (view === "screen") await scheduleScreenSocketExpiration(this.ctx, "screen");
    const initialMessage: StateSocketMessage = {
      type: "state",
      state: this.readState(generation),
    };
    safeSend(server, JSON.stringify(initialMessage));
    return new Response(null, { status: 101, webSocket: client });
  }

  async alarm(): Promise<void> {
    await expireScreenSockets(this.ctx, "screen");
  }

  async webSocketMessage(socket: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (message !== "ping") safeClose(socket, 1008, "unsupported message");
  }

  async webSocketError(socket: WebSocket, error: unknown): Promise<void> {
    console.error(
      JSON.stringify({
        message: "game state websocket error",
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
    if (currentVersion < 1) {
      const now = new Date().toISOString();
      this.ctx.storage.transactionSync(() => {
        this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS game_metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS numbers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        number INTEGER NOT NULL UNIQUE CHECK (number BETWEEN 1 AND 99),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS prizes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name_jp TEXT NOT NULL,
        name_en TEXT,
        image_path TEXT,
        is_won INTEGER NOT NULL DEFAULT 0 CHECK (is_won IN (0, 1)),
        sort_order INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS prizes_display_order_idx ON prizes(is_won, sort_order, id);
      CREATE TABLE IF NOT EXISTS app_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        survey_url TEXT NOT NULL DEFAULT '',
        is_survey_active INTEGER NOT NULL DEFAULT 0 CHECK (is_survey_active IN (0, 1)),
        reach_count INTEGER NOT NULL DEFAULT 0 CHECK (reach_count >= 0),
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS reach_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        delta INTEGER NOT NULL CHECK (delta IN (-1, 0, 1)),
        reach_num INTEGER NOT NULL CHECK (reach_num >= 0),
        source TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS reach_logs_latest_idx ON reach_logs(id DESC);
      CREATE TABLE IF NOT EXISTS reach_submissions (
        client_hash TEXT PRIMARY KEY,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        revision INTEGER NOT NULL,
        actor TEXT NOT NULL,
        action TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS audit_log_revision_idx ON audit_log(revision DESC);
        `);
        this.ctx.storage.sql.exec(
          "INSERT OR IGNORE INTO _sql_schema_migrations (id, applied_at) VALUES (1, ?)",
          now,
        );
      });
    }

    if (currentVersion < 2) {
      const now = new Date().toISOString();
      this.ctx.storage.transactionSync(() => {
        this.ctx.storage.sql.exec(
          "INSERT OR IGNORE INTO game_metadata (key, value) " +
            "SELECT 'reach_submission_count', " +
            "CAST((SELECT COUNT(*) FROM reach_submissions) AS TEXT) " +
            "WHERE EXISTS (SELECT 1 FROM game_metadata WHERE key = 'generation')",
        );
        this.ctx.storage.sql.exec(
          "INSERT OR IGNORE INTO _sql_schema_migrations (id, applied_at) VALUES (2, ?)",
          now,
        );
      });
    }

    if (currentVersion < 3) {
      const now = new Date().toISOString();
      this.ctx.storage.transactionSync(() => {
        this.ctx.storage.sql.exec(
          "INSERT OR IGNORE INTO game_metadata (key, value) " +
            "SELECT 'activation_token', ? " +
            "WHERE EXISTS (SELECT 1 FROM game_metadata WHERE key = 'generation')",
          INITIAL_ACTIVATION_TOKEN,
        );
        this.ctx.storage.sql.exec(
          "INSERT OR IGNORE INTO _sql_schema_migrations (id, applied_at) VALUES (3, ?)",
          now,
        );
      });
    }
  }

  private ensureGeneration(generation: string): void {
    assertGeneration(generation);
    const existing = this.readMetadata("generation");
    if (existing === generation) return;
    if (existing !== null) conflictProblem("Durable Object のgenerationが一致しません。");

    this.ctx.storage.transactionSync(() => {
      const concurrent = this.readMetadata("generation");
      if (concurrent !== null && concurrent !== generation) {
        conflictProblem("Durable Object のgenerationが一致しません。");
      }
      if (concurrent === generation) return;
      const now = new Date().toISOString();
      this.ctx.storage.sql.exec(
        "INSERT INTO game_metadata (key, value) " +
          "VALUES ('generation', ?), ('revision', '0'), ('reach_submission_count', '0'), " +
          "('activation_token', ?)",
        generation,
        INITIAL_ACTIVATION_TOKEN,
      );
      this.ctx.storage.sql.exec(
        "INSERT INTO app_state " +
          "(id, survey_url, is_survey_active, reach_count, updated_at) VALUES (1, '', 0, 0, ?)",
        now,
      );
    });
  }

  private ensureActiveGeneration(generation: string): void {
    this.ensureGeneration(generation);
    const retiredTo = this.readMetadata("retired_to");
    if (retiredTo !== null) {
      conflictProblem(`このgenerationは ${retiredTo} へ切り替え済みです。`);
    }
  }

  private runAdminMutation<T>(
    generation: string,
    actor: string,
    action: string,
    payload: unknown,
    operation: () => T,
  ): T {
    this.ensureActiveGeneration(generation);
    this.assertActor(actor);
    const payloadJson = JSON.stringify(payload);
    if (new TextEncoder().encode(payloadJson).byteLength > MAX_AUDIT_PAYLOAD_BYTES) {
      validationProblem("監査ログpayloadが大きすぎます。");
    }

    const result = this.ctx.storage.transactionSync(() => {
      const data = operation();
      const revision = this.incrementRevision();
      this.ctx.storage.sql.exec(
        "INSERT INTO audit_log (revision, actor, action, payload_json, created_at) " +
          "VALUES (?, ?, ?, ?, ?)",
        revision,
        actor,
        action,
        payloadJson,
        new Date().toISOString(),
      );
      this.trimAuditLog();
      return data;
    });
    this.broadcastState(generation);
    return result;
  }

  private changeAdminReach(generation: string, actor: string, delta: 1 | -1): number {
    return this.runAdminMutation(
      generation,
      actor,
      delta === 1 ? "incrementReach" : "decrementReach",
      {},
      () => {
        const current = this.readAppState().reach_count;
        const next = delta === 1 ? current + 1 : Math.max(0, current - 1);
        const appliedDelta = next === current ? 0 : delta;
        const now = new Date().toISOString();
        this.ctx.storage.sql.exec(
          "UPDATE app_state SET reach_count = ?, updated_at = ? WHERE id = 1",
          next,
          now,
        );
        this.ctx.storage.sql.exec(
          "INSERT INTO reach_logs (delta, reach_num, source, created_at) VALUES (?, ?, 'admin', ?)",
          appliedDelta,
          next,
          now,
        );
        this.trimReachLogs();
        return next;
      },
    );
  }

  private readState(generation: string): BingoUnifiedState {
    const revision = this.readRevision();
    if (this.cachedState?.generation === generation && this.cachedState.revision === revision) {
      return { ...this.cachedState, serverTime: new Date().toISOString() };
    }

    const state: CachedGameState = {
      generation,
      revision,
      numbers: this.readNumbers(),
      prizes: this.readPrizes(),
      appState: this.readAppState(),
      latestReachLog: this.readLatestReachLog(),
    };
    this.cachedState = state;
    return { ...state, serverTime: new Date().toISOString() };
  }

  private readNumbers(): NumberRow[] {
    return this.ctx.storage.sql
      .exec<NumberSqlRow>("SELECT id, number, created_at, updated_at FROM numbers ORDER BY id ASC")
      .toArray();
  }

  private readStoredPrizes(): StoredPrizeRow[] {
    return this.ctx.storage.sql
      .exec<PrizeSqlRow>("SELECT * FROM prizes ORDER BY is_won ASC, sort_order ASC, id ASC")
      .toArray()
      .map(toStoredPrizeRow);
  }

  private readPrizes(): PrizeRow[] {
    return this.ctx.storage.sql
      .exec<PrizeSqlRow>("SELECT * FROM prizes ORDER BY is_won ASC, sort_order ASC, id ASC")
      .toArray()
      .map((row) => this.toPrizeRow(row));
  }

  private readAppState(): AppStateRow {
    return toAppStateRow(
      this.ctx.storage.sql
        .exec<AppStateSqlRow>(
          "SELECT id, survey_url, is_survey_active, reach_count, updated_at FROM app_state WHERE id = 1",
        )
        .one(),
    );
  }

  private readLatestReachLog(): ReachLogRow | null {
    return (
      this.ctx.storage.sql
        .exec<ReachLogSqlRow>("SELECT * FROM reach_logs ORDER BY id DESC LIMIT 1")
        .toArray()[0] ?? null
    );
  }

  private findNumberById(id: number): NumberRow | null {
    return (
      this.ctx.storage.sql
        .exec<NumberSqlRow>(
          "SELECT id, number, created_at, updated_at FROM numbers WHERE id = ? LIMIT 1",
          id,
        )
        .toArray()[0] ?? null
    );
  }

  private findNumberByValue(number: number): NumberRow | null {
    return (
      this.ctx.storage.sql
        .exec<NumberSqlRow>(
          "SELECT id, number, created_at, updated_at FROM numbers WHERE number = ? LIMIT 1",
          number,
        )
        .toArray()[0] ?? null
    );
  }

  private findPrizeById(id: number): PrizeSqlRow | null {
    return (
      this.ctx.storage.sql
        .exec<PrizeSqlRow>("SELECT * FROM prizes WHERE id = ? LIMIT 1", id)
        .toArray()[0] ?? null
    );
  }

  private toPrizeRow(row: PrizeSqlRow): PrizeRow {
    const stored = toStoredPrizeRow(row);
    return { ...stored, image_url: resolveImageUrl(stored.image_path, this.env.MEDIA_ORIGIN) };
  }

  private readMetadata(key: string): string | null {
    return (
      this.ctx.storage.sql
        .exec<MetadataSqlRow>("SELECT value FROM game_metadata WHERE key = ? LIMIT 1", key)
        .toArray()[0]?.value ?? null
    );
  }

  private readRevision(): number {
    return this.ctx.storage.sql
      .exec<RevisionSqlRow>(
        "SELECT CAST(value AS INTEGER) AS revision FROM game_metadata WHERE key = 'revision'",
      )
      .one().revision;
  }

  private incrementRevision(): number {
    return this.ctx.storage.sql
      .exec<RevisionSqlRow>(
        "UPDATE game_metadata SET value = CAST(value AS INTEGER) + 1 WHERE key = 'revision' " +
          "RETURNING CAST(value AS INTEGER) AS revision",
      )
      .one().revision;
  }

  private trimAuditLog(): void {
    this.ctx.storage.sql.exec(
      "DELETE FROM audit_log WHERE id <= last_insert_rowid() - ?",
      MAX_AUDIT_LOG_ROWS,
    );
  }

  private trimReachLogs(): void {
    this.ctx.storage.sql.exec(
      "DELETE FROM reach_logs WHERE id <= last_insert_rowid() - ?",
      MAX_REACH_LOGS,
    );
  }

  private broadcastState(generation: string): void {
    const socketMessage: StateSocketMessage = {
      type: "state",
      state: this.readState(generation),
    };
    const message = JSON.stringify(socketMessage);
    for (const socket of this.ctx.getWebSockets("state")) safeSend(socket, message);
  }

  private assertActor(actor: string): void {
    if (actor.trim() === "" || actor.length > 320) validationProblem("actor が不正です。");
  }
}

function toStoredPrizeRow(row: PrizeSqlRow): StoredPrizeRow {
  return { ...row, is_won: row.is_won === 1 };
}

function toAppStateRow(row: AppStateSqlRow): AppStateRow {
  return { ...row, is_survey_active: row.is_survey_active === 1 };
}

function assertClientHash(value: string): void {
  if (!/^[a-f0-9]{64}$/.test(value)) validationProblem("client hash が不正です。");
}

function assertActivationToken(value: string): void {
  if (!/^[a-zA-Z0-9-]{1,64}$/.test(value)) validationProblem("activation token が不正です。");
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
