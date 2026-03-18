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

  const resolvedBaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");

  const encodedPath = imagePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${resolvedBaseUrl}/storage/v1/object/public/${PRIZE_IMAGES_BUCKET}/${encodedPath}`;
}
