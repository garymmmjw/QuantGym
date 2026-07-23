import type { Page } from "playwright/test";

const LEGACY_PREVIEW_ROUTE = (
  "https://legacy-compat.quantgym-v2-preview.pages.dev/**"
);

const routeTitles: Readonly<Record<string, string>> = Object.freeze({
  "/": "总览",
  "/account": "账户",
  "/community": "论坛",
  "/companies": "公司",
  "/courses": "课程",
  "/experiences": "面经",
  "/interview": "模拟面试",
  "/jobs": "求职",
  "/league": "联赛",
  "/library": "资料库",
  "/memory": "资料笔记",
  "/messages": "聊天",
  "/network": "人脉",
  "/news": "新闻",
  "/pk": "PK 对战",
  "/plan": "计划",
  "/poker": "Poker",
  "/problems": "题目",
  "/resume": "简历",
  "/settings": "设置",
  "/skills": "能力值",
  "/tools": "训练工具",
});

const escapeHtml = (value: string) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

export const mockLegacyPreviewFrame = async (page: Page) => {
  await page.route(LEGACY_PREVIEW_ROUTE, async (route) => {
    const pathname = new URL(route.request().url()).pathname.replace(/\/+$/u, "") || "/";
    const title = routeTitles[pathname] ?? "兼容页面";
    await route.fulfill({
      status: 200,
      contentType: "text/html; charset=utf-8",
      headers: {
        "cache-control": "no-store",
        "referrer-policy": "no-referrer",
      },
      body: `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)} · Legacy fixture</title>
    <style>
      :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
      * { box-sizing: border-box; }
      body { min-height: 100vh; margin: 0; padding: 32px; background: #f7f7fb; color: #26273b; }
      main { max-width: 720px; margin: 0 auto; padding: 48px; border: 1px solid #dedff0; border-radius: 24px; background: #fff; }
      p { margin: 0 0 12px; color: #696b80; line-height: 1.6; }
      h1 { margin: 0 0 16px; font-size: clamp(2rem, 6vw, 4rem); letter-spacing: -.04em; }
      small { color: #5b5ff5; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
      @media (prefers-color-scheme: dark) {
        body { background: #181925; color: #f8f8ff; }
        main { border-color: #34364e; background: #222334; }
        p { color: #b5b6c8; }
      }
    </style>
  </head>
  <body>
    <main>
      <small>Isolated legacy fixture</small>
      <h1>${escapeHtml(title)}</h1>
      <p>该区域仅用于验证跨域兼容边界，不计入新版系统证据。</p>
    </main>
  </body>
</html>`,
    });
  });
};

export const hideLegacyPreviewFrameForScreenshot = async (page: Page) => {
  const frame = page.locator("iframe[data-legacy-preview-frame]");
  await frame.waitFor({ state: "visible" });
  await frame.evaluate((element) => {
    // The cross-origin surface is explicitly excluded from V2 visual evidence.
    // Hiding only its pixels keeps the adapter chrome and natural stacking intact.
    element.style.visibility = "hidden";
  });
};
