import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  // index.html is the entry point; Vite resolves <script type="module"> tags from it.
  root: ".",
  plugins: [react()],
  build: {
    outDir: process.env.QUANTGYM_WEB_DIST || "dist",
    emptyOutDir: true,
    // Keep asset filenames predictable for the static deploy pipeline.
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
        manualChunks(id) {
          const normalizedId = id.split(path.sep).join("/");
          if (normalizedId.includes("node_modules/react-router") || normalizedId.includes("node_modules/@remix-run/router")) {
            return "vendor-router";
          }
          if (normalizedId.includes("node_modules/react-dom")) {
            return "vendor-react-dom";
          }
          if (normalizedId.includes("node_modules/react/")) {
            return "vendor-react";
          }
          // Split stable app domains without forcing the context/bootstrap glue into one large chunk.
          if (
            normalizedId.endsWith("/src/constants.js") ||
            normalizedId.endsWith("/src/i18n.js") ||
            normalizedId.endsWith("/src/catalog-data.js") ||
            normalizedId.endsWith("/src/prep-data.js") ||
            normalizedId.endsWith("/src/skills.js")
          ) {
            return "app-static-data";
          }
          if (normalizedId.includes("/src/modules/interview/")) {
            return "feature-interview-core";
          }
          if (normalizedId.includes("/src/modules/poker/")) {
            return "feature-poker-core";
          }
          if (normalizedId.includes("/src/modules/problems/")) {
            return "feature-problems-core";
          }
          if (normalizedId.includes("/src/modules/")) {
            return "feature-support-core";
          }
          if (normalizedId.includes("/src/state/") || normalizedId.includes("/src/api/")) {
            return "app-state-api";
          }
          if (normalizedId.includes("/src/ui/")) {
            return "app-ui";
          }
          return undefined;
        }
      }
    }
  },
  // data/*.js and config.js are loaded as plain <script> tags and set window globals
  // before the ES module bundle runs; Vite leaves them untouched.
  server: {
    port: 5176,
    open: "/index.html"
  },
  resolve: {
    alias: {
      "@": path.resolve("src")
    }
  }
});
