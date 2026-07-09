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

function logUnexpectedPublicActionError(action: string, error: unknown) {
  if (error instanceof PublicActionError) {
    return;
  }

  if (error instanceof Error && error.message.includes("public_action_rate_limited")) {
    return;
  }

  console.error(`${action} failed`, error);
}

async function runPublicBingoAction<T>(
  action: string,
  fallback: string,
  handler: (clientHash: string) => Promise<T>,
) {
  try {
    const clientHash = await getPublicActionClientHash();
    return await handler(clientHash);
  } catch (error) {
    logUnexpectedPublicActionError(action, error);
    throw new Error(toPublicActionMessage(error, fallback));
  }
}

export async function sendReactionStamp(name: StampName) {
  if (!isStampName(name)) {
    throw new Error("リアクションの種類が不正です。");
  }

  return runPublicBingoAction(
    "sendReactionStamp",
    "リアクション送信に失敗しました。",
    async (clientHash) => {
      const supabase = createServiceRoleClient();
      const { data, error } = await supabase.rpc("record_reaction_stamp", {
        p_stamp_name: name,
        p_client_hash: clientHash,
      });

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
  );
}

export async function recordPublicReach() {
  return runPublicBingoAction(
    "recordPublicReach",
    "リーチ送信に失敗しました。",
    async (clientHash) => {
      const supabase = createServiceRoleClient();
      const { data, error } = await supabase.rpc("record_reach", {
        p_client_hash: clientHash,
      });

      if (error) {
        throw new Error(error.message);
      }

      invalidateTag(BINGO_CACHE_TAGS.reachLogs);
      invalidateTag(BINGO_CACHE_TAGS.appState);
      return data;
    },
  );
}
