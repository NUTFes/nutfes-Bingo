"use server";

import { PRIZE_IMAGES_BUCKET } from "@/types/bingo/constants";

import { BINGO_CACHE_TAGS } from "@/lib/queries";
import type { PrizeWithImageUrl } from "@/types/bingo/types";
import type { TablesUpdate } from "@/types/database.types";
import {
  createAdminClient,
  invalidateTag,
  type AdminSupabaseClient,
} from "@/components/admin/server-actions";
import { resolvePrizeImageUrl } from "@/utils/image";

const MAX_PRIZE_IMAGE_SIZE = 2 * 1024 * 1024;
const ALLOWED_PRIZE_IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;
const PRIZE_SORT_ORDER_STEP = 1000;

type PrizeRecord = {
  id: number;
  name_jp: string;
  name_en: string | null;
  image_path: string | null;
  is_won: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

function toPrizeWithImageUrl(prize: PrizeRecord): PrizeWithImageUrl {
  return {
    ...prize,
    image_url: resolvePrizeImageUrl(prize.image_path),
  };
}

async function fetchOrderedPrizes(supabase: AdminSupabaseClient): Promise<PrizeWithImageUrl[]> {
  const { data, error } = await supabase
    .from("prizes")
    .select("*")
    .order("is_won", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new Error(`景品一覧の取得に失敗しました: ${error.message}`);
  }

  return data.map(toPrizeWithImageUrl);
}

async function uploadPrizeImage(supabase: AdminSupabaseClient, file: File) {
  const extension = await validatePrizeImage(file);
  const path = `prizes/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(PRIZE_IMAGES_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });

  if (error) {
    throw new Error(`景品画像のアップロードに失敗しました: ${error.message}`);
  }

  return path;
}

function bytesStartWith(bytes: Uint8Array, signature: number[]) {
  if (bytes.length < signature.length) return false;
  for (let i = 0; i < signature.length; i++) {
    if (bytes[i] !== signature[i]) return false;
  }
  return true;
}

function hasValidImageSignature(type: string, bytes: Uint8Array) {
  switch (type) {
    case "image/jpeg":
      return bytesStartWith(bytes, [0xff, 0xd8, 0xff]);
    case "image/png":
      return bytesStartWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "image/webp":
      return (
        bytesStartWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
        String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
      );
    default:
      return false;
  }
}

async function validatePrizeImage(file: File) {
  const extension = ALLOWED_PRIZE_IMAGE_TYPES[file.type as keyof typeof ALLOWED_PRIZE_IMAGE_TYPES];

  if (!extension) {
    throw new Error("景品画像は JPEG / PNG / WebP のみ許可します。");
  }

  if (file.size > MAX_PRIZE_IMAGE_SIZE) {
    throw new Error("景品画像は2MB以下にしてください。");
  }

  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (!hasValidImageSignature(file.type, bytes)) {
    throw new Error("景品画像のファイル形式が不正です。");
  }

  return extension;
}

async function deletePrizeImage(supabase: AdminSupabaseClient, path: string | null) {
  if (!path) {
    return;
  }

  const { error } = await supabase.storage.from(PRIZE_IMAGES_BUCKET).remove([path]);

  if (error) {
    throw new Error(`景品画像の削除に失敗しました: ${error.message}`);
  }
}

export async function createPrize(formData: FormData) {
  const supabase = await createAdminClient();
  const nameJp = formData.get("nameJp");
  const nameEn = formData.get("nameEn");
  const file = formData.get("file");

  if (typeof nameJp !== "string" || nameJp.trim() === "") {
    throw new Error("景品名を入力してください。");
  }

  const { data: lastPrize, error: lastPrizeError } = await supabase
    .from("prizes")
    .select("sort_order")
    .eq("is_won", false)
    .order("sort_order", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastPrizeError) {
    throw new Error(`景品の表示順取得に失敗しました: ${lastPrizeError.message}`);
  }

  const sortOrder = (lastPrize?.sort_order ?? 0) + PRIZE_SORT_ORDER_STEP;

  let imagePath: string | null = null;
  if (file instanceof File && file.size > 0) {
    imagePath = await uploadPrizeImage(supabase, file);
  }

  const { data, error } = await supabase
    .from("prizes")
    .insert({
      name_jp: nameJp.trim(),
      name_en: typeof nameEn === "string" && nameEn.trim() !== "" ? nameEn.trim() : null,
      image_path: imagePath,
      is_won: false,
      sort_order: sortOrder,
    })
    .select("*")
    .single();

  if (error) {
    if (imagePath) {
      await deletePrizeImage(supabase, imagePath);
    }
    throw new Error(`景品の登録に失敗しました: ${error.message}`);
  }

  invalidateTag(BINGO_CACHE_TAGS.prizes);
  return toPrizeWithImageUrl(data);
}

export async function updatePrize(formData: FormData) {
  const supabase = await createAdminClient();
  const idEntry = formData.get("id");
  const nameJp = formData.get("nameJp");
  const nameEn = formData.get("nameEn");
  const file = formData.get("file");

  if (typeof idEntry !== "string" || Number.isNaN(Number(idEntry))) {
    throw new Error("景品IDが不正です。");
  }

  if (typeof nameJp !== "string" || nameJp.trim() === "") {
    throw new Error("景品名を入力してください。");
  }

  const id = Number(idEntry);
  const { data: currentPrize, error: currentPrizeError } = await supabase
    .from("prizes")
    .select("image_path")
    .eq("id", id)
    .single();

  if (currentPrizeError) {
    throw new Error(`景品情報の取得に失敗しました: ${currentPrizeError.message}`);
  }

  const payload: TablesUpdate<"prizes"> = {
    name_jp: nameJp.trim(),
    name_en: typeof nameEn === "string" && nameEn.trim() !== "" ? nameEn.trim() : null,
  };

  let uploadedPath: string | null = null;
  if (file instanceof File && file.size > 0) {
    uploadedPath = await uploadPrizeImage(supabase, file);
    payload.image_path = uploadedPath;
  }

  const { data, error } = await supabase
    .from("prizes")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    if (uploadedPath) {
      await deletePrizeImage(supabase, uploadedPath);
    }
    throw new Error(`景品の更新に失敗しました: ${error.message}`);
  }

  if (uploadedPath && currentPrize.image_path && currentPrize.image_path !== uploadedPath) {
    await deletePrizeImage(supabase, currentPrize.image_path);
  }

  invalidateTag(BINGO_CACHE_TAGS.prizes);
  return toPrizeWithImageUrl(data);
}

export async function togglePrizeWon(id: number, isWon: boolean) {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("prizes")
    .update({ is_won: isWon })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(`景品状態の更新に失敗しました: ${error.message}`);
  }

  invalidateTag(BINGO_CACHE_TAGS.prizes);
  return toPrizeWithImageUrl(data);
}

export async function reorderPrizeGroup(orderedIds: number[]) {
  const ids = orderedIds.map((id) => Number(id));
  const uniqueIds = new Set(ids);
  if (ids.length < 2 || uniqueIds.size !== ids.length || ids.some((id) => !Number.isInteger(id))) {
    throw new Error("景品の表示順が不正です。");
  }

  const supabase = await createAdminClient();
  const { data: requestedPrizes, error: requestedError } = await supabase
    .from("prizes")
    .select("id,is_won")
    .in("id", ids);

  if (requestedError) {
    throw new Error(`景品の表示順取得に失敗しました: ${requestedError.message}`);
  }

  if (requestedPrizes.length !== ids.length) {
    throw new Error("表示順を変更する景品が見つかりません。");
  }

  const groupIsWon = requestedPrizes[0]?.is_won;
  if (
    typeof groupIsWon !== "boolean" ||
    requestedPrizes.some((prize) => prize.is_won !== groupIsWon)
  ) {
    throw new Error("未当選と当選済みをまたいだ並び替えはできません。");
  }

  const { data: groupPrizes, error: groupError } = await supabase
    .from("prizes")
    .select("id")
    .eq("is_won", groupIsWon)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (groupError) {
    throw new Error(`景品の表示順取得に失敗しました: ${groupError.message}`);
  }

  const requestedIdSet = new Set(ids);
  const nextIds = [
    ...ids,
    ...groupPrizes.map((prize) => prize.id).filter((id) => !requestedIdSet.has(id)),
  ];

  const updates = await Promise.all(
    nextIds.map((id, index) =>
      supabase
        .from("prizes")
        .update({ sort_order: (index + 1) * PRIZE_SORT_ORDER_STEP })
        .eq("id", id)
        .eq("is_won", groupIsWon),
    ),
  );
  const failedUpdate = updates.find((result) => result.error);
  if (failedUpdate?.error) {
    throw new Error(`景品の表示順更新に失敗しました: ${failedUpdate.error.message}`);
  }

  invalidateTag(BINGO_CACHE_TAGS.prizes);
  return fetchOrderedPrizes(supabase);
}

export async function deletePrize(id: number) {
  const supabase = await createAdminClient();
  const { data, error } = await supabase.from("prizes").delete().eq("id", id).select("*").single();

  if (error) {
    throw new Error(`景品の削除に失敗しました: ${error.message}`);
  }

  await deletePrizeImage(supabase, data.image_path);
  invalidateTag(BINGO_CACHE_TAGS.prizes);
}
