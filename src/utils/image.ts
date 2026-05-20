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

  const encodedPath = imagePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `/api/prize-images/${encodedPath}`;
}
