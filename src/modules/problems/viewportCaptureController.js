import { requestViewportQuestionExtraction } from "./viewportCaptureApi.js";

const PAGE_MESSAGE_SOURCE = "quantgym-collector-extension";
const VIEWPORT_CAPTURE_MESSAGE_TYPE = "quantgym:viewport-capture";

export function createProblemViewportCaptureController(deps = {}) {
  const getWindow = () => deps.windowRef || globalThis.window;
  const getCurrentUser = () => deps.getCurrentUser?.() || null;
  const getLanguage = () => deps.getLanguage?.() || "zh";
  const getLlmConfig = () => deps.getLlmConfig?.() || {};
  const getHeaders = () => deps.getLlmRequestHeaders?.() || {};
  const requestExtraction = deps.requestExtraction || requestViewportQuestionExtraction;
  const normalizeProblem = (problem) => deps.normalizeProblem?.(problem) || problem;
  let inFlight = false;

  function setStatus(message) {
    deps.setStatus?.(message);
  }

  function start() {
    const windowRef = getWindow();
    if (!windowRef?.addEventListener) return () => {};
    const listener = (event) => {
      if (!isViewportCaptureMessage(event, windowRef)) return;
      void processCapture(event.data.payload);
    };
    windowRef.addEventListener("message", listener);
    return () => windowRef.removeEventListener?.("message", listener);
  }

  async function processCapture(payload = {}) {
    if (inFlight) return { status: "busy" };
    if (!getCurrentUser()) {
      setStatus("请先登录 QuantGym 后再记录题目。");
      return { status: "auth_required" };
    }

    const normalizedPayload = normalizeCapturePayload(payload);
    if (!normalizedPayload.screenshot.dataUrl) {
      setStatus("没有收到可识别的屏幕截图。");
      return { status: "invalid" };
    }

    const config = getLlmConfig();
    inFlight = true;
    setStatus("正在识别屏幕里的题目...");
    try {
      const extraction = await requestExtraction({
        endpoint: config.endpoint,
        model: config.model,
        headers: getHeaders(),
        language: getLanguage(),
        ...normalizedPayload
      });
      const problem = normalizeProblem(buildProblemFromExtraction(extraction, normalizedPayload));
      deps.upsertProblems?.([problem]);
      if (problem.id) deps.setSelectedProblemId?.(problem.id);
      deps.switchModule?.("problems");
      deps.renderAll?.();
      setStatus(`已记录：${problem.titleZh || problem.titleEn || "新题目"}`);
      return { status: "ok", problem };
    } catch (error) {
      setStatus(`识别失败：${error.message || "请稍后重试。"}`);
      return { status: "error", error };
    } finally {
      inFlight = false;
    }
  }

  return {
    start,
    processCapture
  };
}

export function isViewportCaptureMessage(event = {}, windowRef = globalThis.window) {
  const data = event.data || {};
  return event.source === windowRef
    && data.source === PAGE_MESSAGE_SOURCE
    && data.type === VIEWPORT_CAPTURE_MESSAGE_TYPE
    && data.payload
    && typeof data.payload === "object";
}

function normalizeCapturePayload(payload = {}) {
  return {
    sourceUrl: String(payload.sourceUrl || payload.pageContext?.sourceUrl || "").trim(),
    pageTitle: String(payload.pageTitle || payload.pageContext?.titleEn || payload.pageContext?.titleZh || "").trim(),
    pageText: String(payload.pageText || payload.pageContext?.promptEn || payload.pageContext?.promptZh || "").slice(0, 12000),
    pageContext: payload.pageContext && typeof payload.pageContext === "object" ? payload.pageContext : {},
    screenshot: {
      dataUrl: /^data:image\//i.test(String(payload.screenshot?.dataUrl || "")) ? payload.screenshot.dataUrl : "",
      type: String(payload.screenshot?.type || "image/jpeg")
    }
  };
}

function buildProblemFromExtraction(extraction = {}, payload = {}) {
  const rawProblem = extraction.problem && typeof extraction.problem === "object"
    ? extraction.problem
    : extraction;
  const title = String(rawProblem.titleEn || rawProblem.titleZh || payload.pageTitle || "Captured question").trim();
  const prompt = String(rawProblem.promptEn || rawProblem.promptZh || payload.pageText || "").trim();
  if (!prompt) throw new Error("LLM did not return a prompt");

  return {
    ...rawProblem,
    titleEn: rawProblem.titleEn || title,
    titleZh: rawProblem.titleZh || "",
    category: rawProblem.category || payload.pageContext?.category || "probabilityExpectation",
    difficulty: rawProblem.difficulty || payload.pageContext?.difficulty || "Medium",
    tags: Array.isArray(rawProblem.tags) ? rawProblem.tags : [],
    source: rawProblem.source || payload.pageContext?.source || "viewport",
    sourceUrl: rawProblem.sourceUrl || payload.sourceUrl,
    promptEn: rawProblem.promptEn || prompt,
    promptZh: rawProblem.promptZh || "",
    answer: rawProblem.answer || "",
    explanation: rawProblem.explanation || "",
    capturedAt: rawProblem.capturedAt || new Date().toISOString()
  };
}
