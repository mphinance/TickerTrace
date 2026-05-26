import type { NextConfig } from "next";

const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_URL ?? "https://api.tickertrace.pro";

const nextConfig: NextConfig = {
  // Same /api/v1 rewrite trick the main dashboard uses — lets server
  // components hit the public FastAPI under a single origin even though
  // it lives on a different host.
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${API_ORIGIN}/api/v1/:path*`,
      },
    ];
  },

  // Whop loads us inside an iframe under whop.com. Without an explicit
  // CSP frame-ancestors allowlist, browsers block the embed. Set it once
  // here for every response and ditch the X-Frame-Options default that
  // Next would otherwise drop on us.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' https://whop.com https://*.whop.com",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
