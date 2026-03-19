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
    // Use a custom loader so the image optimizer fetches local public images
    // with the correct basePath prefix (Next.js strips basePath from the
    // optimizer's internal fetch, causing 404s for /images/* files).
    loader: "custom",
    loaderFile: "./src/lib/imageLoader.ts",
    // The custom loader only handles basePath prefixing, not real
    // width-based optimization, so mark images as unoptimized to
    // suppress "loader does not implement width" console warnings.
    unoptimized: true,
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
