import {
  isGeneration,
  MAX_SNAPSHOT_BYTES,
  parseSnapshotEnvelope,
  SNAPSHOT_FORMAT,
  type GameSnapshot,
  type SnapshotEnvelope,
} from "./domain";
import { ApiError, sha256Hex } from "./http";

export type StoredSnapshot = {
  key: string;
  generation: string;
  revision: number;
  checksum_sha256: string;
  size: number;
  uploaded_at: string;
};

export type ParsedSnapshotKey = {
  generation: string;
  createdAt: string;
  revision: number;
  checksumPrefix: string;
};

export async function createActiveSnapshot(env: Env): Promise<StoredSnapshot> {
  const directory = env.GAME_DIRECTORY.getByName("active");
  const generation = await directory.getActiveGeneration();
  const state = env.GAME_STATE.getByName(`game:${generation}`);
  return state.createSnapshot(generation);
}

export function assertSnapshotFits(snapshot: GameSnapshot): void {
  const envelope: SnapshotEnvelope = {
    format: SNAPSHOT_FORMAT,
    format_version: 1,
    checksum_sha256: "0".repeat(64),
    snapshot,
  };
  if (new TextEncoder().encode(JSON.stringify(envelope)).byteLength > MAX_SNAPSHOT_BYTES) {
    throw new ApiError(413, "snapshot が大きすぎます。");
  }
}

export async function storeSnapshot(env: Env, snapshot: GameSnapshot): Promise<StoredSnapshot> {
  assertSnapshotFits(snapshot);
  const snapshotJson = JSON.stringify(snapshot);
  const checksum = await sha256Hex(snapshotJson);
  const envelope: SnapshotEnvelope = {
    format: SNAPSHOT_FORMAT,
    format_version: 1,
    checksum_sha256: checksum,
    snapshot,
  };
  const body = JSON.stringify(envelope);
  const bytes = new TextEncoder().encode(body);
  if (bytes.byteLength > MAX_SNAPSHOT_BYTES) {
    throw new ApiError(413, "snapshot が大きすぎます。");
  }

  const key = buildSnapshotKey(snapshot, checksum);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const object = await env.GAME_BACKUPS.put(key, bytes, {
    httpMetadata: {
      contentType: "application/json",
      cacheControl: "private, no-store",
    },
    customMetadata: {
      format: SNAPSHOT_FORMAT,
      source_generation: snapshot.source_generation,
      revision: String(snapshot.revision),
      checksum_sha256: checksum,
    },
    sha256: digest,
  });

  return {
    key,
    generation: snapshot.source_generation,
    revision: snapshot.revision,
    checksum_sha256: checksum,
    size: object.size,
    uploaded_at: object.uploaded.toISOString(),
  };
}

export async function listSnapshots(
  env: Env,
  cursor?: string,
): Promise<{ snapshots: StoredSnapshot[]; nextCursor: string | null }> {
  if (cursor !== undefined && (cursor.length === 0 || cursor.length > 2_048)) {
    throw new ApiError(400, "cursor が不正です。");
  }
  const result = await env.GAME_BACKUPS.list({
    prefix: "snapshots/",
    // The production lifecycle keeps about 400 daily snapshots. Listing the whole retained
    // window lets us return newest-first even though R2's underlying order is lexicographic.
    limit: 1_000,
    ...(cursor === undefined ? {} : { cursor }),
    include: ["customMetadata"],
  });

  return {
    snapshots: result.objects
      .map((object) => ({
        key: object.key,
        generation: object.customMetadata?.source_generation ?? "unknown",
        revision: parseMetadataInteger(object.customMetadata?.revision),
        checksum_sha256: object.customMetadata?.checksum_sha256 ?? "",
        size: object.size,
        uploaded_at: object.uploaded.toISOString(),
      }))
      .sort((left, right) => right.uploaded_at.localeCompare(left.uploaded_at)),
    nextCursor: result.truncated ? result.cursor : null,
  };
}

export async function loadSnapshot(env: Env, key: string): Promise<GameSnapshot> {
  if (parseSnapshotKey(key) === null) throw new ApiError(400, "snapshot key が不正です。");
  const head = await env.GAME_BACKUPS.head(key);
  if (head === null) throw new ApiError(404, "snapshot が見つかりません。");
  if (head.size > MAX_SNAPSHOT_BYTES) throw new ApiError(413, "snapshot が大きすぎます。");

  const object = await env.GAME_BACKUPS.get(key);
  if (object === null) throw new ApiError(404, "snapshot が見つかりません。");
  let parsed: unknown;
  try {
    parsed = await object.json<unknown>();
  } catch {
    throw new ApiError(422, "snapshot JSON が破損しています。");
  }

  const envelope = parseSnapshotEnvelope(parsed);
  const actualChecksum = await sha256Hex(JSON.stringify(envelope.snapshot));
  if (actualChecksum !== envelope.checksum_sha256) {
    throw new ApiError(422, "snapshot checksum が一致しません。");
  }
  return envelope.snapshot;
}

export function buildSnapshotKey(
  snapshot: Pick<GameSnapshot, "source_generation" | "created_at" | "revision">,
  checksumSha256: string,
): string {
  if (!isGeneration(snapshot.source_generation)) {
    throw new ApiError(422, "snapshot generation が不正です。");
  }
  if (!Number.isSafeInteger(snapshot.revision) || snapshot.revision < 0) {
    throw new ApiError(422, "snapshot revision が不正です。");
  }
  if (!/^[a-f0-9]{64}$/.test(checksumSha256)) {
    throw new ApiError(422, "snapshot checksum が不正です。");
  }
  const createdAtMs = Date.parse(snapshot.created_at);
  if (!Number.isFinite(createdAtMs)) {
    throw new ApiError(422, "snapshot created_at が不正です。");
  }
  const encodedCreatedAt = new Date(createdAtMs).toISOString().replace(/[:.]/g, "-");
  const key =
    `snapshots/${snapshot.source_generation}/${encodedCreatedAt}-r${snapshot.revision}-` +
    `${checksumSha256.slice(0, 12)}.json`;
  if (parseSnapshotKey(key) === null) {
    throw new Error("generated snapshot key does not satisfy the read contract");
  }
  return key;
}

export function parseSnapshotKey(value: string): ParsedSnapshotKey | null {
  if (value.length > 512) return null;
  const match =
    /^snapshots\/([A-Za-z0-9][A-Za-z0-9._-]{0,63})\/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)-r(0|[1-9]\d*)-([a-f0-9]{12})\.json$/.exec(
      value,
    );
  if (match === null) return null;
  const [, generation, encodedCreatedAt, revisionText, checksumPrefix] = match;
  if (
    generation === undefined ||
    encodedCreatedAt === undefined ||
    revisionText === undefined ||
    checksumPrefix === undefined ||
    !isGeneration(generation)
  ) {
    return null;
  }
  const createdAt =
    `${encodedCreatedAt.slice(0, 13)}:${encodedCreatedAt.slice(14, 16)}:` +
    `${encodedCreatedAt.slice(17, 19)}.${encodedCreatedAt.slice(20, 23)}Z`;
  try {
    if (new Date(createdAt).toISOString() !== createdAt) return null;
  } catch {
    return null;
  }
  const revision = Number(revisionText);
  if (!Number.isSafeInteger(revision) || revision < 0) return null;
  return { generation, createdAt, revision, checksumPrefix };
}

function parseMetadataInteger(value: string | undefined): number {
  if (value === undefined) return 0;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
}
