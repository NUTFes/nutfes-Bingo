import type { CSSProperties, ImgHTMLAttributes } from "react";

import {
  canTransformResponsiveImage,
  getResponsiveImageSrc,
  getResponsiveImageSrcSet,
} from "@/utils/responsive-image";

type ResponsiveImageProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src" | "srcSet" | "width" | "height"
> & {
  src: string;
  alt: string;
  sizes: string;
};

export function ResponsiveImage({
  src,
  alt,
  sizes,
  loading = "lazy",
  style,
  ...imageProps
}: ResponsiveImageProps) {
  const transformed = canTransformResponsiveImage(src);
  const resolvedSrc = getResponsiveImageSrc(src, transformed);
  const srcSet = getResponsiveImageSrcSet(src, transformed);
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
