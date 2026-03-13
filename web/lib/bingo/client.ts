"use client";

import { useEffect, useState } from "react";

import type { TablesUpdate } from "@/lib/database.types";
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

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-");
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

export async function sendReactionStamp(name: StampName) {
  const supabase = createClient();
  const { error } = await supabase.from("stamp_triggers").insert({ name });

  if (error) {
    throw new Error(`リアクション送信に失敗しました: ${error.message}`);
  }
}

export async function recordPublicReach() {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("record_reach");

  if (error) {
    throw new Error(`リーチ送信に失敗しました: ${error.message}`);
  }

  return data;
}

export async function incrementReach() {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("increment_reach");

  if (error) {
    throw new Error(`リーチ数の増加に失敗しました: ${error.message}`);
  }

  return data;
}

export async function decrementReach() {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("decrement_reach");

  if (error) {
    throw new Error(`リーチ数の減少に失敗しました: ${error.message}`);
  }

  return data;
}

export async function createNumber(number: number) {
  const supabase = createClient();
  const { error } = await supabase.from("numbers").insert({ number });

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteNumber(number: number) {
  const supabase = createClient();
  const { error } = await supabase.from("numbers").delete().eq("number", number);

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateNumber(id: number, number: number) {
  const supabase = createClient();
  const { error } = await supabase.from("numbers").update({ number }).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function saveSurveyState(input: { surveyUrl: string; isSurveyActive: boolean }) {
  const supabase = createClient();
  const { error } = await supabase
    .from("app_state")
    .update({ survey_url: input.surveyUrl, is_survey_active: input.isSurveyActive })
    .eq("id", 1);

  if (error) {
    throw new Error(`アンケート設定の保存に失敗しました: ${error.message}`);
  }
}

export async function uploadPrizeImage(file: File) {
  const supabase = createClient();
  const extension = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const path = `prizes/${crypto.randomUUID()}.${sanitizeFileName(extension || "bin")}`;
  const { error } = await supabase.storage.from(PRIZE_IMAGES_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    throw new Error(`景品画像のアップロードに失敗しました: ${error.message}`);
  }

  return path;
}

export async function deletePrizeImage(path: string | null | undefined) {
  if (!path) {
    return;
  }

  const supabase = createClient();
  const { error } = await supabase.storage.from(PRIZE_IMAGES_BUCKET).remove([path]);

  if (error) {
    throw new Error(`景品画像の削除に失敗しました: ${error.message}`);
  }
}

export async function createPrize(input: {
  nameJp: string;
  nameEn?: string;
  imagePath?: string | null;
}) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("prizes")
    .insert({
      name_jp: input.nameJp,
      name_en: input.nameEn || null,
      image_path: input.imagePath || null,
      is_won: false,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`景品の登録に失敗しました: ${error.message}`);
  }

  return toPrizeWithImageUrl(data);
}

export async function updatePrize(input: {
  id: number;
  nameJp: string;
  nameEn?: string;
  imagePath?: string | null;
}) {
  const supabase = createClient();
  const payload: TablesUpdate<"prizes"> = {
    name_jp: input.nameJp,
    name_en: input.nameEn || null,
  };

  if (input.imagePath !== undefined) {
    payload.image_path = input.imagePath;
  }

  const { data, error } = await supabase
    .from("prizes")
    .update(payload)
    .eq("id", input.id)
    .select("*")
    .single();

  if (error) {
    throw new Error(`景品の更新に失敗しました: ${error.message}`);
  }

  return toPrizeWithImageUrl(data);
}

export async function togglePrizeWon(id: number, isWon: boolean) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("prizes")
    .update({ is_won: isWon })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(`景品状態の更新に失敗しました: ${error.message}`);
  }

  return toPrizeWithImageUrl(data);
}

export async function deletePrize(id: number) {
  const supabase = createClient();
  const { data, error } = await supabase.from("prizes").delete().eq("id", id).select("*").single();

  if (error) {
    throw new Error(`景品の削除に失敗しました: ${error.message}`);
  }

  return data;
}
