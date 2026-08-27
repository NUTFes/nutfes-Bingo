import { DurableObject } from "cloudflare:workers";
import type { BingoUnifiedState, StateSocketMessage } from "../shared/bingo-transport";

import {
  assertPrizeImagePath,
  capacityProblem,
  conflictProblem,
  type AppStateRow,
  MAX_AUDIT_LOG_ROWS,
  MAX_AUDIT_PAYLOAD_BYTES,
  MAX_PRIZES,
  MAX_REACH_LOGS,
  MAX_REACH_SUBMISSIONS,
  type NumberRow,
  normalizeHttpsUrl,
  notFoundProblem,
  parseEventId,
  parseOptionalText,
  parsePositiveInteger,
  parseRequiredText,
  PRIZE_SORT_ORDER_STEP,
  type PrizeRow,
  type ReachLogRow,
  resolveImageUrl,
  type StoredPrizeRow,
  validationProblem,
} from "./domain";
import { capacityResponse } from "./http";
import { expireScreenSockets, scheduleScreenSocketExpiration } from "./screen-socket-expiration";

type MetadataSqlRow = { value: string };
type RevisionSqlRow = { revision: number };
type NumberSqlRow = NumberRow;
type PrizeSqlRow = Omit<StoredPrizeRow, "is_won"> & { is_won: number };
type AppStateSqlRow = Omit<AppStateRow, "is_survey_active"> & { is_survey_active: number };
type ReachLogSqlRow = ReachLogRow;
type CachedGameState = Omit<BingoUnifiedState, "serverTime">;

type StateSocketAttachment = {
  kind: "state";
  view: "public" | "screen";
  expires_at: number;
};

const MAX_STATE_SOCKETS = 2_000;
const MAX_SCREEN_STATE_SOCKETS = 16;
const MAX_PUBLIC_STATE_SOCKETS = MAX_STATE_SOCKETS - MAX_SCREEN_STATE_SOCKETS;
const PITR_EARLIEST_AT_KEY = "pitr_earliest_at";
const PITR_PENDING_TARGET_KEY = "pitr_pending_target";
const PITR_PENDING_UNDO_KEY = "pitr_pending_undo";
const PITR_PENDING_ACTOR_KEY = "pitr_pending_actor";
const PITR_PENDING_AT_KEY = "pitr_pending_at";
const PITR_WINDOW_MS = 30 * 24 * 60 * 60 * 1_000;
const PITR_BOOKMARK_PATTERN = /^[A-Za-z0-9-]{16,256}$/;

