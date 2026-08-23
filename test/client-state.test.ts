import { describe, expect, it } from "vitest";

import { shouldAcceptRevision } from "../src/lib/state-order";
import { shouldShowReachIcon } from "../src/types/bingo/public-preferences";

describe("realtime state ordering", () => {
  it("accepts a lower authoritative snapshot but rejects a later lower incremental frame", () => {
    expect(shouldAcceptRevision(12, 7, "authoritative")).toBe(true);
    expect(shouldAcceptRevision(7, 6, "incremental")).toBe(false);
    expect(shouldAcceptRevision(7, 7, "incremental")).toBe(true);
    expect(shouldAcceptRevision(7, 8, "incremental")).toBe(true);
  });
});

describe("event-scoped public preferences", () => {
  it("offers reach once per event and restores it for a new event", () => {
    expect(shouldShowReachIcon("event-a", null)).toBe(true);
    expect(shouldShowReachIcon("event-a", "event-a")).toBe(false);
    expect(shouldShowReachIcon("event-b", "event-a")).toBe(true);
    expect(shouldShowReachIcon("", "event-a")).toBe(false);
  });
});
