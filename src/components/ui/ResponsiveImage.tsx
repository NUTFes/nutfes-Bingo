import type { CSSProperties, ImgHTMLAttributes } from "react";

import cloudflareImageLoader from "@/utils/cloudflare-image-loader";

const IMAGE_WIDTHS = [
  32, 48, 64, 96, 128, 160, 192, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840,
] as const;

type ResponsiveImageProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src" | "srcSet" | "width" | "height"
> & {
  src: string;
  alt: string;
  sizes: string;
};

const canTransform = (src: string) =>
  import.meta.env.VITE_IMAGE_TRANSFORMATIONS === "true" &&
  (src.startsWith("/") || /^https?:\/\//.test(src));

export function ResponsiveImage({
  src,
  alt,
  sizes,
  loading = "lazy",
  style,
  ...imageProps
}: ResponsiveImageProps) {
  const transformed = canTransform(src);
  const resolvedSrc = transformed
    ? cloudflareImageLoader({ src, width: IMAGE_WIDTHS.at(-1) as number })
    : src;
  const srcSet = transformed
    ? IMAGE_WIDTHS.map((width) => `${cloudflareImageLoader({ src, width })} ${width}w`).join(", ")
    : undefined;
  const fillStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    ...style,
  };

  return (
    <img
      {...imageProps}
      src={resolvedSrc}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      loading={loading}
      style={fillStyle}
    />
  );
}
