import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    passWithNoTests: false,
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    include: [
      "tests/frontend-v2-edge-proxy.test.mjs",
      "src/core/**/*.test.{ts,tsx}",
      "src/design-system/**/*.test.{ts,tsx}",
      "src/domains/**/*.test.{ts,tsx}",
      "src/pages/v2/**/*.test.{ts,tsx}",
      "src/shared/**/*.test.{ts,tsx}",
    ],
  },
});
