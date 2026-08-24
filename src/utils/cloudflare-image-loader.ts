"use client";

import type { ImageLoaderProps } from "next/image";

function normalizeSource(src: string): string {
  return src.startsWith("/") ? src.slice(1) : src;
}

function isPrizeImageSource(src: string): boolean {
  const pathname = src.startsWith("/") ? src : new URL(src).pathname;
  return pathname.startsWith("/prizes/") || pathname.startsWith("/api/prize-images/prizes/");
}

export default function cloudflareImageLoader({ src, width, quality }: ImageLoaderProps): string {
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
