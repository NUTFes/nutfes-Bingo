import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const remotePatterns: URL[] = [];

if (supabaseUrl && URL.canParse(supabaseUrl)) {
  const url = new URL(supabaseUrl);
  url.pathname = "/storage/v1/object/public/**";
  remotePatterns.push(url);
}

const nextConfig: NextConfig = {
  cacheComponents: true,
  images: {
    remotePatterns,
    dangerouslyAllowLocalIP: true,
  },
};

export default nextConfig;
