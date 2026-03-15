"use server";

import { PRIZE_IMAGES_BUCKET } from "@/shared/domain/bingo/constants";
import { BINGO_CACHE_TAGS } from "@/shared/data/queries";
import type { PrizeWithImageUrl } from "@/shared/domain/bingo/types";
import type { TablesUpdate } from "@/shared/data/database.types";
import {
  createAdminClient,
  invalidateTag,
  type AdminSupabaseClient,
} from "@/features/admin/_shared/server-actions";

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-");
}

function toPrizeWithImageUrl(
  supabase: AdminSupabaseClient,
  prize: {
    id: number;
    name_jp: string;
    name_en: string | null;
    image_path: string | null;
    is_won: boolean;
    created_at: string;
    updated_at: string;
  },
): PrizeWithImageUrl {
  return {
    ...prize,
    image_url: prize.image_path
      ? supabase.storage.from(PRIZE_IMAGES_BUCKET).getPublicUrl(prize.image_path).data.publicUrl
      : null,
  };
}

async function uploadPrizeImage(supabase: AdminSupabaseClient, file: File) {
  const extension = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const path = `prizes/${crypto.randomUUID()}.${sanitizeFileName(extension || "bin")}`;
  const { error } = await supabase.storage.from(PRIZE_IMAGES_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    throw new Error(`景品画像のアップロードに失敗しました: ${error.message}`);
  }

  return path;
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
  return toPrizeWithImageUrl(supabase, data);
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
  return toPrizeWithImageUrl(supabase, data);
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
  return toPrizeWithImageUrl(supabase, data);
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
