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
          if (id.includes("node_modules/react-router") || id.includes("node_modules/@remix-run/router")) {
            return "vendor-router";
          }
          if (id.includes("node_modules/react-dom")) {
            return "vendor-react-dom";
          }
          if (id.includes("node_modules/react/")) {
            return "vendor-react";
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
