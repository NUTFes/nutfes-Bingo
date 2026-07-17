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
      await this.recoverInterruptedFreeze();
    });
  }

  async fetch(request: Request): Promise<Response> {
    return handleSnapshotAdminRequest(request, this.env, (generation, actor) =>
      this.activateGeneration(generation, actor),
    );
  }

  async getActiveGeneration(): Promise<string> {
    if (!this.freezeTransitionInProgress) await this.recoverInterruptedFreeze();
    const cached = this.activeGenerationCache;
    if (cached !== null) return cached;
    const generation = this.readMetadata("active_generation") ?? DEFAULT_GENERATION;
    this.activeGenerationCache = generation;
    return generation;
  }

  async getStatus(): Promise<{ generation: string; version: number; pendingRedirects: number }> {
    return {
      generation: await this.getActiveGeneration(),
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
    const activationToken = crypto.randomUUID();
    const target = this.env.GAME_STATE.getByName(`game:${generation}`);
    await target.prepareActivation(generation, activationToken);
    const previousState = this.env.GAME_STATE.getByName(`game:${previousGeneration}`);
    let previousFreezeAttempted = false;

    let committed:
      | {
          generation: string;
          previousGeneration: string;
          version: number;
          redirectId: number | null;
        }
      | undefined;
    try {
      if (previousGeneration !== generation) {
        this.freezeTransitionInProgress = true;
        this.persistPendingFreeze(previousGeneration, previousToken);
        previousFreezeAttempted = true;
        await previousState.freezeWrites(previousGeneration, generation, previousToken);
      }

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

        if (previousGeneration === generation) {
          this.ctx.storage.sql.exec(
            "UPDATE directory_metadata SET value = ? WHERE key = 'active_token'",
            activationToken,
          );
          return {
            generation,
            previousGeneration,
            version: this.readVersion(),
            redirectId: null,
          };
        }

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
      const activeGeneration = this.readMetadata("active_generation") ?? DEFAULT_GENERATION;
      if (previousFreezeAttempted && activeGeneration === previousGeneration) {
        try {
          await previousState.unfreezeWrites(previousGeneration, previousToken);
          this.clearPendingFreeze();
        } catch (unfreezeError) {
          console.error(
            JSON.stringify({
              message: "failed to unfreeze previous generation after activation failure",
              previousGeneration,
              error: errorMessage(unfreezeError),
            }),
          );
        }
      }
      if (activeGeneration !== generation) {
        try {
          await target.redirectClients(generation, activeGeneration, activationToken);
        } catch (retireError) {
          console.error(
            JSON.stringify({
              message: "failed to compensate target preparation",
              generation,
              activeGeneration,
              error: errorMessage(retireError),
            }),
          );
        }
      } else if (previousGeneration === generation) {
        try {
          await target.prepareActivation(generation, previousToken);
        } catch (resetError) {
          console.error(
            JSON.stringify({
              message: "failed to reset activation token after activation failure",
              generation,
              error: errorMessage(resetError),
            }),
          );
        }
      }
      this.freezeTransitionInProgress = false;
      throw error;
    }

    this.freezeTransitionInProgress = false;
    this.activeGenerationCache = committed.generation;
    if (committed.redirectId !== null) {
      await this.processRedirect(committed.redirectId);
      await this.scheduleNextRedirectAlarm();
    }
    return {
      generation: committed.generation,
      previousGeneration: committed.previousGeneration,
      version: committed.version,
      redirectQueued: committed.redirectId !== null,
      pendingRedirects: this.countPendingRedirects(),
    };
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

  private persistPendingFreeze(generation: string, token: string): void {
    this.ctx.storage.transactionSync(() => {
      this.ctx.storage.sql.exec(
        "INSERT INTO directory_metadata (key, value) VALUES " +
          "('pending_freeze_generation', ?), ('pending_freeze_token', ?) " +
          "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        generation,
        token,
      );
    });
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
