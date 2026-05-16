import type { NextConfig } from "next";

const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_URL ?? "https://api.tickertrace.mphinance.com";

const nextConfig: NextConfig = {
  // Proxy /api/v1/* on tickertrace.pro through to the FastAPI server on
  // Vultr. Lets us advertise a single domain in docs and marketing.
  //
  // Note: tickertrace.pro/api/signals (singular, no v1) is still served by
  // the Next.js route at app/api/signals/route.ts — Next prefers a local
  // route over a rewrite when both match, so the existing endpoint keeps
  // working.
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${API_ORIGIN}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
