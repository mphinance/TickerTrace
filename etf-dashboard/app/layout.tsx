import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { LiveStats } from "@/components/live-stats";
import "./globals.css";

// Google Analytics 4 — wired via the existing Firebase-tied GA property.
// Set NEXT_PUBLIC_GA_ID in Vercel env to the Measurement ID (G-XXXXXXXXXX).
// If unset the component renders nothing and we fall back to Vercel Analytics
// only.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

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
  description: "Track daily institutional ETF holdings changes. What are institutions buying today?",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <LiveStats />
        <Analytics />
        {GA_ID && <GoogleAnalytics gaId={GA_ID} />}
      </body>
    </html>
  );
}
