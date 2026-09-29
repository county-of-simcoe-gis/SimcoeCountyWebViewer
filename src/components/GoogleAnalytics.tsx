"use client";

import Script from "next/script";
import { useAppStore } from "@/stores/appStore";

/**
 * Google Analytics component that conditionally loads gtag.js
 * when a googleAnalyticsID is present in config.
 *
 * Reads the merged config from appStore so that API overrides
 * (e.g. a different GA ID per municipality) are respected.
 *
 * The ANALYTICS URL parameter can disable tracking when set to "off"
 * (checked upstream in UrlParameterContext).
 */
export default function GoogleAnalytics() {
  const gaId = useAppStore((s) => s.config?.googleAnalyticsID);

  if (!gaId) return null;

  return (
    <>
      {/* Load the gtag.js library */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      {/* Initialize dataLayer and send initial pageview */}
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}', {
            page_path: window.location.pathname + window.location.search,
          });
        `}
      </Script>
    </>
  );
}
