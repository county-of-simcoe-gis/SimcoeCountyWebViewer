import type { NextConfig } from "next";
import packageJson from "./package.json";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
  // Configure the base path for the application
  basePath,
  // @arcgis/core ships as ESM — Next.js needs to transpile it for SSR/CSR compat
  transpilePackages: ["@arcgis/core"],
  images: {
    // Custom loader prepends basePath for local images and passes external
    // URLs through unchanged.  This replaces the built-in optimizer so
    // images are served as-is (no /_next/image proxy).
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
  eslint: {
    // Suppress ESLint warnings during build (use with caution)
    ignoreDuringBuilds: true,
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
