import type { Page } from "playwright/test";

export type Phase2VisualRouteCaseFacts = Readonly<{
  brandAssetCount: number;
  clippedElementCount: number;
  horizontalOverflowPx: number;
  legacyFrameCount: number;
  skeletonCount: number;
}>;

const visibleSkeletonSelector = [
  '[aria-busy="true"]',
  "[data-skeleton]",
  '[data-loading-state="loading"]',
  '[class*="Skeleton"]',
  '[class*="skeleton"]',
].join(", ");

const brandAssetSelector = [
  "[data-quanty-prominence]",
  'a[aria-label="QuantGym"]',
  'img[alt*="Quanty" i]',
  'img[alt*="QuantGym" i]',
].join(", ");

const criticalElementSelector = [
  "main",
  "main h1",
  "main h2",
  "main button",
  "main a",
  'a[aria-label="QuantGym"]',
].join(", ");

export const collectPhase2VisualRouteCaseFacts = async (
  page: Page,
): Promise<Phase2VisualRouteCaseFacts> => page.evaluate((selectors) => {
  const isVisible = (element: Element) => {
    if (!(element instanceof HTMLElement)) return false;
    const style = window.getComputedStyle(element);
    const bounds = element.getBoundingClientRect();
    return (
      style.display !== "none"
      && style.visibility !== "hidden"
      && Number.parseFloat(style.opacity) !== 0
      && bounds.width > 0
      && bounds.height > 0
    );
  };
  const visibleCount = (selector: string) => (
    [...document.querySelectorAll(selector)].filter(isVisible).length
  );
  const clippedElementCount = [...document.querySelectorAll(selectors.critical)]
    .filter(isVisible)
    .filter((element) => {
      const bounds = element.getBoundingClientRect();
      return bounds.left < -1 || bounds.right > window.innerWidth + 1;
    }).length;
  return {
    brandAssetCount: visibleCount(selectors.brand),
    clippedElementCount,
    horizontalOverflowPx: Math.max(
      0,
      document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
    legacyFrameCount: visibleCount("iframe[data-legacy-preview-frame]"),
    skeletonCount: visibleCount(selectors.skeleton),
  };
}, {
  brand: brandAssetSelector,
  critical: criticalElementSelector,
  skeleton: visibleSkeletonSelector,
});

export const collectPhase2ReducedMotionFacts = async (
  page: Page,
  rootSelector: string,
) => page.locator(rootSelector).evaluate((root) => {
  const parseDuration = (value: string) => value
    .split(",")
    .map((entry) => entry.trim())
    .map((entry) => (
      entry.endsWith("ms")
        ? Number.parseFloat(entry)
        : Number.parseFloat(entry) * 1_000
    ))
    .filter(Number.isFinite);
  const elements = [root, ...root.querySelectorAll("*")];
  const animationDurations = elements.flatMap((element) => (
    parseDuration(window.getComputedStyle(element).animationDuration)
  ));
  const transitionDurations = elements.flatMap((element) => (
    parseDuration(window.getComputedStyle(element).transitionDuration)
  ));
  return {
    maxAnimationDurationMs: Math.max(0, ...animationDurations),
    maxTransitionDurationMs: Math.max(0, ...transitionDurations),
    reducedMotionMatched: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  };
});
