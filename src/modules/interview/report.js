import { interviewSparkline, prettyInterviewTitle } from './format.js';

export function getScoredInterviewResults(session = null) {
  return (session?.questionResults || []).filter((item) => Number.isFinite(Number(item?.score)));
}

export function getInterviewSessionAverage(results = []) {
  const scored = Array.isArray(results) ? results : [];
  return scored.length
    ? Math.round(scored.reduce((sum, item) => sum + Number(item.score || 0), 0) / scored.length)
    : null;
}

export function summarizeInterviewDimensions(results = [], options = {}) {
  const language = options.language === "en" ? "en" : "zh";
  const labels = {
    correctness: language === "zh" ? "正确性" : "Correctness",
    reasoning: language === "zh" ? "推理" : "Reasoning",
    communication: language === "zh" ? "表达" : "Communication"
  };
  return Object.keys(labels)
    .map((key) => {
      const values = results.map((item) => Number(item?.dimensions?.[key]?.score)).filter(Number.isFinite);
      const score = values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10 : 0;
      return { key, label: labels[key], score };
    })
    .sort((a, b) => b.score - a.score);
}

export function getInterviewTrendLines(currentAverage, history = [], options = {}) {
  const language = options.language === "en" ? "en" : "zh";
  const past = (Array.isArray(history) ? history : [])
    .map((item) => Number(item.average))
    .filter(Number.isFinite);
  const series = [...past, ...(Number.isFinite(currentAverage) ? [currentAverage] : [])];
  if (series.length < 2) return [];
  const recent = series.slice(-8);
  const spark = interviewSparkline(recent);
  const first = recent[0];
  const last = recent[recent.length - 1];
  const arrow = last > first ? "↑" : last < first ? "↓" : "→";
  const lines = [language === "zh"
    ? `总分趋势（近 ${recent.length} 场）：${spark} ${first}→${last} ${arrow}`
    : `Overall trend (last ${recent.length}): ${spark} ${first}→${last} ${arrow}`];
  if (past.length && Number.isFinite(currentAverage)) {
    const personalAvg = Math.round(past.reduce((sum, value) => sum + value, 0) / past.length);
    const delta = currentAverage - personalAvg;
    lines.push(language === "zh"
      ? `相比你的历史平均 ${personalAvg}：${delta >= 0 ? "+" : ""}${delta}`
      : `vs your average ${personalAvg}: ${delta >= 0 ? "+" : ""}${delta}`);
  }
  return lines;
}

export function getInterviewPerformanceTags(average, strongest, weakest, options = {}) {
  const useZh = options.language !== "en";
  const tags = [];
  if (average != null && average >= 82) tags.push(useZh ? "面试可用" : "Interview-ready");
  if (average != null && average < 65) tags.push(useZh ? "需要专项复盘" : "Needs targeted review");
  if (strongest?.key === "reasoning") tags.push(useZh ? "推理较强" : "Strong reasoning");
  if (strongest?.key === "communication") tags.push(useZh ? "表达清楚" : "Clear communication");
  if (weakest?.key === "speed") tags.push(useZh ? "速度待练" : "Needs speed practice");
  if (weakest?.key === "correctness") tags.push(useZh ? "正确性优先" : "Correctness first");
  return [...new Set(tags)].slice(0, 4);
}

export function getInterviewNextSteps(average, weakest, options = {}) {
  const useZh = options.language !== "en";
  if (!weakest) {
    return [useZh ? "选择 3 题同方向训练，保留 60 秒口头版答案。" : "Run 3 same-focus questions and keep a 60-second spoken answer."];
  }
  const map = {
    correctness: useZh ? "先重做低分题，补齐标准解法中的关键变量和边界条件。" : "Redo low-score questions and add the key variables and edge cases from the reference.",
    reasoning: useZh ? "每题先写三步推理骨架，再开口作答。" : "Write a three-step reasoning skeleton before speaking.",
    communication: useZh ? "练习先给结论，再按假设、过程、检查展开。" : "Practice conclusion first, then assumptions, process, and checks.",
    speed: useZh ? "把同类题做成 90 秒限时复述。" : "Turn similar questions into 90-second timed explanations.",
    readiness: useZh ? "用 live 模式重开一场，重点练追问下保持结构。" : "Restart in live mode and practice staying structured under follow-ups."
  };
  const primary = map[weakest.key] || map.reasoning;
  const secondary = average != null && average < 70
    ? (useZh ? "下一场建议降一档难度，把完整表达先稳定下来。" : "For the next session, lower difficulty once and stabilize complete answers.")
    : (useZh ? "下一场可以保持难度，增加做市或简历深挖追问。" : "Next session can keep difficulty and add market-making or resume follow-ups.");
  return [primary, secondary];
}

