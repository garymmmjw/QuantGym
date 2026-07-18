import { createServer } from "node:http";
import { access, readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { chromium } from "playwright";

import {
  compareStoryIds,
  isCompleteStorySet,
  isStoryRenderReady,
} from "./lib/storybook-a11y-v2.mjs";

const root = await realpath(path.resolve("storybook-static-v2")).catch(() => null);
if (root === null) {
  throw new Error("STORYBOOK_V2_BUILD_MISSING");
}

const index = JSON.parse(await readFile(path.join(root, "index.json"), "utf8"));
const stories = Object.values(index.entries ?? {})
  .filter((entry) => entry?.type === "story")
  .map((entry) => ({ id: entry.id, title: entry.title, name: entry.name }))
  .sort((left, right) => left.id.localeCompare(right.id));
const storySetDifference = compareStoryIds(stories.map(({ id }) => id));
if (!isCompleteStorySet(storySetDifference)) {
  throw new Error(`STORYBOOK_V2_STORY_SET_MISMATCH: ${JSON.stringify(storySetDifference)}`);
}

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
  [".woff2", "font/woff2"],
]);

const staticFile = async (requestPath) => {
  let decoded;
  try {
    decoded = decodeURIComponent(requestPath);
  } catch {
    return null;
  }
  const relativePath = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  const candidate = path.resolve(root, relativePath);
  const relative = path.relative(root, candidate);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    return null;
  }
  const details = await stat(candidate).catch(() => null);
  if (details === null || !details.isFile()) return null;
  const canonical = await realpath(candidate);
  const canonicalRelative = path.relative(root, canonical);
  if (
    canonicalRelative === ".."
    || canonicalRelative.startsWith(`..${path.sep}`)
    || path.isAbsolute(canonicalRelative)
  ) {
    return null;
  }
  return canonical;
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    const filePath = await staticFile(url.pathname);
    if (filePath === null) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }
    const body = await readFile(filePath);
    response.writeHead(200, {
      "cache-control": "no-store",
      "content-type": contentTypes.get(path.extname(filePath)) ?? "application/octet-stream",
      "x-content-type-options": "nosniff",
    });
    response.end(body);
  } catch {
    response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    response.end("Static preview failed");
  }
});

await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});

const address = server.address();
if (address === null || typeof address === "string") throw new Error("STORYBOOK_V2_SERVER_INVALID");
const origin = `http://127.0.0.1:${address.port}`;

const launchBrowser = async () => {
  try {
    return await chromium.launch({ headless: true });
  } catch (primaryError) {
    const macChrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    if (process.platform !== "darwin") throw primaryError;
    await access(macChrome);
    return chromium.launch({ executablePath: macChrome, headless: true });
  }
};

const waitForStoryRender = async (page, expectedStoryId) => {
  const deadline = Date.now() + 10_000;
  let state = null;
  do {
    state = await page.evaluate((storyId) => {
      const root = document.getElementById("storybook-root");
      const visibleModalCount = Array.from(
        document.querySelectorAll('[role="dialog"][aria-modal="true"]'),
      ).filter((element) => {
        const style = window.getComputedStyle(element);
        return element.closest("[hidden], [inert], [aria-hidden='true']") === null
          && style.display !== "none"
          && style.visibility !== "hidden"
          && style.visibility !== "collapse";
      }).length;
      return {
        bodyClassNames: document.body.className,
        documentTitle: document.title,
        expectedStoryId: storyId,
        rootChildCount: root?.childNodes.length ?? 0,
        visibleModalCount,
      };
    }, expectedStoryId);
    if (isStoryRenderReady(state)) return { ready: true, state };
    await page.waitForTimeout(50);
  } while (Date.now() < deadline);
  return { ready: false, state };
};

const checkDialogIframeFocusGuard = async (page) => {
  const inserted = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"][aria-modal="true"]');
    const endGuard = dialog?.querySelector('[data-modal-focus-guard="end"]');
    if (dialog === null || endGuard === null || dialog === undefined || endGuard === undefined) {
      return false;
    }
    const frame = document.createElement("iframe");
    frame.dataset.modalFocusProbe = "true";
    frame.title = "Embedded focus boundary probe";
    frame.srcdoc = '<button type="button">Embedded last action</button>';
    dialog.insertBefore(frame, endGuard);
    return true;
  });
  if (!inserted) return false;

  try {
    const embeddedButton = page
      .frameLocator('iframe[data-modal-focus-probe="true"]')
      .getByRole("button", { name: "Embedded last action" });
    await embeddedButton.focus();
    await page.keyboard.press("Tab");
    await page.waitForFunction(
      () => document.activeElement?.getAttribute("aria-label") === "Close dialog",
      undefined,
      { timeout: 3_000 },
    );
    return true;
  } catch {
    return false;
  } finally {
    await page.locator('iframe[data-modal-focus-probe="true"]')
      .evaluate((frame) => frame.remove())
      .catch(() => undefined);
  }
};

let browser;
let context;
const failures = [];
try {
  browser = await launchBrowser();
  context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  for (const story of stories) {
    const runtimeErrors = [];
    const onPageError = (error) => runtimeErrors.push(error.name || "PAGE_ERROR");
    page.on("pageerror", onPageError);
    const target = `${origin}/iframe.html?id=${encodeURIComponent(story.id)}&viewMode=story`;
    const response = await page.goto(target, { waitUntil: "networkidle" });
    const render = await waitForStoryRender(page, story.id);
    if (!render.ready) {
      failures.push({
        story,
        check: "render-ready",
        responseStatus: response?.status() ?? null,
        renderState: render.state,
        runtimeErrors,
      });
      page.off("pageerror", onPageError);
      continue;
    }
    const storyError = await page.locator(".sb-errordisplay, [data-test-id='story-render-error']")
      .first()
      .isVisible()
      .catch(() => false);
    if (response?.ok() !== true || storyError || runtimeErrors.length > 0) {
      failures.push({ story, check: "render", runtimeErrors });
      page.off("pageerror", onPageError);
      continue;
    }

    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    if (result.violations.length > 0) {
      failures.push({
        story,
        check: "axe",
        violations: result.violations.map((violation) => ({
          id: violation.id,
          impact: violation.impact,
          nodes: violation.nodes.map((node) => node.target),
        })),
      });
    }
    if (story.id === "primitives-dialog--ready") {
      const iframeFocusGuardPassed = await checkDialogIframeFocusGuard(page);
      if (!iframeFocusGuardPassed) {
        failures.push({ story, check: "iframe-focus-guard" });
      }
    }
    page.off("pageerror", onPageError);
  }
} finally {
  await context?.close();
  await browser?.close();
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}

if (failures.length > 0) {
  console.error(JSON.stringify({ status: "fail", check: "storybook-a11y-v2", failures }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    status: "pass",
    check: "storybook-a11y-v2",
    stories: stories.length,
    standards: ["WCAG 2.0 A/AA", "WCAG 2.1 A/AA", "WCAG 2.2 AA"],
  }, null, 2));
}
