/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    API_URI: process.env.API_URI,
    WS_API_URL: process.env.WS_API_URL,
    HASURA_GRAPHQL_ADMIN_SECRET: process.env.HASURA_GRAPHQL_ADMIN_SECRET,
    NEXT_PUBLIC_STORAGE_ENDPOINT: process.env.NEXT_PUBLIC_STORAGE_ENDPOINT,
  },
  i18n: {
    locales: ["ja", "en"],
    defaultLocale: "ja",
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
    disableStaticImages: true,
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.svg$/,
      use: [
        {
          loader: "@svgr/webpack",
          options: {
            svgo: false,
          },
        },
      ],
    });
    return config;
  },
};

module.exports = nextConfig;
