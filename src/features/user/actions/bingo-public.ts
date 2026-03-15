"use server";

import { revalidateTag, updateTag } from "next/cache";

import { BINGO_CACHE_TAGS } from "@/shared/data/queries";
import type { StampName } from "@/shared/domain/bingo/types";
import { createClient } from "@/shared/data/supabase/server";

function invalidateTag(tag: string) {
  updateTag(tag);
  revalidateTag(tag, "max");
}

export async function sendReactionStamp(name: StampName) {
  const supabase = await createClient();
  const { error } = await supabase.from("stamp_triggers").insert({ name });

  if (error) {
    throw new Error(`リアクション送信に失敗しました: ${error.message}`);
  }
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
