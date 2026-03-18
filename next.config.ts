import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const parsedSupabaseUrl = supabaseUrl && URL.canParse(supabaseUrl) ? new URL(supabaseUrl) : null;
const supabaseBasePath = parsedSupabaseUrl?.pathname.replace(/\/$/, "") ?? "";

const nextConfig: NextConfig = {
  output: "standalone",
  cacheComponents: true,
  images: {
    remotePatterns: parsedSupabaseUrl
      ? [
          {
            protocol: parsedSupabaseUrl.protocol.replace(":", "") as "http" | "https",
            hostname: parsedSupabaseUrl.hostname,
            port: parsedSupabaseUrl.port,
            pathname: `${supabaseBasePath}/storage/v1/object/public/**`,
          },
        ]
      : [],
  },
};

export default nextConfig;
