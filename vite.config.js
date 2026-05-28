import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig({
  // index.html is the entry point; Vite resolves <script type="module"> tags from it.
  root: ".",
  build: {
    outDir: "dist",
    emptyOutDir: false,
    // Keep asset filenames predictable for the static deploy pipeline.
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]"
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
