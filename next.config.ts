import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const parsedSupabaseUrl = supabaseUrl && URL.canParse(supabaseUrl) ? new URL(supabaseUrl) : null;
const supabaseBasePath = parsedSupabaseUrl?.pathname.replace(/\/$/, "") ?? "";
const scriptSrc =
  process.env.NODE_ENV === "development"
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'";
const imgSrc =
  process.env.NODE_ENV === "development"
    ? "img-src 'self' data: blob: http: https:"
    : "img-src 'self' data: blob: https:";
const connectSrc =
  process.env.NODE_ENV === "development"
    ? "connect-src 'self' http: https: ws: wss:"
    : "connect-src 'self' https: wss:";

const securityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      imgSrc,
      "font-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      scriptSrc,
      connectSrc,
    ].join("; "),
  },
] as const;

const nextConfig: NextConfig = {
  output: "standalone",
  cacheComponents: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [...securityHeaders],
      },
    ];
  },
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
