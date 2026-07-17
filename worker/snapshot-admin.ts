import {
  assertGeneration,
  canonicalLogicalSnapshotJson,
  type DirectoryActivation,
  type GameSnapshot,
  isGeneration,
  isRecord,
  MAX_SNAPSHOT_BYTES,
  parseSnapshot,
  snapshotIntegrityCounts,
  type SnapshotIntegrity,
} from "./domain";
import type { GameState } from "./game-state";
import {
  ApiError,
  assertMethod,
  errorResponse,
  getSameOrigin,
  jsonResponse,
  readJsonBody,
  sha256Hex,
} from "./http";
import { assertSnapshotFits, loadSnapshot } from "./snapshots";

export const SNAPSHOT_ADMIN_IDENTITY_HEADER = "X-Bingo-Verified-Admin";

type ActivateGeneration = (generation: string, actor: string) => Promise<DirectoryActivation>;

export async function handleSnapshotAdminRequest(
  request: Request,
  env: Env,
  activateGeneration: ActivateGeneration,
): Promise<Response> {
  let requestOrigin: string | null = null;
  try {
    requestOrigin = getSameOrigin(request);
    assertMethod(request, ["POST"]);
    const actor = request.headers.get(SNAPSHOT_ADMIN_IDENTITY_HEADER);
    if (actor === null || actor.trim() === "" || actor.length > 320) {
      throw new ApiError(403, "snapshot管理者identityが不正です。");
    }

    switch (new URL(request.url).pathname) {
      case "/admin/api/import":
        return await importSnapshot(request, env, actor, requestOrigin, activateGeneration);
      case "/admin/api/snapshots/restore":
        return await restoreSnapshot(request, env, actor, requestOrigin, activateGeneration);
      default:
        throw new ApiError(404, "snapshot管理APIが見つかりません。");
    }
  } catch (error) {
    return errorResponse(error, requestOrigin);
  }
}

async function importSnapshot(
  request: Request,
  env: Env,
  actor: string,
  requestOrigin: string | null,
  activateGeneration: ActivateGeneration,
): Promise<Response> {
  const body = await readJsonBody(request, MAX_SNAPSHOT_BYTES + 64 * 1024);
  if (!isRecord(body)) throw new ApiError(400, "import body が不正です。");
  const snapshot = parseSnapshot(body.snapshot);
  const generation =
    body.generation === undefined
      ? makeGeneration("import")
      : readGeneration(body.generation, "generation");
  assertSnapshotFits({ ...snapshot, source_generation: generation });
  const target = env.GAME_STATE.getByName(`game:${generation}`);
  const state = await target.initializeFromSnapshot(generation, snapshot, actor);
  const { integrity } = await verifySnapshotImport(snapshot, generation, target);
  const backup = await target.storeImportedSnapshot(generation, snapshot);
  const shouldActivate =
    body.activate === undefined ? false : readBoolean(body.activate, "activate");
  const activation = shouldActivate ? await activateGeneration(generation, actor) : null;

  return jsonResponse(
    {
      data: {
        generation,
        activated: shouldActivate,
        activation,
        backup,
        integrity,
        state,
      },
    },
    { status: 201 },
    { requestOrigin },
  );
}

async function restoreSnapshot(
  request: Request,
  env: Env,
  actor: string,
  requestOrigin: string | null,
  activateGeneration: ActivateGeneration,
): Promise<Response> {
  const body = await readJsonBody(request);
  if (!isRecord(body) || typeof body.key !== "string") {
    throw new ApiError(400, "snapshot restore body が不正です。");
  }
  const snapshot = await loadSnapshot(env, body.key);
  const generation =
    body.generation === undefined
      ? makeGeneration("restore")
      : readGeneration(body.generation, "generation");
  assertSnapshotFits({ ...snapshot, source_generation: generation });
  const target = env.GAME_STATE.getByName(`game:${generation}`);
  const state = await target.initializeFromSnapshot(generation, snapshot, actor);
  const { integrity } = await verifySnapshotImport(snapshot, generation, target);
  const shouldActivate =
    body.activate === undefined ? true : readBoolean(body.activate, "activate");
  const activation = shouldActivate ? await activateGeneration(generation, actor) : null;

  return jsonResponse(
    { data: { generation, activated: shouldActivate, activation, integrity, state } },
    { status: 201 },
    { requestOrigin },
  );
}

async function verifySnapshotImport(
  inputSnapshot: GameSnapshot,
  generation: string,
  target: DurableObjectStub<GameState>,
): Promise<{ integrity: SnapshotIntegrity; verifiedSnapshot: GameSnapshot }> {
  const verifiedSnapshot = await target.exportSnapshot(generation);
  const [inputChecksum, verifiedChecksum, inputSnapshotChecksum, readbackSnapshotChecksum] =
    await Promise.all([
      sha256Hex(canonicalLogicalSnapshotJson(inputSnapshot)),
      sha256Hex(canonicalLogicalSnapshotJson(verifiedSnapshot)),
      sha256Hex(JSON.stringify(inputSnapshot)),
      sha256Hex(JSON.stringify(verifiedSnapshot)),
    ]);
  const matches =
    inputChecksum === verifiedChecksum &&
    verifiedSnapshot.source_generation === generation &&
    verifiedSnapshot.revision === inputSnapshot.revision;
  if (!matches) {
    throw new ApiError(500, "snapshot import 後の論理整合性検証に失敗しました。");
  }

  return {
    integrity: {
      generation,
      revision: verifiedSnapshot.revision,
      input_checksum_sha256: inputChecksum,
      verified_checksum_sha256: verifiedChecksum,
      input_snapshot_checksum_sha256: inputSnapshotChecksum,
      readback_snapshot_checksum_sha256: readbackSnapshotChecksum,
      matches,
      counts: snapshotIntegrityCounts(verifiedSnapshot),
      coverage: {
        verified: [
          "generation",
          "revision",
          "numbers",
          "prizes",
          "app_state",
          "reach_logs",
          "reach_submissions",
          "audit_log",
        ],
        not_verified: [
          "R2 image object existence and bytes",
          "ephemeral reaction events and WebSocket connections",
          "historical audit rows beyond the bounded 200-row snapshot",
        ],
      },
    },
    verifiedSnapshot,
  };
}

function readBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") throw new ApiError(400, `${label} が不正です。`);
  return value;
}

function readGeneration(value: unknown, label: string): string {
  if (!isGeneration(value)) throw new ApiError(400, `${label} が不正です。`);
  return value;
}

function makeGeneration(prefix: "import" | "restore"): string {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 14);
  const generation = `${prefix}-${timestamp}-${crypto.randomUUID().slice(0, 8)}`;
  assertGeneration(generation);
  return generation;
}
