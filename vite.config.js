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
        output: {
          manualChunks: (id) => {
            // Split node_modules into vendor chunks
            // Be careful not to split packages with interdependencies
            if (id.includes('node_modules')) {
              // React ecosystem - keep together
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router') || 
                  id.includes('scheduler') || id.includes('use-sync-external-store')) {
                return 'vendor-react';
              }
              // OpenLayers mapping - keep together
              if (id.includes('/ol/') || id.includes('ol-mapbox-style') || id.includes('proj4') || 
                  id.includes('geotiff') || id.includes('lerc') || id.includes('rbush')) {
                return 'vendor-ol';
              }
              // ArcGIS - keep separate
              if (id.includes('@arcgis/core')) {
                return 'vendor-arcgis';
              }
              // Let everything else be handled automatically by Vite
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
      exclude: ['@arcgis/core'],
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
