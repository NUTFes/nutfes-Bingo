import { PRIZE_IMAGES_BUCKET } from "@/types/bingo/constants";

function isDirectImagePath(imagePath: string): boolean {
  if (imagePath.startsWith("/")) {
    return true;
  }

  try {
    void new URL(imagePath);
    return true;
  } catch {
    return false;
  }
}

export function resolvePrizeImageUrl(imagePath: string | null): string | null {
  if (!imagePath) {
    return null;
  }

  if (isDirectImagePath(imagePath)) {
    return imagePath;
  }

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const internalUrl = process.env.SUPABASE_INTERNAL_URL;
  const isServer = typeof window === "undefined";

  let resolvedBaseUrl = internalUrl || baseUrl;

  if (
    isServer &&
    resolvedBaseUrl &&
    (resolvedBaseUrl.includes("127.0.0.1") || resolvedBaseUrl.includes("localhost"))
  ) {
    resolvedBaseUrl = resolvedBaseUrl.replace(/127\.0\.0\.1|localhost/, "host.docker.internal");
  }

  const encodedPath = imagePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${resolvedBaseUrl}/storage/v1/object/public/${PRIZE_IMAGES_BUCKET}/${encodedPath}`;
}
