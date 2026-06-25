# Viewport Capture Recording Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome extension flow where the user places a problem in the visible browser viewport, clicks `记录题目`, and QuantGym extracts and saves the question without manual selection or manual screenshots.

**Architecture:** The extension captures the active tab viewport and lightweight page context, then opens/focuses QuantGym and sends a capture bundle through a QuantGym-only content-script bridge. The QuantGym web app receives the bundle, calls the existing LLM proxy with the logged-in user's session headers, normalizes the extracted question, and upserts it into the problem bank. The LLM proxy gains one new `/interview` task for vision extraction from a screenshot.

**Tech Stack:** Chrome Manifest V3, `chrome.tabs.captureVisibleTab`, `chrome.scripting`, content-script messaging, Vite/React app services, Node LLM proxy using OpenAI Responses API image input, existing Node smoke scripts.

---

## File Structure

- Modify `browser-extension/manifest.json`: add the QuantGym content script bridge and the `tabs` permission required for viewport capture.
- Modify `browser-extension/popup.html`, `browser-extension/popup.css`, `browser-extension/popup.js`: replace the old collect-first popup with one-click viewport recording while preserving JSON fallback.
- Create `browser-extension/quantgym-bridge.js`: receive extension messages on QuantGym pages and forward them to the web app via `window.postMessage`.
- Modify `scripts/check-browser-extension-runtime-smoke.mjs`: assert the new click flow captures a viewport screenshot and sends a bundle to QuantGym.
- Modify `scripts/check-browser-extension.mjs`, `scripts/check-chrome-store-readiness.mjs`, `scripts/package-browser-extension.mjs`: allow and package the bridge file and revised permissions.
- Create `src/modules/problems/viewportCaptureApi.js`: call the LLM proxy task and normalize request/response errors.
- Create `src/modules/problems/viewportCaptureController.js`: listen for bridge messages, call the API, save the extracted problem, and surface status.
- Modify `src/app/createAppContext/sharedImports.js` and `src/app/createAppContext/slices/impl/initShellSlice.impl.js`: wire the viewport capture controller into app startup.
- Modify `llm-proxy/server.mjs`: add `task: "extract_screenshot_question"` and normalize output to one QuantGym problem.
- Create `scripts/check-viewport-capture-llm-fixture.mjs`: start the LLM proxy against a fake OpenAI endpoint and verify the task sends image input and returns a valid problem.
- Modify `package.json`: add a check script for the LLM fixture.
- Modify `docs/chrome-extension-privacy.md`, `public/chrome-extension-privacy.html`, `browser-extension/store-listing.json`, `browser-extension/README.md`: disclose visible-tab screenshots and QuantGym-only bridge behavior.

## Task 1: Extension Runtime Smoke

- [ ] **Step 1: Write the failing test**

Update `scripts/check-browser-extension-runtime-smoke.mjs` to expect:

```js
checks.viewportCaptureCalled = calls.captureVisibleTab.length === 1;
checks.viewportCaptureUsesJpeg = calls.captureVisibleTab[0]?.options?.format === "jpeg";
checks.bridgeTabOpened = calls.openedTabs.at(-1)?.includes("beta.quantgym.app");
checks.bridgeMessageSent = calls.sentMessages.some((item) => item.message?.type === "quantgym:viewport-capture");
checks.bridgePayloadHasScreenshot = /^data:image\/jpeg;base64,/.test(calls.sentMessages.at(-1)?.message?.payload?.screenshot?.dataUrl || "");
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run check:browser-extension:runtime-smoke`

Expected: FAIL because `chrome.tabs.captureVisibleTab` and bridge messaging are not implemented.

- [ ] **Step 3: Implement minimal extension flow**

Update popup code to capture the visible tab, extract page context, open/focus QuantGym, and send the bridge message. Add `browser-extension/quantgym-bridge.js`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run check:browser-extension:runtime-smoke`

Expected: PASS.

## Task 2: Web App Bridge Receiver

- [ ] **Step 1: Write the failing tests**

Create controller/API tests through a lightweight Node script or extend an existing smoke so it asserts:

```js
const controller = createProblemViewportCaptureController({
  getCurrentUser: () => ({ id: "fixture-user" }),
  getLlmConfig: () => ({ endpoint: "https://llm.quantgym.app/interview", model: "gpt-5-nano" }),
  getLlmRequestHeaders: () => ({ Authorization: "Bearer fixture" }),
  requestExtraction: async () => ({ problem: { titleEn: "Viewport Fixture", promptEn: "Question text", category: "option", difficulty: "Medium", tags: ["option"] } }),
  upsertProblems: (items) => { saved = items; },
  setSelectedProblemId: (id) => { selected = id; },
  renderAll: () => { rendered = true; }
});
await controller.processCapture({ screenshot: { dataUrl: "data:image/jpeg;base64,abc" }, sourceUrl: "https://example.com/q" });
```

Expected assertions: one problem is saved, selected id is set, and render is called.

- [ ] **Step 2: Run the test to verify it fails**

Run the new or updated smoke command and confirm missing module/function failure.

- [ ] **Step 3: Implement the receiver**

Add `viewportCaptureApi.js` and `viewportCaptureController.js`; wire the controller in app startup.

- [ ] **Step 4: Run the test to verify it passes**

Run the new smoke and `npm run check:ui-contracts`.

Expected: PASS.

## Task 3: LLM Vision Extraction Task

- [ ] **Step 1: Write the failing fixture**

Create `scripts/check-viewport-capture-llm-fixture.mjs` that starts a fake OpenAI Responses endpoint, starts `llm-proxy/server.mjs`, posts:

```json
{
  "task": "extract_screenshot_question",
  "model": "gpt-5-nano",
  "language": "zh",
  "sourceUrl": "https://example.com/question",
  "pageTitle": "Question page",
  "screenshot": { "dataUrl": "data:image/jpeg;base64,..." },
  "pageText": "visible page text"
}
```

Expected: the proxy sends one `input_image` part to fake OpenAI and returns a normalized `problem` with `titleEn`, `promptEn`, `category`, `difficulty`, `tags`, and `sourceUrl`.

- [ ] **Step 2: Run the fixture to verify it fails**

Run: `node scripts/check-viewport-capture-llm-fixture.mjs`

Expected: FAIL with unsupported task.

- [ ] **Step 3: Implement the LLM task**

Add `createScreenshotQuestionExtraction(payload)` and branch from `createInterviewReply`.

- [ ] **Step 4: Run the fixture to verify it passes**

Run: `node scripts/check-viewport-capture-llm-fixture.mjs`

Expected: PASS.

## Task 4: Packaging, Policy, and Final Verification

- [ ] **Step 1: Write failing checker expectations**

Update extension/store checkers so the new `tabs` permission, QuantGym host bridge, and bridge file are required. Run `npm run check:browser-extension` and verify it fails before manifest/package updates.

- [ ] **Step 2: Implement checker, manifest, package, docs, and listing updates**

Update manifest permissions/content scripts/package file list and privacy disclosures.

- [ ] **Step 3: Run extension and store gates**

Run:

```bash
npm run check:browser-extension
npm run check:browser-extension:runtime-smoke
npm run check:chrome-store-readiness
npm run check:chrome-store-publication
```

Expected: PASS.

- [ ] **Step 4: Run broader release checks**

Run:

```bash
npm run check:viewport-capture-llm:fixture
npm run check:ui-contracts
npm run check:render-llm-deploy
```

Expected: PASS.

