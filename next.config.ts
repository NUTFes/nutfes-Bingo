import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  reactStrictMode: true,
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8000",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "storage.nutfes.net",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "bingo-api.nutfes.net",
        pathname: "/storage/v1/object/public/**",
      },
    ],
    disableStaticImages: true,
  },
};

export default nextConfig;
