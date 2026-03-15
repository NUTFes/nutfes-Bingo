import "server-only";

import { revalidateTag } from "next/cache";

import { requireAdmin } from "@/lib/auth/auth";
import { createClient } from "@/lib/supabase/server";

export type AdminSupabaseClient = Awaited<ReturnType<typeof createClient>>;

export async function createAdminClient(): Promise<AdminSupabaseClient> {
  await requireAdmin();
  return createClient();
}

export function invalidateTag(tag: string) {
  revalidateTag(tag, "max");
}
