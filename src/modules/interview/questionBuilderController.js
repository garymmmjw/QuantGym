import { readFilePayload } from '../../lib/files.js';
import {
  buildInterviewQuestionSet,
  normalizeGeneratedInterviewProblem
} from './questionPool.js';

const MAX_PDF_BYTES = 20 * 1024 * 1024;

export function createInterviewQuestionBuilderController(deps = {}) {
  const elements = deps.elements || {};
  const difficultyDefs = deps.difficultyDefs || {};
  const getInterviewState = deps.getInterviewState || (() => ({}));

  function buildFullRangeQuestions(count, type, config = {}) {
    const pool = deps.makeProblemPool?.(type, config) || [];
    return buildInterviewQuestionSet({
      pool,
      count,
      difficulty: config.difficulty,
      difficultyDefs,
      selectedProblemId: deps.getSelectedProblemId?.() || "",
      normalizeProblem: deps.normalizeProblem || ((problem) => problem),
      randomInt: deps.randomInt
    });
  }

  async function buildPdfQuestions(count, type) {
    const language = getInterviewState().language === "en" ? "en" : "zh";
    const file = elements.interviewPdfInput?.files?.[0];
    if (!file) throw new Error(language === "zh" ? "请先上传 PDF。" : "Upload a PDF first.");
    if (file.size > MAX_PDF_BYTES) {
      throw new Error(language === "zh" ? "PDF 太大，请先控制在 20MB 内。" : "PDF is too large; keep it under 20MB.");
    }
    deps.appendMessage?.("coach", language === "zh" ? "正在分析 PDF 并生成题目..." : "Analyzing PDF and generating questions...");
    const filePayload = await readFilePayload(file, { preferDataUrl: true });
    const data = await deps.requestPdfQuestionGeneration?.(filePayload, count, type);
    const questions = Array.isArray(data?.questions) ? data.questions : [];
    if (data?.summary) {
      const messages = getInterviewState().messages || [];
      deps.updateMessage?.(messages[messages.length - 1]?.id, data.summary);
    }
    const normalized = questions
      .slice(0, count)
      .map((item, index) => normalizeGeneratedProblem(item, index, file.name, type));
    if (normalized.length) deps.upsertProblems?.(normalized);
    return normalized;
  }

  function normalizeGeneratedProblem(raw, index, sourceName, type) {
    return normalizeGeneratedInterviewProblem(raw, index, sourceName, type, {
      normalizeProblem: deps.normalizeProblem,
      normalizeCategory: deps.normalizeCategory,
      parseTags: deps.parseTags,
      stableId: deps.stableId,
      makeId: deps.makeId
    });
  }

  return {
    buildFullRangeQuestions,
    buildPdfQuestions,
    normalizeGeneratedProblem
  };
}
