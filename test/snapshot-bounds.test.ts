import { describe, expect, it } from "vitest";

import {
  type GameSnapshot,
  MAX_AUDIT_LOG_ROWS,
  MAX_AUDIT_PAYLOAD_BYTES,
  MAX_PRIZES,
  MAX_REACH_LOGS,
  MAX_REACH_SUBMISSIONS,
  MAX_SNAPSHOT_BYTES,
  parseSnapshot,
  SNAPSHOT_FORMAT,
} from "../worker/domain";

const TIMESTAMP = "2026-07-13T00:00:00.123456+00:00";

describe("logical snapshot bounds", () => {
  it("keeps the maximum legal generated state below the 2 MiB R2 envelope limit", () => {
    const largeId = 9_000_000_000_000;
    const payloadJson = JSON.stringify({ value: "a".repeat(MAX_AUDIT_PAYLOAD_BYTES - 12) });
    expect(new TextEncoder().encode(payloadJson).byteLength).toBeLessThanOrEqual(
      MAX_AUDIT_PAYLOAD_BYTES,
    );

    const snapshot: GameSnapshot = {
      schema_version: 1,
      source_generation: "g".repeat(64),
      revision: largeId,
      created_at: TIMESTAMP,
      numbers: Array.from({ length: 99 }, (_, index) => ({
        id: largeId + index,
        number: index + 1,
        created_at: TIMESTAMP,
        updated_at: TIMESTAMP,
      })),
      prizes: Array.from({ length: MAX_PRIZES }, (_, index) => ({
        id: largeId + index,
        name_jp: "あ".repeat(120),
        name_en: "あ".repeat(160),
        image_path: `/PrizeItem/${"あ".repeat(200)}.webp`,
        is_won: false,
        sort_order: largeId + index,
        created_at: TIMESTAMP,
        updated_at: TIMESTAMP,
      })),
      app_state: {
        id: 1,
        survey_url: `https://example.com/${"x".repeat(2_000)}`,
        is_survey_active: true,
        reach_count: largeId,
        updated_at: TIMESTAMP,
      },
      reach_logs: Array.from({ length: MAX_REACH_LOGS }, (_, index) => ({
        id: largeId + index,
        delta: 1,
        reach_num: largeId + index,
        source: "あ".repeat(32),
        created_at: TIMESTAMP,
      })),
      reach_submissions: Array.from({ length: MAX_REACH_SUBMISSIONS }, (_, index) => ({
        client_hash: index.toString(16).padStart(64, "0"),
        created_at: TIMESTAMP,
      })),
      audit_log: Array.from({ length: MAX_AUDIT_LOG_ROWS }, (_, index) => ({
        id: largeId + index,
        revision: largeId + index,
        actor: "あ".repeat(320),
        action: "あ".repeat(80),
        payload_json: payloadJson,
        created_at: TIMESTAMP,
      })),
    };

    const parsed = parseSnapshot(snapshot);
    const envelope = JSON.stringify({
      format: SNAPSHOT_FORMAT,
      format_version: 1,
      checksum_sha256: "a".repeat(64),
      snapshot: parsed,
    });

    expect(new TextEncoder().encode(envelope).byteLength).toBeLessThanOrEqual(MAX_SNAPSHOT_BYTES);
  });
});
