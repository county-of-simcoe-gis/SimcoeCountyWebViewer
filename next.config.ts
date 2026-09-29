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
