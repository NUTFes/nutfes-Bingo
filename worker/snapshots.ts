import {
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

  const timestamp = snapshot.created_at.replace(/[:.]/g, "-");
  const key =
    `snapshots/${snapshot.source_generation}/${timestamp}-r${snapshot.revision}-` +
    `${checksum.slice(0, 12)}.json`;
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
  if (!isSnapshotKey(key)) throw new ApiError(400, "snapshot key が不正です。");
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

function isSnapshotKey(value: string): boolean {
  return (
    value.length <= 512 &&
    !value.includes("..") &&
    /^snapshots\/[A-Za-z0-9][A-Za-z0-9._-]{0,63}\/[A-Za-z0-9._-]+\.json$/.test(value)
  );
}

function parseMetadataInteger(value: string | undefined): number {
  if (value === undefined) return 0;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
}
