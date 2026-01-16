import { createClient } from "@supabase/supabase-js";

// Re-export types and mappers from shared module
export type {
  BingoNumber,
  PrizeImage,
  Prize,
  ReachLog,
  StampTrigger,
  Event,
} from "@nutfes-bingo/shared";

export {
  mapNumberRow,
  mapImageRow,
  mapPrizeRow,
  mapReachLogRow,
  mapStampTriggerRow,
  mapEventRow,
} from "@nutfes-bingo/shared";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseInternalUrl = process.env.SUPABASE_INTERNAL_URL ?? supabaseUrl;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("[Supabase] NEXT_PUBLIC_SUPABASE_URL or ANON_KEY is missing");
}

const targetUrl =
  typeof window === "undefined" ? supabaseInternalUrl : supabaseUrl;
export const supabase = createClient(targetUrl, supabaseAnonKey);
