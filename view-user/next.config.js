/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    API_URI: process.env.API_URI,
    WS_API_URL: process.env.WS_API_URL,
    HASURA_GRAPHQL_ADMIN_SECRET: process.env.HASURA_GRAPHQL_ADMIN_SECRET,
  },
  i18n: {
    locales: ["ja", "en"],
    defaultLocale: "ja",
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "minio",
        port: "9000",
        pathname: "/**",
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
