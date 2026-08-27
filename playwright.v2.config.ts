import { defineConfig } from "playwright/test";

const port = 42_731;
const baseURL = `http://localhost:${port}`;
const browserChannel = process.env.PLAYWRIGHT_USE_SYSTEM_CHROME === "1" ? "chrome" : undefined;

export default defineConfig({
  captureGitInfo: {
    commit: false,
    diff: false,
  },
  testDir: "./tests/e2e-v2",
  outputDir: "./test-results/e2e-v2",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"]],
  timeout: 30_000,
  expect: {
    timeout: 5_000,
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      scale: "css",
    },
  },
  use: {
    baseURL,
    browserName: "chromium",
    channel: browserChannel,
    colorScheme: "light",
    locale: "zh-CN",
    reducedMotion: "reduce",
    serviceWorkers: "block",
    trace: "retain-on-failure",
    viewport: { width: 1_440, height: 900 },
  },
  webServer: {
    command: `npm run dev -- --config vite.v2.config.ts --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
