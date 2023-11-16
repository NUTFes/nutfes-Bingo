/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = nextConfig;

module.exports = {
  env: {
    API_URI: process.env.API_URI,
    WS_API_URL: process.env.WS_API_URL,
    X_HASURA_ADMIN_SECRET: process.env.HASURA_GRAPHQL_ADMIN_SECRET,
  },
  i18n: {
    locales: ["ja", "en"],
    defaultLocale: "ja",
  },
};