export class GameState extends DurableObject<Env> {
  private cachedState: CachedGameState | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.initializeSchema();
      this.ensureInitialized();
      // A scheduled restore is applied before a new session starts. Pending
      // metadata belongs to the previous session and must never freeze restored data.
      this.clearPendingRecovery();
    });
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
  }

  async getState(): Promise<BingoUnifiedState> {
    return this.readState();
  }

  async getStatus(): Promise<{
    eventId: string;
    revision: number;
    recoveryPending: boolean;
  }> {
    return {
      eventId: this.readAppState().event_id,
      revision: this.readRevision(),
      recoveryPending: this.readMetadata(PITR_PENDING_TARGET_KEY) !== null,
    };
  }

  async createNumber(actor: string, numberInput: number): Promise<NumberRow> {
    const number = parsePositiveInteger(numberInput, "番号", { max: 99 });
    return this.runAdminMutation(actor, "createNumber", { number }, () => {
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

  async deleteNumber(actor: string, numberInput: number): Promise<NumberRow> {
    const number = parsePositiveInteger(numberInput, "番号", { max: 99 });
    return this.runAdminMutation(actor, "deleteNumber", { number }, () => {
      const existing = this.findNumberByValue(number);
      if (existing === null) notFoundProblem("番号が見つかりません。");
      this.ctx.storage.sql.exec("DELETE FROM numbers WHERE number = ?", number);
      return existing;
    });
  }

  async updateNumber(actor: string, idInput: number, numberInput: number): Promise<NumberRow> {
    const id = parsePositiveInteger(idInput, "番号ID");
    const number = parsePositiveInteger(numberInput, "番号", { max: 99 });
    return this.runAdminMutation(actor, "updateNumber", { id, number }, () => {
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

  async incrementReach(actor: string): Promise<number> {
    return this.changeAdminReach(actor, 1);
  }

  async decrementReach(actor: string): Promise<number> {
    return this.changeAdminReach(actor, -1);
  }

  async recordPublicReach(clientHash: string): Promise<number> {
    this.assertRecoveryNotPending();
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
    actor: string,
    surveyUrlInput: string,
    surveyTitleInput: string,
    surveyDescriptionInput: string,
    surveyButtonLabelInput: string,
    isSurveyActiveInput: boolean,
  ): Promise<AppStateRow> {
    const surveyUrl = normalizeHttpsUrl(surveyUrlInput);
    const surveyTitle = parseOptionalText(surveyTitleInput, "アンケートタイトル", 200) ?? "";
    const surveyDescription =
      parseOptionalText(surveyDescriptionInput, "アンケート説明", 2_000) ?? "";
    const surveyButtonLabel =
      parseOptionalText(surveyButtonLabelInput, "アンケートボタン文言", 100) ?? "";
    if (typeof isSurveyActiveInput !== "boolean") validationProblem("公開設定が不正です。");
    if (
      isSurveyActiveInput &&
      (surveyUrl === "" ||
        surveyTitle === "" ||
        surveyDescription === "" ||
        surveyButtonLabel === "")
    ) {
      validationProblem("アンケートを公開する場合はURLと案内文をすべて入力してください。");
    }

    return this.runAdminMutation(
      actor,
      "saveSurveyState",
      { surveyUrl, isSurveyActive: isSurveyActiveInput },
      () => {
        const now = new Date().toISOString();
        const row = this.ctx.storage.sql
          .exec<AppStateSqlRow>(
            "UPDATE app_state SET survey_url = ?, survey_title = ?, survey_description = ?, " +
              "survey_button_label = ?, is_survey_active = ?, updated_at = ? WHERE id = 1 " +
              "RETURNING id, event_id, survey_url, survey_title, survey_description, " +
              "survey_button_label, is_survey_active, reach_count, updated_at",
            surveyUrl,
            surveyTitle,
            surveyDescription,
            surveyButtonLabel,
            isSurveyActiveInput ? 1 : 0,
            now,
          )
          .one();
        return toAppStateRow(row);
      },
    );
  }

  async startAnnualEvent(
    actor: string,
    expectedRevisionInput: number,
    expectedEventIdInput: string,
    newEventIdInput: string,
  ): Promise<{ eventId: string; revision: number }> {
    const expectedEventId = parseEventId(expectedEventIdInput);
    const newEventId = parseEventId(newEventIdInput);
    this.assertExpectedRevision(expectedRevisionInput);
    const currentEventId = this.readAppState().event_id;
    if (currentEventId !== expectedEventId) {
      conflictProblem("イベント確認後にイベントIDが変更されています。再読み込みしてください。");
    }
    if (newEventId === currentEventId) {
      conflictProblem("新しいイベントIDを指定してください。");
    }

    return this.runAdminMutation(
      actor,
      "startAnnualEvent",
      { previousEventId: currentEventId, eventId: newEventId },
      () => {
        const now = new Date().toISOString();
        this.ctx.storage.sql.exec("DELETE FROM numbers");
        this.ctx.storage.sql.exec("DELETE FROM prizes");
        this.ctx.storage.sql.exec("DELETE FROM reach_logs");
        this.ctx.storage.sql.exec("DELETE FROM reach_submissions");
        this.ctx.storage.sql.exec("DELETE FROM audit_log");
        this.ctx.storage.sql.exec(
          "UPDATE app_state SET event_id = ?, survey_url = '', survey_title = '', " +
            "survey_description = '', survey_button_label = '', is_survey_active = 0, " +
            "reach_count = 0, updated_at = ? WHERE id = 1",
          newEventId,
          now,
        );
        this.ctx.storage.sql.exec(
          "UPDATE game_metadata SET value = '0' WHERE key = 'reach_submission_count'",
        );
        return { eventId: newEventId, revision: expectedRevisionInput + 1 };
      },
    );
  }

  async createPrize(
    actor: string,
    nameJpInput: string,
    nameEnInput: string | null,
    imagePathInput?: string | null,
  ): Promise<PrizeRow> {
    const nameJp = parseRequiredText(nameJpInput, "景品名", 120);
    const nameEn = parseOptionalText(nameEnInput, "英語景品名", 160);
    const imagePath = imagePathInput ?? null;
    assertPrizeImagePath(imagePath);

    return this.runAdminMutation(actor, "createPrize", { nameJp, nameEn, imagePath }, () => {
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
    });
  }

  async updatePrize(
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

  async togglePrizeWon(actor: string, idInput: number, isWonInput: boolean): Promise<PrizeRow> {
    const id = parsePositiveInteger(idInput, "景品ID");
    if (typeof isWonInput !== "boolean") validationProblem("景品状態が不正です。");
    return this.runAdminMutation(actor, "togglePrizeWon", { id, isWon: isWonInput }, () => {
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
    });
  }

  async reorderPrizeGroup(actor: string, orderedIdsInput: number[]): Promise<PrizeRow[]> {
    if (!Array.isArray(orderedIdsInput) || orderedIdsInput.length < 2) {
      validationProblem("景品の表示順が不正です。");
    }
    const orderedIds = orderedIdsInput.map((id) => parsePositiveInteger(id, "景品ID"));
    if (new Set(orderedIds).size !== orderedIds.length) {
      validationProblem("景品の表示順が不正です。");
    }

    return this.runAdminMutation(actor, "reorderPrizeGroup", { orderedIds }, () => {
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
      const nextIds = [...orderedIds];
      for (const prize of group) {
        if (!requestedSet.has(prize.id)) nextIds.push(prize.id);
      }
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

  async deletePrize(actor: string, idInput: number): Promise<null> {
    const id = parsePositiveInteger(idInput, "景品ID");
    return this.runAdminMutation(actor, "deletePrize", { id }, () => {
      if (this.findPrizeById(id) === null) notFoundProblem("景品が見つかりません。");
      this.ctx.storage.sql.exec("DELETE FROM prizes WHERE id = ?", id);
      return null;
    });
  }

  async getRecoveryStatus(): Promise<{
    eventId: string;
    revision: number;
    currentBookmark: string;
    pitrEarliestAt: string;
    recoveryPending: boolean;
    pendingTargetBookmark: string | null;
    pendingUndoBookmark: string | null;
  }> {
    const pendingTargetBookmark = this.readMetadata(PITR_PENDING_TARGET_KEY);
    return {
      eventId: this.readAppState().event_id,
      revision: this.readRevision(),
      currentBookmark: await this.ctx.storage.getCurrentBookmark(),
      pitrEarliestAt: this.readPitrEarliestAt(),
      recoveryPending: pendingTargetBookmark !== null,
      pendingTargetBookmark,
      pendingUndoBookmark: this.readMetadata(PITR_PENDING_UNDO_KEY),
    };
  }

  async prepareRecovery(
    targetTimeInput: string,
    expectedRevision: number,
  ): Promise<{
    eventId: string;
    revision: number;
    targetTime: string;
    targetBookmark: string;
    currentBookmark: string;
    pitrEarliestAt: string;
  }> {
    this.assertExpectedRevision(expectedRevision);
    if (this.readMetadata(PITR_PENDING_TARGET_KEY) !== null) {
      conflictProblem("既にPITR recoveryが予約されています。");
    }

    const targetTime = new Date(targetTimeInput);
    const now = Date.now();
    const pitrEarliestAt = this.readPitrEarliestAt();
    const earliestTime = new Date(pitrEarliestAt).getTime();
    if (
      !Number.isFinite(targetTime.getTime()) ||
      targetTime.getTime() > now ||
      targetTime.getTime() < now - PITR_WINDOW_MS ||
      targetTime.getTime() < earliestTime
    ) {
      validationProblem(
        `targetTimeは${pitrEarliestAt}以降かつ過去30日以内の日時を指定してください。`,
      );
    }
    const [targetBookmark, currentBookmark] = await Promise.all([
      this.ctx.storage.getBookmarkForTime(targetTime),
      this.ctx.storage.getCurrentBookmark(),
    ]);
    return {
      eventId: this.readAppState().event_id,
      revision: expectedRevision,
      targetTime: targetTime.toISOString(),
      targetBookmark,
      currentBookmark,
      pitrEarliestAt,
    };
  }

  async scheduleRecovery(
    actor: string,
    targetBookmark: string,
    expectedCurrentBookmark: string,
    expectedRevision: number,
  ): Promise<{
    eventId: string;
    revision: number;
    targetBookmark: string;
    undoBookmark: string;
  }> {
    this.assertActor(actor);
    this.assertBookmark(targetBookmark);
    this.assertBookmark(expectedCurrentBookmark);
    this.assertExpectedRevision(expectedRevision);
    if (this.readMetadata(PITR_PENDING_TARGET_KEY) !== null) {
      conflictProblem("既にPITR recoveryが予約されています。");
    }

    const currentBookmark = await this.ctx.storage.getCurrentBookmark();
    if (currentBookmark !== expectedCurrentBookmark) {
      conflictProblem("PITR確認後にstateが変更されています。最初からやり直してください。");
    }

    // Schedule first: the returned undo bookmark must not contain the write
    // freeze markers, otherwise an undo would restore a permanently frozen state.
    const undoBookmark = await this.ctx.storage.onNextSessionRestoreBookmark(targetBookmark);
    this.ctx.storage.sql.exec(
      "INSERT INTO game_metadata (key, value) VALUES " + "(?, ?), (?, ?), (?, ?), (?, ?)",
      PITR_PENDING_TARGET_KEY,
      targetBookmark,
      PITR_PENDING_UNDO_KEY,
      undoBookmark,
      PITR_PENDING_ACTOR_KEY,
      actor,
      PITR_PENDING_AT_KEY,
      new Date().toISOString(),
    );
    return {
      eventId: this.readAppState().event_id,
      revision: expectedRevision,
      targetBookmark,
      undoBookmark,
    };
  }

  async restartForRecovery(targetBookmark: string): Promise<void> {
    this.assertBookmark(targetBookmark);
    if (
      this.readMetadata(PITR_PENDING_TARGET_KEY) !== targetBookmark ||
      this.readMetadata(PITR_PENDING_UNDO_KEY) === null
    ) {
      conflictProblem("予約済みPITR recoveryと一致しません。");
    }
    for (const socket of this.ctx.getWebSockets("state")) {
      safeClose(socket, 1012, "game state recovery");
    }
    this.ctx.abort("PITR recovery");
  }

  async fetch(request: Request): Promise<Response> {
    if (request.method !== "GET" || request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return Response.json({ error: "WebSocket Upgrade が必要です。" }, { status: 426 });
    }
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
      view,
      expires_at: Date.now() + 30 * 60 * 1_000,
    };
    server.serializeAttachment(attachment);
    if (view === "screen") await scheduleScreenSocketExpiration(this.ctx, "screen");
    const initialMessage: StateSocketMessage = {
      type: "state",
      state: this.readState(),
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

  private initializeSchema(): void {
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
        event_id TEXT NOT NULL,
        survey_url TEXT NOT NULL DEFAULT '',
        survey_title TEXT NOT NULL DEFAULT '',
        survey_description TEXT NOT NULL DEFAULT '',
        survey_button_label TEXT NOT NULL DEFAULT '',
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

    const appStateColumns = new Set(
      this.ctx.storage.sql
        .exec<{ name: string }>("PRAGMA table_info(app_state)")
        .toArray()
        .map((column) => column.name),
    );
    if (!appStateColumns.has("survey_title")) {
      this.ctx.storage.sql.exec(
        "ALTER TABLE app_state ADD COLUMN survey_title TEXT NOT NULL DEFAULT ''",
      );
    }
    if (!appStateColumns.has("survey_description")) {
      this.ctx.storage.sql.exec(
        "ALTER TABLE app_state ADD COLUMN survey_description TEXT NOT NULL DEFAULT ''",
      );
    }
    if (!appStateColumns.has("survey_button_label")) {
      this.ctx.storage.sql.exec(
        "ALTER TABLE app_state ADD COLUMN survey_button_label TEXT NOT NULL DEFAULT ''",
      );
    }
  }

  private ensureInitialized(): void {
    if (this.readMetadata("revision") !== null) return;

    this.ctx.storage.transactionSync(() => {
      if (this.readMetadata("revision") !== null) return;
      const now = new Date().toISOString();
      this.ctx.storage.sql.exec(
        "INSERT INTO game_metadata (key, value) VALUES " +
          "('revision', '0'), ('reach_submission_count', '0'), (?, ?)",
        PITR_EARLIEST_AT_KEY,
        now,
      );
      this.ctx.storage.sql.exec(
        "INSERT INTO app_state " +
          "(id, event_id, survey_url, is_survey_active, reach_count, updated_at) " +
          "VALUES (1, 'initial', '', 0, 0, ?)",
        now,
      );
    });
  }

  private runAdminMutation<T>(
    actor: string,
    action: string,
    payload: unknown,
    operation: () => T,
  ): T {
    this.assertRecoveryNotPending();
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
    this.broadcastState();
    return result;
  }

  private changeAdminReach(actor: string, delta: 1 | -1): number {
    return this.runAdminMutation(
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

  private readState(): BingoUnifiedState {
    const revision = this.readRevision();
    if (this.cachedState?.revision === revision) {
      return { ...this.cachedState, serverTime: new Date().toISOString() };
    }

    const state: CachedGameState = {
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
          "SELECT id, event_id, survey_url, survey_title, survey_description, " +
            "survey_button_label, is_survey_active, reach_count, updated_at " +
            "FROM app_state WHERE id = 1",
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

  private readPitrEarliestAt(): string {
    const value = this.readMetadata(PITR_EARLIEST_AT_KEY);
    if (value === null || !Number.isFinite(Date.parse(value))) {
      throw new Error("PITR lower bound metadata is corrupt");
    }
    return value;
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

  private broadcastState(): void {
    const socketMessage: StateSocketMessage = {
      type: "state",
      state: this.readState(),
    };
    const message = JSON.stringify(socketMessage);
    for (const socket of this.ctx.getWebSockets("state")) safeSend(socket, message);
  }

  private assertRecoveryNotPending(): void {
    if (this.readMetadata(PITR_PENDING_TARGET_KEY) !== null) {
      conflictProblem("PITR recovery中のためstate更新を停止しています。");
    }
  }

  private assertExpectedRevision(expectedRevision: number): void {
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
      validationProblem("expectedRevisionが不正です。");
    }
    if (this.readRevision() !== expectedRevision) {
      conflictProblem("確認後にrevisionが変更されています。最初からやり直してください。");
    }
  }

  private assertBookmark(bookmark: string): void {
    if (!PITR_BOOKMARK_PATTERN.test(bookmark)) {
      validationProblem("PITR bookmarkが不正です。");
    }
  }

  private clearPendingRecovery(): void {
    this.ctx.storage.sql.exec(
      "DELETE FROM game_metadata WHERE key IN (?, ?, ?, ?)",
      PITR_PENDING_TARGET_KEY,
      PITR_PENDING_UNDO_KEY,
      PITR_PENDING_ACTOR_KEY,
      PITR_PENDING_AT_KEY,
    );
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
