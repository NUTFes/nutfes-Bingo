import { describe, expect, it } from "vitest";

import { runMaintenanceBatch } from "../../src/worker/bingo-room";

describe("maintenance failure isolation", () => {
  it("keeps one failed reaction shard retryable while successful shards complete", async () => {
    const shards = [0, 1, 2, 3];
    const first = await runMaintenanceBatch(shards, async (shard) => {
      if (shard === 2) throw new Error("Injected shard failure");
    });
    expect(first.filter(({ ok }) => ok).map(({ item }) => item)).toEqual([0, 1, 3]);
    expect(first.filter(({ ok }) => !ok).map(({ item }) => item)).toEqual([2]);

    const retry = await runMaintenanceBatch(
      first.filter(({ ok }) => !ok).map(({ item }) => item),
      async () => Promise.resolve(),
    );
    expect(retry).toEqual([{ item: 2, ok: true }]);
  });
});
