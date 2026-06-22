import { createServiceRoleClient } from "@/lib/supabase/admin";
import { hasSupabaseServiceRoleEnvVars } from "@/lib/supabase/config";
import { PRIZE_IMAGES_BUCKET } from "@/types/bingo/constants";

const CACHE_CONTROL = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";

function isSafeStoragePath(path: string[]) {
  return path.length > 0 && path.every((segment) => segment && segment !== "." && segment !== "..");
}

export async function GET(_request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;

  if (!isSafeStoragePath(path)) {
    return new Response("Invalid image path", {
      status: 400,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }

  if (!hasSupabaseServiceRoleEnvVars()) {
    return new Response("Supabase environment variables are not configured", {
      status: 503,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }

  const storagePath = path.join("/");
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.storage.from(PRIZE_IMAGES_BUCKET).download(storagePath);

  if (error || !data) {
    return new Response("Prize image not found", {
      status: 404,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }

  const contentType = data.type || "application/octet-stream";

  if (!contentType.startsWith("image/")) {
    return new Response("Unsupported image content type", {
      status: 415,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }

  const headers = new Headers({
    "Cache-Control": CACHE_CONTROL,
    "Content-Type": contentType,
    "Content-Length": String(data.size),
  });

  return new Response(data.stream(), {
    status: 200,
    headers,
  });
}
