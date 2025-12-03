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
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
                return 'vendor-react';
              }
              if (id.includes('ol') || id.includes('proj4')) {
                return 'vendor-ol';
              }
              if (id.includes('@mui') || id.includes('@emotion') || id.includes('alertifyjs') || 
                  id.includes('react-select') || id.includes('react-datepicker') || 
                  id.includes('react-tooltip') || id.includes('react-modal')) {
                return 'vendor-ui';
              }
              // Don't split @arcgis/core - let it be handled automatically
              if (id.includes('@arcgis/core')) {
                return 'vendor-arcgis';
              }
              return 'vendor-other';
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
