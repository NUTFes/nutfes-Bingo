/**
 * Supabase Database Row Types (snake_case)
 * These types represent the raw database schema as returned by Supabase queries.
 */

export type NumberRow = {
  id: number;
  number: number;
  created_at: string;
  updated_at: string;
};

export type ImageRow = {
  id: number;
  bucket_name: string;
  file_name: string;
  file_type: string;
  created_at: string;
  updated_at: string;
};

export type PrizeRow = {
  id: number;
  is_won: boolean;
  image_id: number;
  name_jp: string;
  name_en: string | null;
  created_at: string;
  updated_at: string;
  image?: ImageRow | ImageRow[] | null;
};

export type ReachLogRow = {
  id: number;
  status: boolean;
  created_at: string;
  reach_num: number;
};

export type StampTriggerRow = {
  id: number;
  name: string;
  created_at: string | null;
};

export type EventRow = {
  id: number;
  survey_url: string;
  is_survey_active: boolean;
};
