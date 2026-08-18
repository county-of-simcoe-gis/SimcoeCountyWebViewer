import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "@/app/globals.css";
import "@/styles/openlayers.css";
import AuthProvider from "@/app/auth/Provider";
import ArcGISAuthProvider from "@/components/auth/ArcGISAuthProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastContainer } from "@/components/Toast";
import { UrlParameterProvider } from "@/contexts/UrlParameterContext";

const geistSans = GeistSans;
const geistMono = GeistMono;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <ArcGISAuthProvider>
            <ThemeProvider>
              <UrlParameterProvider>
                {children}
                <ToastContainer />
                <div id="datepicker-portal" className="z-[1100] relative" />
              </UrlParameterProvider>
            </ThemeProvider>
          </ArcGISAuthProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
