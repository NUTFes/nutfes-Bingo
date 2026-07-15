import type { NextConfig } from "next";

const mediaOrigin = process.env.NEXT_PUBLIC_MEDIA_ORIGIN;
const remotePatterns = mediaOrigin?.startsWith("https://")
  ? [new URL(`${mediaOrigin.replace(/\/$/, "")}/**`)]
  : [];

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
    remotePatterns,
  },
};

export default nextConfig;
