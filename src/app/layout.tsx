import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/app/globals.css";
import AuthProvider from "@/app/auth/Provider";
import ArcGISAuthProvider from "@/components/auth/ArcGISAuthProvider";
import { ToastContainer } from "@/components/Toast";
import { UrlParameterProvider } from "@/contexts/UrlParameterContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Web Viewer", // This will be updated dynamically from config
  description: "Interactive web mapping application", // This will be updated dynamically from config
  icons: {
    icon: "/favicon.ico", // This will be updated dynamically from config
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
            </UrlParameterProvider>
          </ArcGISAuthProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
