"use server";

import { BINGO_CACHE_TAGS } from "@/lib/queries";
import { createAdminClient, invalidateTag } from "@/components/admin/server-actions";
import { normalizeHttpsUrl } from "@/utils/url";

export async function createNumber(number: number) {
  const supabase = await createAdminClient();
  const { data, error } = await supabase.from("numbers").insert({ number }).select("*").single();

  if (error) {
    throw new Error(error.message);
  }

  invalidateTag(BINGO_CACHE_TAGS.numbers);
  return data;
}

export async function deleteNumber(number: number) {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("numbers")
    .delete()
    .eq("number", number)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  invalidateTag(BINGO_CACHE_TAGS.numbers);
  return data;
}

export async function updateNumber(id: number, number: number) {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("numbers")
    .update({ number })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  invalidateTag(BINGO_CACHE_TAGS.numbers);
  return data;
}

export async function incrementReach() {
  const supabase = await createAdminClient();
  const { data, error } = await supabase.rpc("increment_reach");

  if (error) {
    throw new Error(`リーチ数の増加に失敗しました: ${error.message}`);
  }

  invalidateTag(BINGO_CACHE_TAGS.reachLogs);
  invalidateTag(BINGO_CACHE_TAGS.appState);
  return data;
}

export async function decrementReach() {
  const supabase = await createAdminClient();
  const { data, error } = await supabase.rpc("decrement_reach");

  if (error) {
    throw new Error(`リーチ数の減少に失敗しました: ${error.message}`);
  }

  invalidateTag(BINGO_CACHE_TAGS.reachLogs);
  invalidateTag(BINGO_CACHE_TAGS.appState);
  return data;
}

export async function saveSurveyState(input: { surveyUrl: string; isSurveyActive: boolean }) {
  const supabase = await createAdminClient();
  const surveyUrl = normalizeHttpsUrl(input.surveyUrl, "アンケートURLの形式が不正です。");

  if (input.isSurveyActive && surveyUrl === "") {
    throw new Error("アンケートを公開する場合はURLを入力してください。");
  }

  const { data, error } = await supabase
    .from("app_state")
    .update({ survey_url: surveyUrl, is_survey_active: input.isSurveyActive })
    .eq("id", 1)
    .select("*")
    .single();

  if (error) {
    throw new Error(`アンケート設定の保存に失敗しました: ${error.message}`);
  }

  invalidateTag(BINGO_CACHE_TAGS.appState);
  return data;
}
