import { clampNumber } from '../../lib/number.js';
import { escapeHtml } from '../../lib/text.js';

export function renderInterviewQuestionPanel(container, options = {}) {
  if (!container) return;
  const session = options.session || null;
  const language = options.language === "en" ? "en" : "zh";
  const useZh = language === "zh";
  const live = Boolean(options.live);
  const expandedIndex = Number.isFinite(Number(options.expandedIndex)) ? Number(options.expandedIndex) : 0;
  const formatCategory = options.formatCategory || ((category) => category || "");

  container.innerHTML = "";

  if (!session?.questions?.length) {
    const empty = document.createElement("div");
    empty.className = "interview-question-panel-empty";
    empty.textContent = useZh
      ? "完成 AI 配置后，这里会显示本轮进度。"
      : "After AI setup, this panel shows session progress.";
    container.appendChild(empty);
    return;
  }

  const heading = document.createElement("div");
  heading.className = "interview-question-panel-head";
  const title = document.createElement("strong");
  title.textContent = live
    ? (useZh ? "真实面试进度" : "Live progress")
    : (useZh ? "训练面板" : "Practice panel");
  const progress = document.createElement("span");
  progress.textContent = `${Math.max(0, session.currentIndex + 1)} / ${session.questions.length}`;
  heading.append(title, progress);
  container.appendChild(heading);
  container.appendChild(createInterviewPanelStats({
    session,
    live,
    language,
    focusDefs: options.focusDefs || {}
  }));

  const list = document.createElement("div");
  list.className = "interview-question-accordion";
  session.questions.forEach((problem, index) => {
    const result = session.questionResults?.[index] || null;
    const expanded = index === expandedIndex;
    const current = index === session.currentIndex;
    const titleText = useZh ? problem.titleZh || problem.titleEn : problem.titleEn || problem.titleZh;
    const promptText = useZh ? problem.promptZh || problem.promptEn : problem.promptEn || problem.promptZh;

    const item = document.createElement("article");
    item.tabIndex = 0;
    item.setAttribute("role", "button");
    item.className = [
      "interview-question-item",
      expanded ? "is-expanded" : "",
      current ? "is-current" : "",
      result?.score != null && !live ? "is-scored" : "",
      result?.status === "wrapped" ? "is-wrapped" : ""
    ].filter(Boolean).join(" ");
    item.dataset.interviewQuestionIndex = String(index);
    item.setAttribute("aria-expanded", String(expanded));

    const main = document.createElement("span");
    main.className = "interview-question-main";
    const label = document.createElement("strong");
    label.textContent = `Q${index + 1}. ${titleText || (useZh ? "未命名题目" : "Untitled question")}`;
    const meta = document.createElement("small");
    meta.textContent = [formatCategory(problem.category), problem.difficulty || ""].filter(Boolean).join(" · ");
    main.append(label, meta);

    const score = document.createElement("span");
    score.className = "interview-question-score";
    if (live) {
      score.classList.add("is-live-state");
      score.textContent = current ? (useZh ? "当前" : "Now") : result ? (useZh ? "完成" : "Done") : "--";
    } else {
      score.textContent = result?.score == null ? "--" : `${Math.round(result.score)}`;
      if (result?.score != null) score.dataset.targetScore = String(Math.round(result.score));
    }

    item.append(main, score);

    const detail = document.createElement("div");
    detail.className = "interview-question-detail";
    const prompt = document.createElement("p");
    prompt.textContent = promptText || (useZh ? "暂无题干。" : "No prompt.");
    detail.appendChild(prompt);
    if (result?.evaluation) {
      const evaluation = document.createElement("small");
      if (options.appendInlineRichText) {
        options.appendInlineRichText(evaluation, result.evaluation);
      } else {
        evaluation.textContent = result.evaluation;
      }
      detail.appendChild(evaluation);
    }
    if (!live && result?.dimensions) {
      detail.appendChild(createInterviewDimensionMiniBars(result.dimensions, { language }));
    }
    item.appendChild(detail);

    const toggle = () => {
      options.onExpandedChange?.(expanded ? -1 : index);
    };
    item.addEventListener("click", toggle);
    item.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      toggle();
    });
    list.appendChild(item);
  });
  container.appendChild(list);
  options.scheduleMathTypeset?.(container);
  options.refreshIcons?.();
}

