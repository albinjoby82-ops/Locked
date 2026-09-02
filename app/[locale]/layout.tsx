import { Providers } from "app/[locale]/providers";

import type { ReactNode } from "react";
import type { Metadata } from "next";

import { generateStructuredData, StructuredDataScript } from "@/shared/lib/structured-data";
import { getServerUrl } from "@/shared/lib/server-url";
import { SiteConfig } from "@/shared/config/site-config";
import { getLocalizedMetadata } from "@/shared/config/localized-metadata";
import { WorkoutSessionsSynchronizer } from "@/features/workout-session/ui/workout-sessions-synchronizer";
import { FavoriteExercisesSynchronizer } from "@/features/workout-builder/model/favorite-exercises-synchronizer";
import { ThemeSynchronizer } from "@/features/theme/ui/ThemeSynchronizer";
import { Version } from "@/components/version";
import { TailwindIndicator } from "@/components/utils/TailwindIndicator";
import { NextTopLoader } from "@/components/ui/next-top-loader";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";
import { VerticalLeftBanner, VerticalRightBanner, AdBlockerForPremium } from "@/components/ads";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const localizedData = getLocalizedMetadata(locale);

  return {
    title: {
      default: localizedData.title,
      template: `%s | ${localizedData.title}`,
    },
    description: localizedData.description,
    keywords: localizedData.keywords as unknown as string[],
    applicationName: localizedData.applicationName,
    category: localizedData.category,
    classification: localizedData.classification,
    metadataBase: new URL(getServerUrl()),
    manifest: "/manifest.json",
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-snippet": -1,
        "max-image-preview": "large",
        "max-video-preview": -1,
      },
    },
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION,
    },
    openGraph: {
      title: localizedData.title,
      description: localizedData.description,
      url: getServerUrl(),
      siteName: SiteConfig.title,
      locale:
        locale === "en"
          ? "en_US"
          : locale === "es"
            ? "es_ES"
            : locale === "pt"
              ? "pt_PT"
              : locale === "ru"
                ? "ru_RU"
                : locale === "zh-CN"
                  ? "zh_CN"
                  : "fr_FR",
      alternateLocale: [
        "fr_FR",
        "fr_CA",
        "fr_CH",
        "fr_BE",
        "en_US",
        "en_GB",
        "en_CA",
        "en_AU",
        "es_ES",
        "es_MX",
        "es_AR",
        "es_CL",
        "pt_PT",
        "pt_BR",
        "ru_RU",
        "ru_BY",
        "ru_KZ",
        "zh_CN",
        "zh_TW",
        "zh_HK",
      ].filter(
        (alt) =>
          alt !==
          (locale === "en"
            ? "en_US"
            : locale === "es"
              ? "es_ES"
              : locale === "pt"
                ? "pt_PT"
                : locale === "ru"
                  ? "ru_RU"
                  : locale === "zh-CN"
                    ? "zh_CN"
                    : "fr_FR"),
      ),
      images: [
        {
          url: `${getServerUrl()}/images/default-og-image_fr.jpg`,
          width: SiteConfig.seo.ogImage.width,
          height: SiteConfig.seo.ogImage.height,
          alt: `${SiteConfig.title} - Plateforme de fitness moderne`,
        },
        {
          url: `${getServerUrl()}/images/default-og-image_en.jpg`,
          width: SiteConfig.seo.ogImage.width,
          height: SiteConfig.seo.ogImage.height,
          alt: `${SiteConfig.title} - Modern fitness platform`,
        },
        {
          url: `${getServerUrl()}/images/default-og-image_es.jpg`,
          width: SiteConfig.seo.ogImage.width,
          height: SiteConfig.seo.ogImage.height,
          alt: `${SiteConfig.title} - Plataforma de fitness moderna`,
        },
        {
          url: `${getServerUrl()}/images/default-og-image_pt.jpg`,
          width: SiteConfig.seo.ogImage.width,
          height: SiteConfig.seo.ogImage.height,
          alt: `${SiteConfig.title} - Plataforma de fitness moderna`,
        },
        {
          url: `${getServerUrl()}/images/default-og-image_ru.jpg`,
          width: SiteConfig.seo.ogImage.width,
          height: SiteConfig.seo.ogImage.height,
          alt: `${SiteConfig.title} - Современная фитнес платформа`,
        },
        {
          url: `${getServerUrl()}/images/default-og-image_zh.jpg`,
          width: SiteConfig.seo.ogImage.width,
          height: SiteConfig.seo.ogImage.height,
          alt: `${SiteConfig.title} - 现代健身平台`,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      site: SiteConfig.seo.twitterHandle,
      creator: SiteConfig.seo.twitterHandle,
      title: localizedData.title,
      description: localizedData.description,
      images: [
        {
          url: `${getServerUrl()}/images/default-og-image_${locale === "zh-CN" ? "zh" : locale}.jpg`,
          width: SiteConfig.seo.ogImage.width,
          height: SiteConfig.seo.ogImage.height,
          alt: localizedData.ogAlt,
        },
      ],
    },
    // English-only and private, so there is nothing to offer alternates for.
    alternates: {
      canonical: getServerUrl(),
    },
    authors: [{ name: SiteConfig.company.name, url: getServerUrl() }],
    creator: SiteConfig.company.name,
    publisher: SiteConfig.company.name,
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: SiteConfig.title,
    },
    icons: {
      icon: [
        { url: "/images/favicon-32x32.png", sizes: "32x32", type: "image/png" },
        { url: "/images/favicon-16x16.png", sizes: "16x16", type: "image/png" },
        { url: "/images/favicon.ico", type: "image/x-icon" },
      ],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
      shortcut: "/images/favicon.ico",
    },
    other: {
      "msapplication-TileColor": "#FF5722",
      "msapplication-TileImage": "/android-chrome-192x192.png",
    },
  };
}

interface RootLayoutProps {
  params: Promise<{ locale: string }>;
  children: ReactNode;
}

/**
 * Locale layout. The real <html>/<body> live in app/layout.tsx — this one only
 * mounts the client providers and the locale-specific head tags, so the
 * synthetic /_global-error and /_not-found pages (which render outside any
 * [locale] value) never depend on this context.
 */
export default async function LocaleLayout({ params, children }: RootLayoutProps) {
  const { locale } = await params;

  const websiteStructuredData = generateStructuredData({ type: "WebSite", locale });
  const organizationStructuredData = generateStructuredData({ type: "Organization", locale });
  const webAppStructuredData = generateStructuredData({ type: "WebApplication", locale });

  return (
    <Providers locale={locale}>
      <link href={`/${locale}/manifest.json`} rel="manifest" />

      <StructuredDataScript data={websiteStructuredData} />
      <StructuredDataScript data={organizationStructuredData} />
      <StructuredDataScript data={webAppStructuredData} />

      <ServiceWorkerRegistration />
      <FavoriteExercisesSynchronizer />
      <WorkoutSessionsSynchronizer />
      <ThemeSynchronizer />
      <AdBlockerForPremium />
      <NextTopLoader color="#FF5722" delay={100} showSpinner={false} />

      <div className="flex items-center justify-center min-h-screen w-full max-sm:min-h-full">
        <div className="flex items-start gap-2 w-full max-sm:gap-0 justify-center">
          <VerticalLeftBanner />
          <div className="min-w-0 sm:min-w-auto w-full sm:w-auto">{children}</div>
          <VerticalRightBanner />
        </div>
      </div>
      <Version />

      <TailwindIndicator />
    </Providers>
  );
}
