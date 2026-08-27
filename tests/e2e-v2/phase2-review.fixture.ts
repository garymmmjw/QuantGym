import { mkdir } from "node:fs/promises";
import path from "node:path";

import type { Page } from "playwright/test";

const REVIEW_DIRECTORY_ENV = "QUANTGYM_PHASE2_REVIEW_DIR";
const SAFE_LABEL = /^[a-z][a-z0-9-]*$/u;

type Phase2ReviewCapture = Readonly<{
  routeId: "overview" | "plan" | "problems";
  theme: "dark" | "light";
  viewportId: "desktop" | "laptop" | "mobile" | "tablet";
}>;

export async function capturePhase2ReviewImage(
  page: Page,
  capture: Phase2ReviewCapture,
): Promise<string | null> {
  const configuredDirectory = process.env[REVIEW_DIRECTORY_ENV];
  if (configuredDirectory === undefined) return null;
  if (!path.isAbsolute(configuredDirectory)) {
    throw new Error(`${REVIEW_DIRECTORY_ENV} must be an absolute path`);
  }
  for (const label of [capture.routeId, capture.theme, capture.viewportId]) {
    if (!SAFE_LABEL.test(label)) throw new Error("PHASE2_REVIEW_LABEL_INVALID");
  }

  const reviewDirectory = path.resolve(configuredDirectory);
  const filename = `${capture.routeId}-${capture.viewportId}-${capture.theme}.jpg`;
  const destination = path.join(reviewDirectory, filename);
  if (path.dirname(destination) !== reviewDirectory) {
    throw new Error("PHASE2_REVIEW_PATH_INVALID");
  }

  await mkdir(reviewDirectory, { recursive: true });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
  });
  await page.screenshot({
    animations: "disabled",
    caret: "hide",
    fullPage: false,
    path: destination,
    quality: 92,
    scale: "css",
    type: "jpeg",
  });
  return destination;
}
