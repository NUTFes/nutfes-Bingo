/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  },
};

module.exports = nextConfig;

module.exports = {
  env: {
    API_URI: process.env.API_URI,
    WS_API_URL: process.env.WS_API_URL,
  }
}
