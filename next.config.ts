import type { NextConfig } from "next";
import path from "path";
import packageJson from "./package.json";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname),
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
  // Configure the base path for the application
  basePath,
  // @arcgis/core ships as ESM — Next.js needs to transpile it for SSR/CSR compat
  transpilePackages: ["@arcgis/core"],
  images: {
    // Custom loader automatically prepends basePath to local image paths.
    // Do NOT add `unoptimized: true` — it skips the loader entirely and
    // breaks basePath resolution. The loader returns direct URLs so images
    // are served as-is without the /_next/image optimization proxy.
    loader: "custom",
    loaderFile: "./src/lib/imageLoader.ts",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.simcoe.ca",
      },
      {
        protocol: "http",
        hostname: "*.simcoe.ca",
      },
    ],
  },
  typescript: {
    // Suppress TypeScript warnings during build (use with caution)
    ignoreBuildErrors: true,
  },
  // Baseline hardening headers for every response
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
          // Report-only until violations from map/ArcGIS/PowerBI/Azure AD sources are reviewed; then switch to enforcing.
          {
            key: "Content-Security-Policy-Report-Only",
            value: "object-src 'none'; base-uri 'self'; form-action 'self' https://login.microsoftonline.com",
          },
        ],
      },
    ];
  },
  // Legacy api_v2 URLs used by the old viewers, mapped onto the new route paths
  async rewrites() {
    return [
      { source: "/api_v2/public/search", destination: "/api/public/search" },
      { source: "/api_v2/public/search/types", destination: "/api/public/search/types" },
      { source: "/api_v2/public/search/:id", destination: "/api/public/search/:id" },
      { source: "/api_v2/public/reports/property/pdf/:arn", destination: "/api/public/reports/property/pdf/:arn" },
      { source: "/api_v2/public/reports/property/CondoChildren/:arn", destination: "/api/public/reports/condo-children/:arn" },
      { source: "/api_v2/public/reports/property/:arn", destination: "/api/public/reports/property/:arn" },
      { source: "/api_v2/public/reports/parcel/image/:arn/:overview/:width/:height", destination: "/api/public/reports/parcel/image/:arn/:overview/:width/:height" },
      { source: "/api_v2/public/reports/mls/image/:mls/:overview/:width/:height", destination: "/api/public/reports/mls/image/:mls/:overview/:width/:height" },
      { source: "/api_v2/public/reports/EconomicDevelopment/MLS/:mls", destination: "/api/public/reports/economic-development/mls/:mls" },
      { source: "/api_v2/public/report/planning/images", destination: "/api/public/reports/planning/images" },
      { source: "/api_v2/public/report/landvalues/images", destination: "/api/public/reports/landvalues/images" },
      { source: "/api_v2/public/reports/embed/:report", destination: "/api/public/reports/embed/:report" },
      // Legacy standalone apps were served from nginx, which matched these paths case-insensitively
      { source: "/layerinfo", destination: "/layerInfo" },
      { source: "/featureReports", destination: "/featurereports" },
      { source: "/Legend", destination: "/legend" },
    ];
  },
  webpack: (config, { dev }) => {
    // Suppress warnings in production builds
    if (!dev) {
      config.infrastructureLogging = { level: "error" };
      config.stats = "errors-only";
    }
    return config;
  },
};

export default nextConfig;
