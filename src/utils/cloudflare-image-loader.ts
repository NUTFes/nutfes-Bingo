function normalizeSource(src: string): string {
  return src.startsWith("/") ? src.slice(1) : src;
}

function isPrizeImageSource(src: string): boolean {
  const pathname = src.startsWith("/") ? src : new URL(src).pathname;
  return pathname.startsWith("/prizes/") || pathname.startsWith("/api/prize-images/prizes/");
}

export default function cloudflareImageLoader({
  src,
  width,
}: {
  src: string;
  width: number;
}): string {
  const params = [`width=${width}`];
  if (isPrizeImageSource(src)) {
    params.push(`height=${width}`);
  }
  params.push("fit=scale-down", "format=auto", "onerror=redirect");

  return `/cdn-cgi/image/${params.join(",")}/${normalizeSource(src)}`;
}
