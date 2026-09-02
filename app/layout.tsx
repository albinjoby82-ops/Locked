import { Inter, Permanent_Marker } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

import type { ReactNode } from "react";

import { cn } from "@/shared/lib/utils";

import "@/shared/styles/globals.css";

/**
 * The real root layout. It owns <html>/<body> and nothing else — no providers,
 * no context, no i18n.
 *
 * Next synthesises /_global-error and /_not-found outside any [locale] segment,
 * so anything that reads React context from the root layout resolves to null and
 * prerendering fails. Keeping this layout context-free is what lets those
 * synthetic pages build; the providers live in app/[locale]/layout.tsx instead.
 */

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const permanentMarker = Permanent_Marker({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-permanent-marker",
  display: "swap",
});

export const preferredRegion = ["fra1", "sfo1", "iad1"];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html className="h-full" dir="ltr" lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="UTF-8" />
        <meta content="width=device-width, initial-scale=1, maximum-scale=1 viewport-fit=cover" name="viewport" />

        {/* PWA Meta Tags */}
        <meta content="yes" name="apple-mobile-web-app-capable" />
        <meta content="default" name="apple-mobile-web-app-status-bar-style" />
        <meta content="Locked In" name="apple-mobile-web-app-title" />
        <meta content="yes" name="mobile-web-app-capable" />
        <meta content="#FF5722" name="msapplication-TileColor" />
        <meta content="/android-chrome-192x192.png" name="msapplication-TileImage" />
        <meta content="#FF5722" name="theme-color" />
      </head>

      <body
        className={cn(
          "flex items-center justify-center min-h-screen w-full max-sm:p-0 max-sm:min-h-full bg-base-200 dark:bg-[#18181b] dark:text-gray-200 antialiased",
          "bg-hero-light dark:bg-hero-dark",
          GeistMono.variable,
          GeistSans.variable,
          inter.variable,
          permanentMarker.variable,
        )}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
