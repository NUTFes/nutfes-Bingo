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

export type NumberRow = {
  id: number;
  number: number;
  created_at: string;
  updated_at: string;
};

type PrizeRow = {
  id: number;
  name_jp: string;
  name_en: string | null;
  image_path: string | null;
  is_won: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type AppStateRow = {
  id: number;
  survey_url: string;
  is_survey_active: boolean;
  reach_count: number;
  updated_at: string;
};

export type ReachLogRow = {
  id: number;
  delta: number;
  reach_num: number;
  source: string;
  created_at: string;
};

export type PrizeWithImageUrl = PrizeRow & { image_url: string | null };

export const EMPTY_APP_STATE: AppStateRow = {
  id: 1,
  survey_url: "",
  is_survey_active: false,
  reach_count: 0,
  updated_at: "",
};
