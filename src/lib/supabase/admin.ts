import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { getSupabaseServerUrl, hasSupabaseServiceRoleEnvVars } from "@/lib/supabase/config";
import type { Database } from "@/types/database.types";

export function createServiceRoleClient() {
  const supabaseUrl = getSupabaseServerUrl();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
