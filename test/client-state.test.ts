import { describe, expect, it } from "vitest";
import { weaklyMatchesEntityTag } from "../shared/state-etag";
import { makeStateEtag } from "../worker/http";

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

describe("state ETag validation", () => {
  it("distinguishes divergent states at the same revision after a restore", async () => {
    const beforeRestore = {
      revision: 7,
      numbers: [{ id: 1, number: 10, created_at: "", updated_at: "" }],
      prizes: [],
      appState: {
        id: 1,
        event_id: "event",
        survey_url: "",
        survey_title: "",
        survey_description: "",
        survey_button_label: "",
        is_survey_active: false,
        reach_count: 0,
        updated_at: "",
      },
      latestReachLog: null,
      serverTime: "2026-09-26T00:00:00Z",
    };
    const afterRestore = {
      ...beforeRestore,
      numbers: [{ ...beforeRestore.numbers[0], number: 20 }],
    };

    const previousTag = await makeStateEtag(beforeRestore);
    const restoredTag = await makeStateEtag(afterRestore);
    expect(restoredTag).not.toBe(previousTag);
    expect(weaklyMatchesEntityTag(previousTag, restoredTag)).toBe(false);
    expect(await makeStateEtag({ ...beforeRestore, serverTime: "later" })).toBe(previousTag);
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
