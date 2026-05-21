import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { getSupabaseServerUrl, hasSupabaseServerEnvVars } from "@/lib/supabase/config";
import type { Database } from "@/types/database.types";

export async function GET(request: Request) {
  const path = new URL(request.url).pathname;

  if (!hasSupabaseServerEnvVars()) {
    return Response.json(
      {
        ok: false,
        path,
        checks: {
          env: false,
          supabase: false,
        },
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const supabase = createSupabaseClient<Database>(
    getSupabaseServerUrl(),
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    },
  );
  const { error } = await supabase.from("app_state").select("id").eq("id", 1).single();

  if (error) {
    console.error(error);
    return Response.json(
      {
        ok: false,
        path,
        checks: {
          env: true,
          supabase: false,
        },
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  return Response.json(
    {
      ok: true,
      path,
      checks: {
        env: true,
        supabase: true,
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