export function buildInterviewCompletionReport(options = {}) {
  const {
    session = null,
    history = [],
    language = "zh",
    formatCategory = (value) => value
  } = options;
  const useZh = language !== "en";
  const results = session?.questionResults || [];
  const scored = getScoredInterviewResults(session);
  const average = getInterviewSessionAverage(scored);
  const trendLines = getInterviewTrendLines(average, history, { language });
  const dimensionSummary = summarizeInterviewDimensions(scored, { language });
  const strongest = dimensionSummary[0];
  const weakest = dimensionSummary[dimensionSummary.length - 1];
  const tags = getInterviewPerformanceTags(average, strongest, weakest, { language });
  const questionLines = (session?.questions || []).map((problem, index) => {
    const result = results[index] || {};
    const title = prettyInterviewTitle(problem, { language, formatCategory });
    const scoreText = Number.isFinite(Number(result.score)) ? `${Math.round(result.score)}/100` : (useZh ? "未评分" : "Not scored");
    const note = result.evaluation || (useZh ? "已记录回答。" : "Answer recorded.");
    return `- Q${index + 1}: ${title || (useZh ? "未命名题目" : "Untitled")} - ${scoreText} - ${note}`;
  });
  const nextSteps = getInterviewNextSteps(average, weakest, { language });
  return useZh
    ? [
      "### 你完成了一场模拟面试",
      average == null ? "总分：样本不足" : `总分：${average}/100`,
      tags.length ? `表现标签：${tags.join("、")}` : "",
      strongest ? `最强维度：${strongest.label} ${strongest.score}/5` : "",
      weakest ? `最弱维度：${weakest.label} ${weakest.score}/5` : "",
      ...(trendLines.length ? ["", "趋势：", ...trendLines] : []),
      "",
      "逐题复盘：",
      ...questionLines,
      "",
      "下一步训练：",
      ...nextSteps.map((item) => `- ${item}`)
    ].filter(Boolean).join("\n")
    : [
      "### Interview completed",
      average == null ? "Overall: not enough scored answers" : `Overall: ${average}/100`,
      tags.length ? `Tags: ${tags.join(", ")}` : "",
      strongest ? `Strongest dimension: ${strongest.label} ${strongest.score}/5` : "",
      weakest ? `Weakest dimension: ${weakest.label} ${weakest.score}/5` : "",
      ...(trendLines.length ? ["", "Trends:", ...trendLines] : []),
      "",
      "Question review:",
      ...questionLines,
      "",
      "Next training:",
      ...nextSteps.map((item) => `- ${item}`)
    ].filter(Boolean).join("\n");
}

export function buildCompletedInterviewHistoryEntry(options = {}) {
  const {
    session = null,
    language = "zh",
    nowIso = () => new Date().toISOString()
  } = options;
  const scored = getScoredInterviewResults(session);
  const average = getInterviewSessionAverage(scored);
  if (!Number.isFinite(average)) return null;
  const dimensions = {};
  summarizeInterviewDimensions(scored, { language }).forEach((dimension) => {
    dimensions[dimension.key] = dimension.score;
  });
  return {
    date: nowIso(),
    mode: session?.mode,
    type: session?.type,
    focusKey: session?.sessionConfig?.focusKey || "",
    average,
    dimensions,
    questionCount: session?.questions?.length || 0
  };
}
