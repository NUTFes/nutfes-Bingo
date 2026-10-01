import cloudflareImageLoader from "@/utils/cloudflare-image-loader";

const IMAGE_WIDTHS = [
  32, 48, 64, 96, 128, 160, 192, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840,
] as const;

export const PRIZE_IMAGE_SIZES = "(max-width: 639px) 22.5vw, 98px";

export function canTransformResponsiveImage(src: string) {
  return (
    import.meta.env.VITE_IMAGE_TRANSFORMATIONS === "true" &&
    (src.startsWith("/") || /^https?:\/\//.test(src))
  );
}

export function getResponsiveImageSrc(src: string, transformed: boolean) {
  return transformed ? cloudflareImageLoader({ src, width: IMAGE_WIDTHS.at(-1) as number }) : src;
}

export function getResponsiveImageSrcSet(src: string, transformed: boolean) {
  if (!transformed) return undefined;
  return IMAGE_WIDTHS.map((width) => `${cloudflareImageLoader({ src, width })} ${width}w`).join(
    ", ",
  );
}
