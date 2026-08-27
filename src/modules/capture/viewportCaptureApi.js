import { requestJson } from "../../api/client.js";

export async function requestViewportQuestionExtraction(options = {}) {
  const endpoint = String(options.endpoint || "").trim();
  if (!endpoint) throw new Error("Missing LLM endpoint");
  const screenshot = options.screenshot || {};
  if (!/^data:image\//i.test(String(screenshot.dataUrl || ""))) {
    throw new Error("Missing viewport screenshot");
  }

  return requestJson(endpoint, {
    method: "POST",
    headers: options.headers,
    auth: false,
    fetchImpl: options.fetchImpl,
    body: {
      task: "extract_screenshot_question",
      model: options.model,
      language: options.language,
      sourceUrl: options.sourceUrl,
      pageTitle: options.pageTitle,
      pageText: options.pageText,
      pageContext: options.pageContext,
      screenshot
    }
  });
}
