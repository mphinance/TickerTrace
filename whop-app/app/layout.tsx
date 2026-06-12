import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { WhopThemeScript } from "@whop/react";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TickerTrace — Institutional ETF Intelligence",
  description:
    "What are institutions buying today? Daily holdings signals from ARK, Avantis, YieldMax, Kurv and more, embedded in your Whop community.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Sync our theme with the parent Whop host: adds a `dark` class for
            dark mode, nothing for light. Must run before paint to avoid a
            flash, so it lives in <head> ahead of any body content. */}
        <WhopThemeScript />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
