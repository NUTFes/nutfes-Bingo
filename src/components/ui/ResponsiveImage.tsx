import type { CSSProperties, ImgHTMLAttributes } from "react";

import { canTransformImageSource, cloudflareImageLoader } from "@/utils/cloudflare-image-loader";

const RESPONSIVE_WIDTHS = [
  40, 56, 64, 88, 96, 128, 160, 192, 220, 256, 320, 360, 384, 512, 640, 768, 1024, 1280,
] as const;

type NativeImageProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src" | "srcSet" | "width" | "height" | "loading"
>;

interface ResponsiveImageProps extends NativeImageProps {
  src: string;
  width?: number;
  height?: number;
  fill?: boolean;
  quality?: number;
  loading?: "eager" | "lazy";
}

const fillStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
};

export default function ResponsiveImage({
  src,
  alt,
  width,
  height,
  fill = false,
  quality,
  sizes,
  loading = "lazy",
  fetchPriority,
  style,
  ...props
}: ResponsiveImageProps) {
  const useTransformations = import.meta.env.PROD && canTransformImageSource(src);
  const fallbackWidth = width ?? 768;
  const resolvedSrc = useTransformations
    ? cloudflareImageLoader({ src, width: fallbackWidth, quality })
    : src;
  const srcSet = useTransformations
    ? RESPONSIVE_WIDTHS.map(
        (candidateWidth) =>
          `${cloudflareImageLoader({ src, width: candidateWidth, quality })} ${candidateWidth}w`,
      ).join(", ")
    : undefined;

  return (
    <img
      {...props}
      src={resolvedSrc}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      loading={loading}
      fetchPriority={fetchPriority}
      style={fill ? { ...fillStyle, ...style } : style}
    />
  );
}
