import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import {
  getSupabaseSecretKey,
  getSupabaseServerUrl,
  hasSupabaseServiceRoleEnvVars,
} from "@/lib/supabase/config";
import type { Database } from "@/types/database.types";

export function createServiceRoleClient() {
  const supabaseUrl = getSupabaseServerUrl();
  const serviceRoleKey = getSupabaseSecretKey();

  if (!hasSupabaseServiceRoleEnvVars() || !serviceRoleKey) {
    throw new Error("Supabase service role environment variables are not configured.");
  }

  return createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
