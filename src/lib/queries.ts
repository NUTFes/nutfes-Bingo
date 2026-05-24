import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type {
  AppStateRow,
  NumberRow,
  PrizeWithImageUrl,
  ReachLogRow,
  StampTriggerRow,
} from "@/types/bingo/types";
import type { Database } from "@/types/database.types";
import { hasEnvVars } from "@/utils/utils";
import { resolvePrizeImageUrl } from "@/utils/image";
import {
  getSupabaseServerUrl,
  hasSupabaseServerEnvVars,
  shouldSkipSupabaseFetch,
} from "@/lib/supabase/config";

const emptyAppState: AppStateRow = {
  id: 1,
  survey_url: "",
  is_survey_active: false,
  reach_count: 0,
  updated_at: "",
};

export const BINGO_CACHE_TAGS = {
  numbers: "bingo:numbers",
  prizes: "bingo:prizes",
  appState: "bingo:app-state",
  reachLogs: "bingo:reach-logs",
  stampTriggers: "bingo:stamp-triggers",
} as const;

function createDataClient() {
  const supabaseUrl = getSupabaseServerUrl();
  return createSupabaseClient<Database>(
    supabaseUrl,
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

function canFetchSupabaseData() {
  return hasEnvVars && hasSupabaseServerEnvVars() && !shouldSkipSupabaseFetch();
}

export async function getNumbers(): Promise<NumberRow[]> {
  "use cache";
  cacheTag(BINGO_CACHE_TAGS.numbers);
  cacheLife({ stale: 1, revalidate: 2, expire: 30 });

  if (!canFetchSupabaseData()) {
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
  cacheLife({ stale: 5, revalidate: 30, expire: 120 });

  if (!canFetchSupabaseData()) {
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
    image_url: resolvePrizeImageUrl(prize.image_path),
  }));
}

export async function getAppState(): Promise<AppStateRow> {
  "use cache";
  cacheTag(BINGO_CACHE_TAGS.appState);
  cacheLife({ stale: 1, revalidate: 2, expire: 30 });

  if (!canFetchSupabaseData()) {
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
  cacheLife({ stale: 1, revalidate: 2, expire: 30 });

  if (!canFetchSupabaseData()) {
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

export async function getStampTriggersAfter(
  afterId: number,
  limit = 50,
): Promise<StampTriggerRow[]> {
  if (!canFetchSupabaseData()) {
    return [];
  }

  const safeAfterId = Number.isFinite(afterId) ? Math.max(0, Math.floor(afterId)) : 0;
  const safeLimit = Math.min(Math.max(Number.isFinite(limit) ? Math.floor(limit) : 50, 1), 100);
  const supabase = createDataClient();
  const { data, error } = await supabase
    .from("stamp_triggers")
    .select("*")
    .gt("id", safeAfterId)
    .order("id", { ascending: true })
    .limit(safeLimit);

  if (error) {
    throw new Error(`リアクションスタンプの取得に失敗しました: ${error.message}`);
  }

  return data;
}

export async function getLatestStampTriggerId(): Promise<number> {
  if (!canFetchSupabaseData()) {
    return 0;
  }

  const supabase = createDataClient();
  const { data, error } = await supabase
    .from("stamp_triggers")
    .select("id")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`最新リアクションスタンプIDの取得に失敗しました: ${error.message}`);
  }

  return data?.id ?? 0;
}
