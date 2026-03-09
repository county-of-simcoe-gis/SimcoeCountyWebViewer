import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  // Only expose REACT_APP_ prefixed variables
  const exposedEnv = Object.keys(env)
    .filter((key) => key.startsWith("REACT_APP_"))
    .reduce((obj, key) => {
      obj[key] = env[key];
      return obj;
    }, {});

  // Add NODE_ENV and PUBLIC_URL
  exposedEnv.NODE_ENV = mode;
  exposedEnv.PUBLIC_URL = "";

  return {
    plugins: [
      react({
        include: "**/*.{jsx,js}", // Enable JSX for both .jsx and .js files
      }),
      nodePolyfills({
        // Whether to polyfill `node:` protocol imports.
        protocolImports: true,
      }),
    ],
    base: "./",
    build: {
      outDir: "build",
      sourcemap: false,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        onwarn(warning, warn) {
          // Suppress known react-virtualized flow directive warning
          if (warning.message?.includes("Module level directives cause errors when bundled") && warning.id?.includes("react-virtualized")) {
            return;
          }
          warn(warning);
        },
        output: {
          manualChunks: (id) => {
            // Split node_modules into vendor chunks
            // Order matters: check specific packages first to avoid circular chunks
            if (id.includes("node_modules")) {
              // ArcGIS - check first (most specific)
              if (id.includes("@arcgis/core")) {
                return "vendor-arcgis";
              }
              // OpenLayers mapping - check before react to avoid catching react-* packages that depend on ol
              if (id.includes("/ol/") || id.includes("ol-mapbox-style") || id.includes("proj4") || id.includes("geotiff") || id.includes("lerc") || id.includes("rbush")) {
                return "vendor-ol";
              }
              // Core React packages only (exact package names to avoid circular deps with react-* ecosystem packages)
              if (/[/\\]node_modules[/\\](react|react-dom|react-router|react-router-dom|scheduler|use-sync-external-store)[/\\]/.test(id)) {
                return "vendor-react";
              }
              // Let everything else (including react-* ecosystem packages) be handled automatically by Vite
              // This prevents circular dependency issues
            }
          },
        },
      },
    },
    server: {
      port: 3000,
      open: true,
    },
    define: {
      "process.env": JSON.stringify(exposedEnv),
    },
    esbuild: {
      loader: "jsx",
      include: /src\/.*\.jsx?$/,
      exclude: [],
    },
    optimizeDeps: {
      esbuildOptions: {
        loader: {
          ".js": "jsx",
        },
      },
      exclude: ["@arcgis/core"],
    },
    resolve: {
      alias: {
        // Add any path aliases if needed
      },
    },
    css: {
      postcss: null, // Disable PostCSS processing to avoid CSS syntax errors with legacy IE hacks
    },
  };
});
