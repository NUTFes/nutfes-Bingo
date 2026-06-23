"use server";

import { revalidateTag } from "next/cache";

import { BINGO_CACHE_TAGS } from "@/lib/queries";
import type { StampName } from "@/types/bingo/types";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

function invalidateTag(tag: string) {
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
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.rpc("record_reach");

  if (error) {
    throw new Error(`リーチ送信に失敗しました: ${error.message}`);
  }

  invalidateTag(BINGO_CACHE_TAGS.reachLogs);
  return data;
}
