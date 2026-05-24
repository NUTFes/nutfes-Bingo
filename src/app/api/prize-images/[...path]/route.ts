import { getSupabaseServerUrl, hasSupabaseServerEnvVars } from "@/lib/supabase/config";
import { PRIZE_IMAGES_BUCKET } from "@/types/bingo/constants";

const CACHE_CONTROL = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";

function isSafeStoragePath(path: string[]) {
  return path.length > 0 && path.every((segment) => segment && segment !== "." && segment !== "..");
}

function buildStorageUrl(path: string[]) {
  const baseUrl = getSupabaseServerUrl().replace(/\/$/, "");
  const encodedPath = path.map((segment) => encodeURIComponent(segment)).join("/");

  return `${baseUrl}/storage/v1/object/public/${PRIZE_IMAGES_BUCKET}/${encodedPath}`;
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

  if (!hasSupabaseServerEnvVars()) {
    return new Response("Supabase environment variables are not configured", {
      status: 503,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }

  const upstream = await fetch(buildStorageUrl(path), {
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    },
    next: { revalidate: 3600 },
  });

  if (!upstream.ok || !upstream.body) {
    return new Response("Prize image not found", {
      status: upstream.status,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }

  const contentType = upstream.headers.get("content-type") || "application/octet-stream";

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
  });

  const contentLength = upstream.headers.get("content-length");
  const etag = upstream.headers.get("etag");
  const lastModified = upstream.headers.get("last-modified");

  if (contentLength) {
    headers.set("Content-Length", contentLength);
  }

  if (etag) {
    headers.set("ETag", etag);
  }

  if (lastModified) {
    headers.set("Last-Modified", lastModified);
  }

  return new Response(upstream.body, {
    status: 200,
    headers,
  });
}
