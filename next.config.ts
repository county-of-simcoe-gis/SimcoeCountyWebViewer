import type { NextConfig } from "next";
import packageJson from "./package.json";

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
  // @arcgis/core ships as ESM — Next.js needs to transpile it for SSR/CSR compat
  transpilePackages: ["@arcgis/core"],
  images: {
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
