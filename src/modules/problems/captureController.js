import {
  getIncomingProblemCaptureResult,
  getPendingProblemCaptureResult,
  writePendingProblemCapture
} from './capture.js';

const CAPTURE_ERROR_MESSAGE = "插件捕获的题目无法读取。";
const CAPTURE_PENDING_MESSAGE = "登录后会自动收录刚才捕获的题目。";

export function createProblemCaptureController(deps = {}) {
  const getCurrentUser = () => deps.getCurrentUser?.() || null;
  const getWindow = () => deps.windowRef || globalThis.window;
  const getHistory = () => deps.historyRef || getWindow()?.history || globalThis.history;
  const getLocation = () => deps.getLocation?.() || getWindow()?.location || globalThis.location;
  const getStorage = () => deps.storage || getWindow()?.sessionStorage || globalThis.sessionStorage;
  const storageKey = deps.storageKey || "quantgym-pending-problem-capture";
  const normalizeProblem = (problem) => deps.normalizeProblem?.(problem) || problem;

  function selectFirstProblem(problems = []) {
    const first = (Array.isArray(problems) ? problems : [problems])[0];
    if (!first) return;
    deps.setSelectedProblemId?.(normalizeProblem(first).id);
  }

  function consumeIncoming() {
    const result = getIncomingProblemCaptureResult(getLocation());
    if (result.status === "none") return result;

    try {
      if (result.status === "ok") {
        if (getCurrentUser()) {
          deps.upsertProblems?.(result.problems);
          selectFirstProblem(result.problems);
        } else {
          writePendingProblemCapture(storageKey, result.problems, getStorage());
          deps.showAuthMessage?.(CAPTURE_PENDING_MESSAGE);
        }
      } else {
        deps.showAuthMessage?.(CAPTURE_ERROR_MESSAGE);
      }
    } catch {
      deps.showAuthMessage?.(CAPTURE_ERROR_MESSAGE);
    } finally {
      getHistory()?.replaceState?.(null, "", result.nextUrl);
    }

    return result;
  }

  function consumePending() {
    if (!getCurrentUser()) return { status: "skipped", problems: [] };
    const result = getPendingProblemCaptureResult(storageKey, getStorage());
    if (result.status !== "ok") return result;
    deps.upsertProblems?.(result.problems);
    selectFirstProblem(result.problems);
    return result;
  }

  return {
    consumeIncoming,
    consumePending
  };
}
