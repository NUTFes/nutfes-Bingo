import { describe, expect, it } from "vitest";

import type { BingoSnapshot, ServerEvent } from "../../src/shared/protocol";
import { applyEvent, selectNewerSnapshot } from "../../src/client/use-bingo-socket";

function snapshot(
  version: number,
  numbers: Array<{ id: number; number: number }> = [],
): BingoSnapshot {
  return {
    type: "snapshot",
    version,
    eventId: "test",
    numbers,
    latestNumber: numbers.at(-1)?.number ?? null,
    reachCount: 0,
    survey: { active: false, url: "" },
    prizes: [],
    flags: {
      reactionsEnabled: true,
      reachSubmissionEnabled: true,
      surveyEnabled: true,
      adminWritesEnabled: true,
      readOnlyMode: false,
    },
  };
}

describe("client snapshot ordering", () => {
  it("rejects a delayed snapshot older than the current state", () => {
    const current = snapshot(12, [{ id: 1, number: 42 }]);
    expect(selectNewerSnapshot(current, snapshot(11))).toBe(current);
  });

  it("keeps a new delta when an older snapshot arrives afterward", () => {
    const version11 = snapshot(11);
    const version12 = applyEvent(version11, {
      type: "number.added",
      version: 12,
      payload: { id: 1, number: 42 },
    });
    expect(selectNewerSnapshot(version12, version11)).toBe(version12);
    expect(version12.latestNumber).toBe(42);
  });

  it("rejects a non-contiguous delta so the socket can request a full snapshot", () => {
    const current = snapshot(10, [{ id: 1, number: 10 }]);
    expect(
      applyEvent(current, { type: "number.added", version: 12, payload: { id: 2, number: 12 } }),
    ).toBe(current);
  });

  it("applies the complete initialized snapshot without a follow-up HTTP request", () => {
    const old = snapshot(10, [{ id: 1, number: 10 }]);
    const initialized = snapshot(11);
    const event: ServerEvent = { type: "event.initialized", version: 11, payload: initialized };
    expect(applyEvent(old, event)).toEqual(initialized);
  });

  it("rejects an initialized payload whose snapshot version does not match", () => {
    const old = snapshot(10, [{ id: 1, number: 10 }]);
    const event: ServerEvent = { type: "event.initialized", version: 11, payload: snapshot(10) };
    expect(applyEvent(old, event)).toBe(old);
  });
});
