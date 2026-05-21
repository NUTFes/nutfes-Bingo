"use server";

import { updateTag } from "next/cache";

import { BINGO_CACHE_TAGS } from "@/lib/queries";
import { getPublicActionClientHash, PublicActionError } from "@/lib/public-action-context";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { STAMP_NAMES, type StampName } from "@/types/bingo/types";

function invalidateTag(tag: string) {
  updateTag(tag);
}

function isStampName(value: string): value is StampName {
  return (STAMP_NAMES as readonly string[]).includes(value);
}

function toPublicActionMessage(error: unknown, fallback: string) {
  if (error instanceof PublicActionError) {
    return error.message;
  }

  if (error instanceof Error && error.message.includes("public_action_rate_limited")) {
    return "短時間に送信しすぎています。少し待ってからもう一度お試しください。";
  }

  return fallback;
}

export async function sendReactionStamp(name: StampName) {
  if (!isStampName(name)) {
    throw new Error("リアクションの種類が不正です。");
  }

  try {
    const clientHash = await getPublicActionClientHash();
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.rpc("record_reaction_stamp", {
      stamp_name: name,
      client_hash: clientHash,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  } catch (error) {
    throw new Error(toPublicActionMessage(error, "リアクション送信に失敗しました。"));
  }
}

export async function recordPublicReach() {
  try {
    const clientHash = await getPublicActionClientHash();
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.rpc("record_reach", {
      client_hash: clientHash,
    });

    if (error) {
      throw new Error(error.message);
    }

    invalidateTag(BINGO_CACHE_TAGS.reachLogs);
    invalidateTag(BINGO_CACHE_TAGS.appState);
    return data;
  } catch (error) {
    throw new Error(toPublicActionMessage(error, "リーチ送信に失敗しました。"));
  }
}
