"use server";

import { updateTag } from "next/cache";

import { BINGO_CACHE_TAGS } from "@/lib/queries";
import type { StampName } from "@/types/bingo/types";
import { createClient } from "@/lib/supabase/server";

function invalidateTag(tag: string) {
  updateTag(tag);
}

export async function sendReactionStamp(name: StampName) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stamp_triggers")
    .insert({ name })
    .select("*")
    .single();

  if (error) {
    throw new Error(`リアクション送信に失敗しました: ${error.message}`);
  }

  return data;
}

export async function recordPublicReach() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("record_reach");

  if (error) {
    throw new Error(`リーチ送信に失敗しました: ${error.message}`);
  }

  invalidateTag(BINGO_CACHE_TAGS.reachLogs);
  return data;
}
