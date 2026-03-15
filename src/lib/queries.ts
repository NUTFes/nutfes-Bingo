import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { PRIZE_IMAGES_BUCKET } from "@/types/bingo/constants";
import type { AppStateRow, NumberRow, PrizeWithImageUrl, ReachLogRow } from "@/types/bingo/types";
import type { Database } from "@/types/database.types";
import { hasEnvVars } from "@/utils/utils";

const emptyAppState: AppStateRow = {
  id: 1,
  survey_url: "",
  is_survey_active: false,
  updated_at: "",
};

export const BINGO_CACHE_TAGS = {
  numbers: "bingo:numbers",
  prizes: "bingo:prizes",
  appState: "bingo:app-state",
  reachLogs: "bingo:reach-logs",
} as const;

function createDataClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    },
  );
}

function isDirectImagePath(imagePath: string): boolean {
  if (imagePath.startsWith("/")) {
    return true;
  }

  try {
    void new URL(imagePath);
    return true;
  } catch {
    return false;
  }
}

function resolvePrizeImageUrl(
  supabase: ReturnType<typeof createDataClient>,
  imagePath: string | null,
): string | null {
  if (!imagePath) {
    return null;
  }

  if (isDirectImagePath(imagePath)) {
    return imagePath;
  }

  return supabase.storage.from(PRIZE_IMAGES_BUCKET).getPublicUrl(imagePath).data.publicUrl;
}

export async function getNumbers(): Promise<NumberRow[]> {
  "use cache";
  cacheTag(BINGO_CACHE_TAGS.numbers);
  cacheLife({ stale: 5, revalidate: 30, expire: 300 });

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
}

export async function getPrizes(): Promise<PrizeWithImageUrl[]> {
  "use cache";
  cacheTag(BINGO_CACHE_TAGS.prizes);
  cacheLife({ stale: 30, revalidate: 120, expire: 600 });

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
    image_url: resolvePrizeImageUrl(supabase, prize.image_path),
  }));
}

export async function getAppState(): Promise<AppStateRow> {
  "use cache";
  cacheTag(BINGO_CACHE_TAGS.appState);
  cacheLife({ stale: 5, revalidate: 15, expire: 120 });

  if (!hasEnvVars) {
    return emptyAppState;
  }

  const supabase = createDataClient();
  const { data, error } = await supabase.from("app_state").select("*").eq("id", 1).single();

  if (error) {
    throw new Error(`アプリ状態の取得に失敗しました: ${error.message}`);
  }

  return data;
}

export async function getLatestReachLog(): Promise<ReachLogRow | null> {
  "use cache";
  cacheTag(BINGO_CACHE_TAGS.reachLogs);
  cacheLife({ stale: 5, revalidate: 15, expire: 120 });

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
}

export async function getBingoBootstrap() {
  "use cache";
  cacheTag(BINGO_CACHE_TAGS.numbers);
  cacheTag(BINGO_CACHE_TAGS.prizes);
  cacheTag(BINGO_CACHE_TAGS.appState);
  cacheTag(BINGO_CACHE_TAGS.reachLogs);
  cacheLife({ stale: 5, revalidate: 30, expire: 300 });

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
}
