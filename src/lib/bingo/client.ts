"use client";

import { useEffect, useState } from "react";

import { PRIZE_IMAGES_BUCKET } from "@/lib/bingo/constants";
import type {
  AppStateRow,
  NumberRow,
  PrizeRow,
  PrizeWithImageUrl,
  ReachLogRow,
  StampName,
} from "@/lib/bingo/types";
import { createClient } from "@/lib/supabase/client";

function toPrizeWithImageUrl(prize: PrizeRow): PrizeWithImageUrl {
  const supabase = createClient();

  return {
    ...prize,
    image_url: prize.image_path
      ? supabase.storage.from(PRIZE_IMAGES_BUCKET).getPublicUrl(prize.image_path).data.publicUrl
      : null,
  };
}

export function useNumbers(initialNumbers: NumberRow[]) {
  const [numbers, setNumbers] = useState<NumberRow[]>(initialNumbers);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("numbers")
      .on("postgres_changes", { event: "*", schema: "public", table: "numbers" }, (payload) => {
        setNumbers((prev) => {
          if (payload.eventType === "INSERT") {
            return [...prev, payload.new as NumberRow].sort((a, b) => a.id - b.id);
          }

          if (payload.eventType === "UPDATE") {
            return prev
              .map((number) =>
                number.id === (payload.new as NumberRow).id ? (payload.new as NumberRow) : number,
              )
              .sort((a, b) => a.id - b.id);
          }

          if (payload.eventType === "DELETE") {
            return prev.filter((number) => number.id !== (payload.old.id as number));
          }

          return prev;
        });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  return numbers;
}

export function usePrizes(initialPrizes: PrizeWithImageUrl[]) {
  const [prizes, setPrizes] = useState<PrizeWithImageUrl[]>(initialPrizes);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("prizes")
      .on("postgres_changes", { event: "*", schema: "public", table: "prizes" }, (payload) => {
        setPrizes((prev) => {
          if (payload.eventType === "INSERT") {
            return [...prev, toPrizeWithImageUrl(payload.new as PrizeRow)].sort(
              (a, b) => a.id - b.id,
            );
          }

          if (payload.eventType === "UPDATE") {
            return prev
              .map((prize) =>
                prize.id === (payload.new as PrizeRow).id
                  ? toPrizeWithImageUrl(payload.new as PrizeRow)
                  : prize,
              )
              .sort((a, b) => a.id - b.id);
          }

          if (payload.eventType === "DELETE") {
            return prev.filter((prize) => prize.id !== (payload.old.id as number));
          }

          return prev;
        });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  return [prizes, setPrizes] as const;
}

export function useAppState(initialAppState: AppStateRow) {
  const [appState, setAppState] = useState<AppStateRow>(initialAppState);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("app-state")
      .on("postgres_changes", { event: "*", schema: "public", table: "app_state" }, (payload) => {
        if (payload.eventType === "UPDATE") {
          setAppState(payload.new as AppStateRow);
        }
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  return [appState, setAppState] as const;
}

export function useLatestReachLog(initialReachLog: ReachLogRow | null) {
  const [reachLog, setReachLog] = useState<ReachLogRow | null>(initialReachLog);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("reach-logs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reach_logs" },
        (payload) => {
          setReachLog(payload.new as ReachLogRow);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  return reachLog;
}

export function subscribeStampTriggers(onInsert: (stamp: { name: StampName; id: number }) => void) {
  const supabase = createClient();
  const channel = supabase
    .channel("stamp-triggers")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "stamp_triggers" },
      (payload) => {
        const stamp = payload.new as { id: number; name: StampName };
        onInsert(stamp);
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
