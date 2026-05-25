import { hasSupabaseServiceRoleEnvVars } from "@/lib/supabase/config";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const path = new URL(request.url).pathname;

  if (!hasSupabaseServiceRoleEnvVars()) {
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

  const supabase = createServiceRoleClient();
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
