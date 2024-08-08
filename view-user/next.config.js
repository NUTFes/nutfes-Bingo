/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = nextConfig;

module.exports = {
  env: {
    API_URI: process.env.API_URI,
    WS_API_URL: process.env.WS_API_URL,
    HASURA_GRAPHQL_ADMIN_SECRET: process.env.HASURA_GRAPHQL_ADMIN_SECRET,
  },
  i18n: {
    locales: ["ja", "en"],
    defaultLocale: "ja",
  },
  // TODO next/Imageに直したい
  // images: {
  //   remotePatterns: [
  //     {
  //       protocol: "http",
  //       hostname: "localhost",
  //       port: "9000",
  //       pathname: "/bingo/**",
  //     },
  //     {
  //       protocol: "http",
  //       hostname: "127.0.0.1",
  //       port: "9000",
  //       pathname: "/bingo/**",
  //     },
  //   ],
  // },
};
