"use client";

import { WhopIframeSdkProvider } from "@whop/react";

/**
 * Client-side wrapper that exposes the Whop iframe SDK via React context.
 * Has to be a client component because the iframe SDK uses window /
 * postMessage. The root layout (server) renders this once.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return <WhopIframeSdkProvider>{children}</WhopIframeSdkProvider>;
}
