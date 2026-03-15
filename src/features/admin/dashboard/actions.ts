"use server";

import { BINGO_CACHE_TAGS } from "@/lib/queries";
import { createAdminClient, invalidateTag } from "@/components/admin/server-actions";

export async function createNumber(number: number) {
  const supabase = await createAdminClient();
  const { error } = await supabase.from("numbers").insert({ number });

  if (error) {
    throw new Error(error.message);
  }

  invalidateTag(BINGO_CACHE_TAGS.numbers);
}

export async function deleteNumber(number: number) {
  const supabase = await createAdminClient();
  const { error } = await supabase.from("numbers").delete().eq("number", number);

  if (error) {
    throw new Error(error.message);
  }

  invalidateTag(BINGO_CACHE_TAGS.numbers);
}

export async function updateNumber(id: number, number: number) {
  const supabase = await createAdminClient();
  const { error } = await supabase.from("numbers").update({ number }).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  invalidateTag(BINGO_CACHE_TAGS.numbers);
}

export async function incrementReach() {
  const supabase = await createAdminClient();
  const { data, error } = await supabase.rpc("increment_reach");

  if (error) {
    throw new Error(`リーチ数の増加に失敗しました: ${error.message}`);
  }

  invalidateTag(BINGO_CACHE_TAGS.reachLogs);
  return data;
}

export async function decrementReach() {
  const supabase = await createAdminClient();
  const { data, error } = await supabase.rpc("decrement_reach");

  if (error) {
    throw new Error(`リーチ数の減少に失敗しました: ${error.message}`);
  }

  invalidateTag(BINGO_CACHE_TAGS.reachLogs);
  return data;
}

export async function saveSurveyState(input: { surveyUrl: string; isSurveyActive: boolean }) {
  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("app_state")
    .update({ survey_url: input.surveyUrl, is_survey_active: input.isSurveyActive })
    .eq("id", 1);

  if (error) {
    throw new Error(`アンケート設定の保存に失敗しました: ${error.message}`);
  }

  invalidateTag(BINGO_CACHE_TAGS.appState);
}
