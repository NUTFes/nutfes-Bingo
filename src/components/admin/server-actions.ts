import "server-only";

import { updateTag } from "next/cache";

import { requireAdmin } from "@/lib/auth/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export type AdminSupabaseClient = ReturnType<typeof createServiceRoleClient>;

export async function createAdminClient(): Promise<AdminSupabaseClient> {
  await requireAdmin();
  return createServiceRoleClient();
}

export function invalidateTag(tag: string) {
  updateTag(tag);
}
