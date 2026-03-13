import { cache } from "react";

import { PRIZE_IMAGES_BUCKET } from "@/lib/bingo/constants";
import type { AppStateRow, NumberRow, PrizeWithImageUrl, ReachLogRow } from "@/lib/bingo/types";
import { createDataClient } from "@/lib/supabase/data";
import { hasEnvVars } from "@/lib/utils";

const emptyAppState: AppStateRow = {
  id: 1,
  survey_url: "",
  is_survey_active: false,
  updated_at: "",
};

export const getNumbers = cache(async (): Promise<NumberRow[]> => {
  if (!hasEnvVars) {
    return [];
  }

  const supabase = createDataClient();
  const { data, error } = await supabase
    .from("numbers")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    throw new Error(`番号一覧の取得に失敗しました: ${error.message}`);
  }

  return data;
});

export const getPrizes = cache(async (): Promise<PrizeWithImageUrl[]> => {
  if (!hasEnvVars) {
    return [];
  }

  const supabase = createDataClient();
  const { data, error } = await supabase
    .from("prizes")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    throw new Error(`景品一覧の取得に失敗しました: ${error.message}`);
  }

  return data.map<PrizeWithImageUrl>((prize) => ({
    ...prize,
    image_url: prize.image_path
      ? supabase.storage.from(PRIZE_IMAGES_BUCKET).getPublicUrl(prize.image_path).data.publicUrl
      : null,
  }));
});

export const getAppState = cache(async (): Promise<AppStateRow> => {
  if (!hasEnvVars) {
    return emptyAppState;
  }

  const supabase = createDataClient();
  const { data, error } = await supabase.from("app_state").select("*").eq("id", 1).single();

  if (error) {
    throw new Error(`アプリ状態の取得に失敗しました: ${error.message}`);
  }

  return data;
});

export const getLatestReachLog = cache(async (): Promise<ReachLogRow | null> => {
  if (!hasEnvVars) {
    return null;
  }

  const supabase = createDataClient();
  const { data, error } = await supabase
    .from("reach_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`リーチ数の取得に失敗しました: ${error.message}`);
  }

  return data;
});

export const getBingoBootstrap = cache(async () => {
  const [numbers, prizes, appState, latestReachLog] = await Promise.all([
    getNumbers(),
    getPrizes(),
    getAppState(),
    getLatestReachLog(),
  ]);

  return {
    numbers,
    prizes,
    appState,
    latestReachLog,
  };
});
