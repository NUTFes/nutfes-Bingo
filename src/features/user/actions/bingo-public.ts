"use server";

import { createHash } from "node:crypto";

import { revalidateTag } from "next/cache";
import { headers } from "next/headers";

import { BINGO_CACHE_TAGS } from "@/lib/queries";
import { STAMP_NAMES, type StampName } from "@/types/bingo/types";
import { createServiceRoleClient } from "@/lib/supabase/admin";

function invalidateTag(tag: string) {
  revalidateTag(tag, "max");
}

async function getPublicActionFingerprint() {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = headerStore.get("x-real-ip")?.trim();
  const userAgent = headerStore.get("user-agent") ?? "";
  const acceptLanguage = headerStore.get("accept-language") ?? "";

  return createHash("sha256")
    .update([forwardedFor || realIp || "unknown", userAgent, acceptLanguage].join("\n"))
    .digest("hex");
}

function isStampName(value: string): value is StampName {
  return STAMP_NAMES.includes(value as StampName);
}

function toPublicActionError(error: { message?: string } | null, fallback: string) {
  if (error?.message?.includes("rate_limit_exceeded")) {
    return new Error("短時間に連続して送信されています。少し待ってから再試行してください。");
  }

  return new Error(error?.message ? `${fallback}: ${error.message}` : fallback);
}

export async function sendReactionStamp(name: StampName) {
  if (!isStampName(name)) {
    throw new Error("リアクション種別が不正です。");
  }

  const supabase = createServiceRoleClient();
  const fingerprint = await getPublicActionFingerprint();
  const { error } = await supabase.rpc("record_stamp_trigger", {
    p_fingerprint: fingerprint,
    p_name: name,
  });

  if (error) {
    throw toPublicActionError(error, "リアクション送信に失敗しました");
  }
}

export async function recordPublicReach() {
  const supabase = createServiceRoleClient();
  const fingerprint = await getPublicActionFingerprint();
  const { data, error } = await supabase.rpc("record_reach", {
    p_fingerprint: fingerprint,
  });

  if (error) {
    throw toPublicActionError(error, "リーチ送信に失敗しました");
  }

  invalidateTag(BINGO_CACHE_TAGS.reachLogs);
  return data;
}
