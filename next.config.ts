import type { NextConfig } from "next";

const mediaOrigin = process.env.NEXT_PUBLIC_MEDIA_ORIGIN;
const remotePatterns = mediaOrigin?.startsWith("https://")
  ? [new URL(`${mediaOrigin.replace(/\/$/, "")}/**`)]
  : [];

const useCloudflareImageTransformations = process.env.CLOUDFLARE_IMAGE_TRANSFORMATIONS === "true";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    remotePatterns,
    imageSizes: [32, 48, 64, 96, 128, 160, 192, 256, 384],
    ...(useCloudflareImageTransformations
      ? {
          loader: "custom" as const,
          loaderFile: "./src/utils/cloudflare-image-loader.ts",
        }
      : { unoptimized: true }),
  },
};

export default nextConfig;
