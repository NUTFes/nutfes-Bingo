function isDirectImagePath(imagePath: string): boolean {
  if (imagePath.startsWith("/api/prize-images/")) {
    return true;
  }

  try {
    return new URL(imagePath).protocol === "https:";
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

  const encodedPath = imagePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `/api/prize-images/${encodedPath}`;
}
