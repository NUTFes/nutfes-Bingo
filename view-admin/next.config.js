/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@nutfes-bingo/shared"],
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET:
      process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET,
  },
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
  },
};
module.exports = nextConfig;
