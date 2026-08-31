import type { CSSProperties, ImgHTMLAttributes } from "react";

const RESPONSIVE_WIDTHS = [96, 160, 256, 384, 512, 768, 1024] as const;

type ResponsiveImageProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src" | "srcSet" | "width" | "height"
> & {
  src: string;
};

const fillStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
};

function isPrizeImageSource(src: string): boolean {
  try {
    const pathname = src.startsWith("/") ? src : new URL(src, window.location.href).pathname;
    return pathname.startsWith("/prizes/") || pathname.startsWith("/api/prize-images/prizes/");
  } catch {
    return false;
  }
}

function cloudflarePrizeImageUrl(src: string, width: number): string {
  const normalizedSource = src.startsWith("/") ? src.slice(1) : src;
  return `/cdn-cgi/image/width=${width},height=${width},fit=scale-down,format=auto,onerror=redirect/${normalizedSource}`;
}

export default function ResponsiveImage({
  src,
  alt,
  sizes,
  loading = "lazy",
  fetchPriority,
  style,
  ...props
}: ResponsiveImageProps) {
  const useTransformations = import.meta.env.PROD && isPrizeImageSource(src);
  const resolvedSrc = useTransformations ? cloudflarePrizeImageUrl(src, 768) : src;
  const srcSet = useTransformations
    ? RESPONSIVE_WIDTHS.map(
        (candidateWidth) => `${cloudflarePrizeImageUrl(src, candidateWidth)} ${candidateWidth}w`,
      ).join(", ")
    : undefined;

  return (
    <img
      {...props}
      src={resolvedSrc}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      loading={loading}
      fetchPriority={fetchPriority}
      style={{ ...fillStyle, ...style }}
    />
  );
}
