/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

module.exports = nextConfig

module.exports = {
  env: {
    API_URI: process.env.API_URI,
    WS_API_URL: process.env.WS_API_URL,
  }
}
