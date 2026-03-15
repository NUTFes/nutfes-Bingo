import "server-only";

import { revalidateTag, updateTag } from "next/cache";

import { requireAdmin } from "@/shared/auth/auth";
import { createClient } from "@/shared/data/supabase/server";

export type AdminSupabaseClient = Awaited<ReturnType<typeof createClient>>;

export async function createAdminClient(): Promise<AdminSupabaseClient> {
  await requireAdmin();
  return createClient();
}

export function invalidateTag(tag: string) {
  updateTag(tag);
  revalidateTag(tag, "max");
}
