/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    API_URI: process.env.API_URI,
    WS_API_URL: process.env.WS_API_URL,
    HASURA_GRAPHQL_ADMIN_SECRET: process.env.HASURA_GRAPHQL_ADMIN_SECRET,
    // RustFS configuration
    NEXT_PUBLIC_RUSTFS_ENDPOINT: process.env.NEXT_PUBLIC_RUSTFS_ENDPOINT,
    NEXT_PUBLIC_RUSTFS_PORT: process.env.NEXT_PUBLIC_RUSTFS_PORT,
    NEXT_PUBLIC_RUSTFS_ACCESS_KEY: process.env.NEXT_PUBLIC_RUSTFS_ACCESS_KEY,
    NEXT_PUBLIC_RUSTFS_SECRET_KEY: process.env.NEXT_PUBLIC_RUSTFS_SECRET_KEY,
    NEXT_PUBLIC_RUSTFS_BUCKET_NAME: process.env.NEXT_PUBLIC_RUSTFS_BUCKET_NAME,
    NEXT_PUBLIC_STORAGE_ENDPOINT: process.env.NEXT_PUBLIC_STORAGE_ENDPOINT,
    // Legacy variables (for backwards compatibility)
    NEXT_PUBLIC_ENDPOINT: process.env.NEXT_PUBLIC_ENDPOINT,
    NEXT_PUBLIC_PORT: process.env.NEXT_PUBLIC_PORT,
    NEXT_PUBLIC_ACCESS_KEY: process.env.NEXT_PUBLIC_ACCESS_KEY,
    NEXT_PUBLIC_SECRET_KEY: process.env.NEXT_PUBLIC_SECRET_KEY,
    NEXT_PUBLIC_BUCKET_NAME: process.env.NEXT_PUBLIC_BUCKET_NAME,
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "rustfs",
        port: "9000",
        pathname: "/bingo/**",
      },
      {
        protocol: "https",
        hostname: "storage.nutfes.net",
        pathname: "/**",
      },
    ],
  },
};
module.exports = nextConfig;
