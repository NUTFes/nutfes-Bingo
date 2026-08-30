export interface CloudflareImageLoaderProps {
  src: string;
  width: number;
  quality?: number;
}

function normalizeSource(src: string): string {
  return src.startsWith("/") ? src.slice(1) : src;
}

function isPrizeImageSource(src: string): boolean {
  try {
    const pathname = src.startsWith("/") ? src : new URL(src, window.location.href).pathname;
    return pathname.startsWith("/prizes/") || pathname.startsWith("/api/prize-images/prizes/");
  } catch {
    return false;
  }
}

export function canTransformImageSource(src: string): boolean {
  return !src.startsWith("blob:") && !src.startsWith("data:");
}

export function cloudflareImageLoader({ src, width, quality }: CloudflareImageLoaderProps): string {
  const params = [`width=${width}`];
  if (isPrizeImageSource(src)) {
    params.push(`height=${width}`);
  }
  params.push("fit=scale-down", "format=auto", "onerror=redirect");
  if (quality !== undefined) {
    params.push(`quality=${quality}`);
  }

  return `/cdn-cgi/image/${params.join(",")}/${normalizeSource(src)}`;
}
