#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createProblemViewportCaptureController } from "../src/modules/capture/viewportCaptureController.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const calls = {
  statuses: [],
  upserts: [],
  selected: [],
  rendered: 0,
  switched: [],
  requests: []
};

const controller = createProblemViewportCaptureController({
  getCurrentUser: () => ({ id: "fixture-user" }),
  getLlmConfig: () => ({
    endpoint: "https://llm.quantgym.app/interview",
    model: "gpt-5-nano"
  }),
  getLlmRequestHeaders: () => ({
    "Content-Type": "application/json",
    Authorization: "Bearer fixture"
  }),
  requestExtraction: async (request) => {
    calls.requests.push(request);
    return {
      problem: {
        titleEn: "Viewport Fixture",
        promptEn: "Explain delta hedging from the visible screenshot.",
        category: "option",
        difficulty: "Medium",
        tags: ["option", "delta"],
        sourceUrl: request.sourceUrl
      },
      confidence: "high"
    };
  },
  normalizeProblem: (problem) => ({
    id: problem.id || "normalized-viewport-fixture",
    ...problem
  }),
  upsertProblems: (items) => {
    calls.upserts.push(items);
  },
  setSelectedProblemId: (id) => {
    calls.selected.push(id);
  },
  renderAll: () => {
    calls.rendered += 1;
  },
  switchModule: (name) => {
    calls.switched.push(name);
  },
  setStatus: (message) => {
    calls.statuses.push(message);
  }
});

const result = await controller.processCapture({
  version: 1,
  source: "quantgym-collector",
  sourceUrl: "https://example.com/question",
  pageTitle: "Question page",
  pageText: "Visible page text",
  capturedAt: "2026-06-25T00:00:00.000Z",
  screenshot: {
    dataUrl: "data:image/jpeg;base64,ZmFrZS1pbWFnZQ==",
    type: "image/jpeg"
  }
});

const checks = {
  statusOk: result.status === "ok",
  requestUsesConfiguredEndpoint: calls.requests[0]?.endpoint === "https://llm.quantgym.app/interview",
  requestIncludesBearer: calls.requests[0]?.headers?.Authorization === "Bearer fixture",
  requestIncludesScreenshot: calls.requests[0]?.screenshot?.dataUrl?.startsWith("data:image/jpeg;base64,"),
  requestIncludesSourceUrl: calls.requests[0]?.sourceUrl === "https://example.com/question",
  upsertedOneProblem: calls.upserts[0]?.length === 1,
  selectedNormalizedProblem: calls.selected[0] === "normalized-viewport-fixture",
  renderedAfterSave: calls.rendered === 1,
  switchedToProblems: calls.switched[0] === "problems",
  statusProgress: calls.statuses.some((message) => /识别|Reading/i.test(message)),
  statusSuccess: calls.statuses.some((message) => /已记录|Saved/i.test(message)),
  sharedImportWired: readProjectFile("src/app/createAppContext/sharedImports.js").includes("createProblemViewportCaptureController"),
  shellSliceStartsController: /viewportCaptureController\s*=\s*createProblemViewportCaptureController/.test(readProjectFile("src/app/createAppContext/slices/impl/initShellSlice.impl.js"))
    && /\.start\(\)/.test(readProjectFile("src/app/createAppContext/slices/impl/initShellSlice.impl.js"))
};

const failures = Object.entries(checks)
  .filter(([, passed]) => !passed)
  .map(([name]) => name);

const summary = {
  status: failures.length ? "fail" : "pass",
  checks,
  failures
};

console.log(JSON.stringify(summary, null, 2));
if (failures.length) process.exit(1);

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}
