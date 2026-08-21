import { DurableObject } from "cloudflare:workers";

import {
  assertGeneration,
  DEFAULT_GENERATION,
  type DirectoryActivation,
  validationProblem,
} from "./domain";
import { handleSnapshotAdminRequest } from "./snapshot-admin";

type MetadataRow = { value: string };
type VersionRow = { version: number };
type RedirectRow = {
  id: number;
  previous_generation: string;
  next_generation: string;
  previous_token: string;
  attempts: number;
  next_at: number;
  expires_at: number;
  status: "pending" | "failed";
  last_error: string | null;
};
type GuardedActivationResult =
  | { ok: true; activation: DirectoryActivation }
  | { ok: false; generation: string; version: number };

type ActivationTransitionPhase =
  | "preparing_target"
  | "target_prepared"
  | "freezing_source"
  | "source_frozen";
type ActivationTransition = {
  sourceGeneration: string;
  sourceToken: string;
  targetGeneration: string;
  targetToken: string;
  actor: string;
  phase: ActivationTransitionPhase;
};
const INITIAL_ACTIVATION_TOKEN = "initial";
const REDIRECT_MAX_ATTEMPTS = 300;
const REDIRECT_LIFETIME_MS = 24 * 60 * 60 * 1_000;
const REDIRECT_MAX_BACKOFF_MS = 5 * 60 * 1_000;

