import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "@/app/globals.css";
import "@/styles/openlayers.css";
import AuthProvider from "@/app/auth/Provider";
import ArcGISAuthProvider from "@/components/auth/ArcGISAuthProvider";
import { ToastContainer } from "@/components/Toast";
import { UrlParameterProvider } from "@/contexts/UrlParameterContext";
import appConfig from "@/config.json";

const geistSans = GeistSans;
const geistMono = GeistMono;

// Initial metadata from local config.json. These values are overridden at
// runtime by `updatePageMetadata` once the merged map config is loaded
// (see `useConfig` hook), which may pull values from the map settings API.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
export const metadata: Metadata = {
  title: appConfig.title,
  description: appConfig.description,
  icons: {
    icon: appConfig.favicon ? `${basePath}/${appConfig.favicon}` : `${basePath}/favicon.ico`,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <ArcGISAuthProvider>
            <UrlParameterProvider>
              {children}
              <ToastContainer />
              <div id="datepicker-portal" className="z-[1100] relative" />
            </UrlParameterProvider>
          </ArcGISAuthProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
