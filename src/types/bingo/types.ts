import type { Tables } from "@/types/database.types";

export const STAMP_NAMES = [
  "angry",
  "cracker",
  "crap",
  "good",
  "heart",
  "peace",
  "sad",
  "skull",
  "smile",
  "surprise",
] as const;

export type StampName = (typeof STAMP_NAMES)[number];

export type NumberRow = Tables<"numbers">;
export type PrizeRow = Tables<"prizes">;
export type AppStateRow = Tables<"app_state">;
export type ReachLogRow = Tables<"reach_logs">;
export type StampTriggerRow = Tables<"stamp_triggers">;
export type ReactionName = StampName;
export type PrizeWithImageUrl = PrizeRow & { image_url: string | null };