export class GameDirectory extends DurableObject<Env> {
  private activationTail: Promise<void> = Promise.resolve();
  private activeGenerationCache: string | null = null;
  private freezeTransitionInProgress = false;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.migrate();
      await this.recoverInterruptedActivation();
      await this.recoverInterruptedFreeze();
      await this.scheduleNextRedirectAlarm();
    });
  }

  async fetch(request: Request): Promise<Response> {
    return handleSnapshotAdminRequest(request, this.env, (generation, actor) =>
      this.activateGeneration(generation, actor),
    );
  }

  async getActiveGeneration(): Promise<string> {
    if (!this.freezeTransitionInProgress) {
      await this.recoverInterruptedActivation();
      await this.recoverInterruptedFreeze();
    }
    const cached = this.activeGenerationCache;
    if (cached !== null) return cached;
    const generation = this.readMetadata("active_generation") ?? DEFAULT_GENERATION;
    this.activeGenerationCache = generation;
    return generation;
  }

  async getStatus(): Promise<{ generation: string; version: number; pendingRedirects: number }> {
    const generation = await this.getActiveGeneration();
    await this.scheduleNextRedirectAlarm();
    return {
      generation,
      version: this.readVersion(),
      pendingRedirects: this.countPendingRedirects(),
    };
  }

  async activateGeneration(generation: string, actor: string): Promise<DirectoryActivation> {
    this.validateActivationInput(generation, actor);
    const result = await this.enqueueActivation(generation, actor);
    if (!result.ok) throw new Error("unguarded activation unexpectedly conflicted");
    return result.activation;
  }

  async activateGenerationGuarded(
    generation: string,
    actor: string,
    expectedGeneration: string,
    expectedVersion: number,
  ): Promise<GuardedActivationResult> {
    this.validateActivationInput(generation, actor);
    assertGeneration(expectedGeneration);
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) {
      validationProblem("generation切り替えversionが不正です。");
    }
    return this.enqueueActivation(generation, actor, { expectedGeneration, expectedVersion });
  }

  private async enqueueActivation(
    generation: string,
    actor: string,
    guard?: { expectedGeneration: string; expectedVersion: number },
  ): Promise<GuardedActivationResult> {
    const predecessor = this.activationTail;
    let release = (): void => undefined;
    this.activationTail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await predecessor;
    try {
      if (!this.freezeTransitionInProgress) await this.recoverInterruptedFreeze();
      const currentGeneration = this.readMetadata("active_generation") ?? DEFAULT_GENERATION;
      const currentVersion = this.readVersion();
      if (
        guard !== undefined &&
        (currentGeneration !== guard.expectedGeneration || currentVersion !== guard.expectedVersion)
      ) {
        return { ok: false, generation: currentGeneration, version: currentVersion };
      }
      return { ok: true, activation: await this.activateSerialized(generation, actor) };
    } finally {
      release();
    }
  }

  private validateActivationInput(generation: string, actor: string): void {
    assertGeneration(generation);
    if (actor.trim() === "" || actor.length > 320) validationProblem("actor が不正です。");
  }

  async alarm(): Promise<void> {
    const due = this.ctx.storage.sql
      .exec<RedirectRow>(
        "SELECT * FROM pending_redirects " +
          "WHERE status = 'pending' AND next_at <= ? ORDER BY next_at ASC, id ASC LIMIT 10",
        Date.now(),
      )
      .toArray();
    for (const redirect of due) await this.processRedirect(redirect.id);
    await this.scheduleNextRedirectAlarm();
  }

  private async activateSerialized(
    generation: string,
    actor: string,
  ): Promise<DirectoryActivation> {
    const previousGeneration = this.readMetadata("active_generation") ?? DEFAULT_GENERATION;
    const previousToken = this.readMetadata("active_token") ?? INITIAL_ACTIVATION_TOKEN;
    if (previousGeneration === generation) {
      this.activeGenerationCache = generation;
      return {
        generation,
        previousGeneration,
        version: this.readVersion(),
        redirectQueued: false,
        pendingRedirects: this.countPendingRedirects(),
      };
    }

    const activationToken = crypto.randomUUID();
    const transition: ActivationTransition = {
      sourceGeneration: previousGeneration,
      sourceToken: previousToken,
      targetGeneration: generation,
      targetToken: activationToken,
      actor,
      phase: "preparing_target",
    };
    const target = this.env.GAME_STATE.getByName(`game:${generation}`);
    const previousState = this.env.GAME_STATE.getByName(`game:${previousGeneration}`);
    this.freezeTransitionInProgress = true;
    this.persistActivationTransition(transition);

    let committed:
      | {
          generation: string;
          previousGeneration: string;
          version: number;
          redirectId: number;
        }
      | undefined;
    try {
      await target.prepareActivation(generation, activationToken);
      this.updateActivationTransitionPhase("target_prepared");
      this.updateActivationTransitionPhase("freezing_source");
      await previousState.freezeWrites(previousGeneration, generation, previousToken);
      this.updateActivationTransitionPhase("source_frozen");

      committed = this.ctx.storage.transactionSync(() => {
        const currentGeneration = this.readMetadata("active_generation") ?? DEFAULT_GENERATION;
        const currentToken = this.readMetadata("active_token") ?? INITIAL_ACTIVATION_TOKEN;
        if (currentGeneration !== previousGeneration || currentToken !== previousToken) {
          throw new Error("active generation changed during activation");
        }
        this.ctx.storage.sql.exec(
          "DELETE FROM pending_redirects " + "WHERE previous_generation = ? AND status = 'pending'",
          generation,
        );
        this.clearPendingFreeze();
        this.clearActivationTransition();

        const changedAt = new Date().toISOString();
        const changedAtMs = Date.now();
        this.ctx.storage.sql.exec(
          "UPDATE directory_metadata SET value = ? WHERE key = 'active_generation'",
          generation,
        );
        this.ctx.storage.sql.exec(
          "UPDATE directory_metadata SET value = ? WHERE key = 'active_token'",
          activationToken,
        );
        const version = this.ctx.storage.sql
          .exec<VersionRow>(
            "UPDATE directory_metadata SET value = CAST(value AS INTEGER) + 1 " +
              "WHERE key = 'version' RETURNING CAST(value AS INTEGER) AS version",
          )
          .one().version;
        this.ctx.storage.sql.exec(
          "INSERT INTO activation_history " +
            "(version, previous_generation, generation, actor, created_at) " +
            "VALUES (?, ?, ?, ?, ?)",
          version,
          previousGeneration,
          generation,
          actor,
          changedAt,
        );
        this.ctx.storage.sql.exec(
          "DELETE FROM activation_history WHERE id <= last_insert_rowid() - 100",
        );
        const redirectId = this.ctx.storage.sql
          .exec<{ id: number }>(
            "INSERT INTO pending_redirects " +
              "(previous_generation, next_generation, previous_token, attempts, next_at, " +
              "expires_at, status, created_at, updated_at) " +
              "VALUES (?, ?, ?, 0, ?, ?, 'pending', ?, ?) RETURNING id",
            previousGeneration,
            generation,
            previousToken,
            changedAtMs,
            changedAtMs + REDIRECT_LIFETIME_MS,
            changedAt,
            changedAt,
          )
          .one().id;
        return { generation, previousGeneration, version, redirectId };
      });
    } catch (error) {
      this.freezeTransitionInProgress = false;
      try {
        await this.recoverInterruptedActivation();
        await this.recoverInterruptedFreeze();
      } catch (recoveryError) {
        console.error(
          JSON.stringify({
            message: "failed to recover interrupted generation activation",
            previousGeneration,
            generation,
            error: errorMessage(recoveryError),
          }),
        );
      }
      throw error;
    }

    this.freezeTransitionInProgress = false;
    this.activeGenerationCache = committed.generation;
    await this.processRedirect(committed.redirectId);
    await this.scheduleNextRedirectAlarm();
    return {
      generation: committed.generation,
      previousGeneration: committed.previousGeneration,
      version: committed.version,
      redirectQueued: true,
      pendingRedirects: this.countPendingRedirects(),
    };
  }

  private persistActivationTransition(transition: ActivationTransition): void {
    this.ctx.storage.transactionSync(() => {
      this.ctx.storage.sql.exec(
        "INSERT INTO directory_metadata (key, value) VALUES " +
          "('activation_transition_source_generation', ?), " +
          "('activation_transition_source_token', ?), " +
          "('activation_transition_target_generation', ?), " +
          "('activation_transition_target_token', ?), " +
          "('activation_transition_actor', ?), " +
          "('activation_transition_phase', ?) " +
          "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        transition.sourceGeneration,
        transition.sourceToken,
        transition.targetGeneration,
        transition.targetToken,
        transition.actor,
        transition.phase,
      );
    });
  }

  private updateActivationTransitionPhase(phase: ActivationTransitionPhase): void {
    const updated = this.ctx.storage.sql
      .exec<{ value: string }>(
        "UPDATE directory_metadata SET value = ? " +
          "WHERE key = 'activation_transition_phase' RETURNING value",
        phase,
      )
      .toArray();
    if (updated.length !== 1) throw new Error("activation transition metadata is missing");
  }

  private readActivationTransition(): ActivationTransition | null {
    const rows = this.ctx.storage.sql
      .exec<{ key: string; value: string }>(
        "SELECT key, value FROM directory_metadata WHERE key LIKE 'activation_transition_%'",
      )
      .toArray();
    if (rows.length === 0) return null;
    const metadata = Object.fromEntries(rows.map((row) => [row.key, row.value])) as Record<
      string,
      string
    >;
    const sourceGeneration = metadata.activation_transition_source_generation;
    const sourceToken = metadata.activation_transition_source_token;
    const targetGeneration = metadata.activation_transition_target_generation;
    const targetToken = metadata.activation_transition_target_token;
    const actor = metadata.activation_transition_actor;
    const phase = metadata.activation_transition_phase;
    if (
      sourceGeneration === undefined ||
      sourceToken === undefined ||
      targetGeneration === undefined ||
      targetToken === undefined ||
      actor === undefined ||
      phase === undefined
    ) {
      throw new Error("activation transition metadata is incomplete");
    }
    assertGeneration(sourceGeneration);
    assertGeneration(targetGeneration);
    if (!/^[a-zA-Z0-9-]{1,64}$/.test(sourceToken) || !/^[a-zA-Z0-9-]{1,64}$/.test(targetToken)) {
      throw new Error("activation transition token is invalid");
    }
    if (
      phase !== "preparing_target" &&
      phase !== "target_prepared" &&
      phase !== "freezing_source" &&
      phase !== "source_frozen"
    ) {
      throw new Error("activation transition phase is invalid");
    }
    return {
      sourceGeneration,
      sourceToken,
      targetGeneration,
      targetToken,
      actor,
      phase,
    };
  }

  private clearActivationTransition(): void {
    this.ctx.storage.sql.exec(
      "DELETE FROM directory_metadata WHERE key LIKE 'activation_transition_%'",
    );
  }

  private async recoverInterruptedActivation(): Promise<void> {
    const transition = this.readActivationTransition();
    if (transition === null) return;
    const activeGeneration = this.readMetadata("active_generation") ?? DEFAULT_GENERATION;
    const activeToken = this.readMetadata("active_token") ?? INITIAL_ACTIVATION_TOKEN;
    if (
      activeGeneration !== transition.sourceGeneration ||
      activeToken !== transition.sourceToken
    ) {
      throw new Error("active generation does not match interrupted activation source");
    }

    if (transition.phase === "freezing_source" || transition.phase === "source_frozen") {
      const source = this.env.GAME_STATE.getByName(`game:${transition.sourceGeneration}`);
      await source.unfreezeWrites(transition.sourceGeneration, transition.sourceToken);
    }
    const target = this.env.GAME_STATE.getByName(`game:${transition.targetGeneration}`);
    await target.redirectClients(
      transition.targetGeneration,
      transition.sourceGeneration,
      transition.targetToken,
    );
    this.ctx.storage.transactionSync(() => {
      this.clearActivationTransition();
      this.clearPendingFreeze();
    });
    this.activeGenerationCache = transition.sourceGeneration;
    console.warn(
      JSON.stringify({
        message: "recovered interrupted generation activation",
        sourceGeneration: transition.sourceGeneration,
        targetGeneration: transition.targetGeneration,
        phase: transition.phase,
        actor: transition.actor,
      }),
    );
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
        .exec<VersionRow>("SELECT COALESCE(MAX(id), 0) AS version FROM _sql_schema_migrations")
        .one().version ?? 0;

    if (currentVersion < 1) {
      const now = new Date().toISOString();
      this.ctx.storage.transactionSync(() => {
        this.ctx.storage.sql.exec(`
          CREATE TABLE IF NOT EXISTS directory_metadata (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
          );
          CREATE TABLE IF NOT EXISTS activation_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            version INTEGER NOT NULL,
            previous_generation TEXT NOT NULL,
            generation TEXT NOT NULL,
            actor TEXT NOT NULL,
            created_at TEXT NOT NULL
          );
          CREATE INDEX IF NOT EXISTS activation_history_version_idx
            ON activation_history(version DESC);
        `);
        this.ctx.storage.sql.exec(
          "INSERT OR IGNORE INTO directory_metadata (key, value) " +
            "VALUES ('active_generation', ?), ('version', '1')",
          DEFAULT_GENERATION,
        );
        const historyCount = this.ctx.storage.sql
          .exec<{ count: number }>("SELECT COUNT(*) AS count FROM activation_history")
          .one().count;
        if (historyCount === 0) {
          this.ctx.storage.sql.exec(
            "INSERT INTO activation_history " +
              "(version, previous_generation, generation, actor, created_at) " +
              "VALUES (1, ?, ?, 'system', ?)",
            DEFAULT_GENERATION,
            DEFAULT_GENERATION,
            now,
          );
        }
        this.ctx.storage.sql.exec(
          "INSERT OR IGNORE INTO _sql_schema_migrations (id, applied_at) VALUES (1, ?)",
          now,
        );
      });
    }

    if (currentVersion < 2) {
      const now = new Date().toISOString();
      this.ctx.storage.transactionSync(() => {
        this.ctx.storage.sql.exec(`
          CREATE TABLE IF NOT EXISTS pending_redirects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            previous_generation TEXT NOT NULL,
            next_generation TEXT NOT NULL,
            attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
            next_at INTEGER NOT NULL,
            expires_at INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'failed')),
            last_error TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );
          CREATE INDEX IF NOT EXISTS pending_redirects_due_idx
            ON pending_redirects(status, next_at, id);
        `);
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
          "ALTER TABLE pending_redirects ADD COLUMN previous_token TEXT NOT NULL DEFAULT 'initial'",
        );
        this.ctx.storage.sql.exec(
          "INSERT OR IGNORE INTO directory_metadata (key, value) VALUES ('active_token', ?)",
          INITIAL_ACTIVATION_TOKEN,
        );
        this.ctx.storage.sql.exec(
          "INSERT OR IGNORE INTO _sql_schema_migrations (id, applied_at) VALUES (3, ?)",
          now,
        );
      });
    }
  }

  private async processRedirect(id: number): Promise<void> {
    const redirect = this.ctx.storage.sql
      .exec<RedirectRow>(
        "SELECT * FROM pending_redirects WHERE id = ? AND status = 'pending' LIMIT 1",
        id,
      )
      .toArray()[0];
    if (redirect === undefined) return;

    try {
      const previousState = this.env.GAME_STATE.getByName(`game:${redirect.previous_generation}`);
      await previousState.redirectClients(
        redirect.previous_generation,
        redirect.next_generation,
        redirect.previous_token,
      );
      this.ctx.storage.sql.exec("DELETE FROM pending_redirects WHERE id = ?", id);
      return;
    } catch (error) {
      const attempts = redirect.attempts + 1;
      const now = Date.now();
      const message = errorMessage(error).slice(0, 1_024);
      if (attempts >= REDIRECT_MAX_ATTEMPTS || now >= redirect.expires_at) {
        this.ctx.storage.sql.exec(
          "UPDATE pending_redirects SET attempts = ?, status = 'failed', last_error = ?, " +
            "updated_at = ? WHERE id = ?",
          attempts,
          message,
          new Date(now).toISOString(),
          id,
        );
        this.ctx.storage.sql.exec(
          "DELETE FROM pending_redirects WHERE status = 'failed' AND id NOT IN " +
            "(SELECT id FROM pending_redirects WHERE status = 'failed' ORDER BY id DESC LIMIT 100)",
        );
        console.error(
          JSON.stringify({
            message: "generation websocket redirect permanently failed",
            redirectId: id,
            previousGeneration: redirect.previous_generation,
            nextGeneration: redirect.next_generation,
            attempts,
            error: message,
          }),
        );
        return;
      }

      const backoffMs = Math.min(REDIRECT_MAX_BACKOFF_MS, 1_000 * 2 ** Math.min(attempts, 8));
      this.ctx.storage.sql.exec(
        "UPDATE pending_redirects SET attempts = ?, next_at = ?, last_error = ?, " +
          "updated_at = ? WHERE id = ?",
        attempts,
        now + backoffMs,
        message,
        new Date(now).toISOString(),
        id,
      );
      console.error(
        JSON.stringify({
          message: "generation websocket redirect scheduled for retry",
          redirectId: id,
          previousGeneration: redirect.previous_generation,
          nextGeneration: redirect.next_generation,
          attempts,
          nextRetryMs: backoffMs,
          error: message,
        }),
      );
    }
  }

  private async scheduleNextRedirectAlarm(): Promise<void> {
    const next = this.ctx.storage.sql
      .exec<{ next_at: number | null }>(
        "SELECT MIN(next_at) AS next_at FROM pending_redirects WHERE status = 'pending'",
      )
      .toArray()[0]?.next_at;
    if (typeof next !== "number") {
      await this.ctx.storage.deleteAlarm();
      return;
    }
    const desired = Math.max(Date.now() + 100, next);
    const existing = await this.ctx.storage.getAlarm();
    if (existing === null || existing > desired) await this.ctx.storage.setAlarm(desired);
  }

  private countPendingRedirects(): number {
    return this.ctx.storage.sql
      .exec<{ count: number }>(
        "SELECT COUNT(*) AS count FROM pending_redirects WHERE status = 'pending'",
      )
      .one().count;
  }

  private readMetadata(key: string): string | null {
    return (
      this.ctx.storage.sql
        .exec<MetadataRow>("SELECT value FROM directory_metadata WHERE key = ? LIMIT 1", key)
        .toArray()[0]?.value ?? null
    );
  }

  private readVersion(): number {
    return this.ctx.storage.sql
      .exec<VersionRow>(
        "SELECT CAST(value AS INTEGER) AS version FROM directory_metadata WHERE key = 'version'",
      )
      .one().version;
  }

  private clearPendingFreeze(): void {
    this.ctx.storage.sql.exec(
      "DELETE FROM directory_metadata WHERE key IN " +
        "('pending_freeze_generation', 'pending_freeze_token')",
    );
  }

  private async recoverInterruptedFreeze(): Promise<void> {
    const generation = this.readMetadata("pending_freeze_generation");
    const token = this.readMetadata("pending_freeze_token");
    if (generation === null && token === null) return;
    if (generation === null || token === null) {
      throw new Error("pending generation freeze metadata is incomplete");
    }

    const activeGeneration = this.readMetadata("active_generation") ?? DEFAULT_GENERATION;
    if (activeGeneration === generation) {
      const state = this.env.GAME_STATE.getByName(`game:${generation}`);
      await state.unfreezeWrites(generation, token);
    }
    this.clearPendingFreeze();
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