export function getInterviewPanelStatsItems(options = {}) {
  const session = options.session || null;
  const language = options.language === "en" ? "en" : "zh";
  const useZh = language === "zh";
  const results = session?.questionResults || [];
  const completed = results.filter(Boolean).length;
  const scored = results.filter((item) => Number.isFinite(Number(item?.score)));
  const average = scored.length
    ? Math.round(scored.reduce((sum, item) => sum + Number(item.score || 0), 0) / scored.length)
    : null;
  const focus = options.focusDefs?.[session?.sessionConfig?.focusKey || "mixed"];
  return (options.live
    ? [
      [useZh ? "模式" : "Mode", useZh ? "真实面试" : "Live"],
      [useZh ? "进度" : "Progress", `${completed}/${session?.questions?.length || 0}`],
      [useZh ? "方向" : "Focus", useZh ? focus?.labelZh || "混合" : focus?.labelEn || "Mixed"]
    ]
    : [
      [useZh ? "平均分" : "Average", average == null ? "--" : `${average}`],
      [useZh ? "已完成" : "Done", `${completed}/${session?.questions?.length || 0}`],
      [useZh ? "方向" : "Focus", useZh ? focus?.labelZh || "混合" : focus?.labelEn || "Mixed"]
    ]).map(([label, value]) => ({ label, value }));
}

export function createInterviewPanelStats(options = {}) {
  const stats = document.createElement("div");
  stats.className = "interview-panel-stats";
  getInterviewPanelStatsItems(options).forEach(({ label, value }) => {
    const item = document.createElement("span");
    item.innerHTML = `<small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong>`;
    stats.appendChild(item);
  });
  return stats;
}

export function getInterviewDimensionBarItems(dimensions = {}, options = {}) {
  const useZh = options.language !== "en";
  const labels = {
    correctness: useZh ? "正确" : "Correct",
    reasoning: useZh ? "推理" : "Reasoning",
    communication: useZh ? "表达" : "Comms"
  };
  return Object.entries(labels).map(([key, label]) => ({
    key,
    label,
    score: Math.round(clampNumber(dimensions?.[key]?.score ?? 0, 0, 5))
  }));
}

export function createInterviewDimensionMiniBars(dimensions = {}, options = {}) {
  const useZh = options.language !== "en";
  const labels = {
    correctness: useZh ? "正确" : "Correct",
    reasoning: useZh ? "推理" : "Reasoning",
    communication: useZh ? "表达" : "Comms"
  };
  const wrap = document.createElement("div");
  wrap.className = "interview-dimension-bars";
  Object.entries(labels).forEach(([key, label]) => {
    const score = Math.round(clampNumber(dimensions?.[key]?.score ?? 0, 0, 5));
    const row = document.createElement("span");
    row.innerHTML = `<b>${escapeHtml(label)}</b><i style="--score:${score / 5}"></i><em>${score}/5</em>`;
    wrap.appendChild(row);
  });
  return wrap;
}

export function animateInterviewScores(root) {
  root?.querySelectorAll("[data-target-score]").forEach((node) => {
    if (node.dataset.animatedScore === node.dataset.targetScore) return;
    const target = Math.round(clampNumber(node.dataset.targetScore, 0, 100));
    node.dataset.animatedScore = String(target);
    const start = performance.now();
    const duration = 850;
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      node.textContent = String(Math.round(target * eased));
      if (progress < 1) window.requestAnimationFrame(tick);
      else node.textContent = String(target);
    };
    node.textContent = "0";
    window.requestAnimationFrame(tick);
  });
}
