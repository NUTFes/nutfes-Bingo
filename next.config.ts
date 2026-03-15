import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const nextConfig: NextConfig = {
  output: "standalone",
  cacheComponents: true,
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "host.docker.internal",
        port: "54321",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "54321",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "54321",
        pathname: "/storage/v1/object/public/**",
      },
      ...(supabaseUrl && URL.canParse(supabaseUrl)
        ? [
            {
              protocol: new URL(supabaseUrl).protocol.replace(":", "") as "http" | "https",
              hostname: new URL(supabaseUrl).hostname,
              port: new URL(supabaseUrl).port,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
    ],
    dangerouslyAllowLocalIP: true,
  },
};

export default nextConfig;
