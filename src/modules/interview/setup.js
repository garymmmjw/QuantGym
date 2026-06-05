export function renderInterviewCategoryPicker(container, options = {}) {
  if (!container) return;
  const documentRef = options.documentRef || globalThis.document;
  const language = options.language === "en" ? "en" : "zh";
  const selectedCategories = new Set(options.selectedCategories || ["all"]);
  const available = Array.isArray(options.availableCategories) ? options.availableCategories : [];
  const formatCategory = options.formatCategory || ((category) => category || "");

  container.innerHTML = "";
  ["all", ...available].forEach((key) => {
    const button = documentRef.createElement("button");
    const active = key === "all" ? selectedCategories.has("all") : selectedCategories.has(key);
    button.type = "button";
    button.className = `interview-category-chip${active ? " active" : ""}`;
    button.dataset.interviewCategory = key;
    button.setAttribute("aria-pressed", String(active));
    button.textContent = key === "all"
      ? (language === "zh" ? "随机" : "Random")
      : formatCategory(key);
    container.appendChild(button);
  });
}

export function getActiveInterviewLanguage(root = globalThis.document) {
  const active = root?.querySelector?.("[data-interview-lang].active");
  return active?.dataset?.interviewLang === "en" ? "en" : "zh";
}

export function getActiveInterviewMode(root = globalThis.document, modeDefs = {}, fallback = "practice") {
  const active = root?.querySelector?.("[data-interview-mode].active");
  const mode = active?.dataset?.interviewMode;
  return modeDefs[mode] ? mode : fallback;
}

export function syncInterviewLanguageControls(root = globalThis.document, language = "zh") {
  root?.querySelectorAll?.("[data-interview-lang]").forEach((button) => {
    const active = button.dataset.interviewLang === language;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

export function setInterviewToggleGroupActive(root = globalThis.document, selector = "", activeButton = null) {
  root?.querySelectorAll?.(selector).forEach((button) => {
    const active = button === activeButton;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

export function formatInterviewCategorySummary(selectedCategories = [], options = {}) {
  const language = options.language === "en" ? "en" : "zh";
  const formatCategory = options.formatCategory || ((category) => category || "");
  const selected = Array.isArray(selectedCategories) ? selectedCategories : [...selectedCategories || []];
  if (!selected.length || selected.includes("all")) {
    return language === "zh" ? "随机主题" : "Random themes";
  }
  return selected.map(formatCategory).join(language === "zh" ? "、" : ", ");
}

export function renderInterviewSetupVisibility(elements = {}, options = {}) {
  const source = options.source === "pdf" ? "pdf" : "full";
  const language = options.language === "en" ? "en" : "zh";
  const categorySummary = formatInterviewCategorySummary(options.selectedCategories || ["all"], {
    language,
    formatCategory: options.formatCategory
  });

  elements.interviewPdfRow?.classList.toggle("hidden", source !== "pdf");
  elements.interviewCategoryRow?.classList.toggle("hidden", source !== "full");
  if (elements.interviewSummary) {
    const sourceLabel = source === "pdf"
      ? (language === "zh" ? "PDF 题源" : "PDF source")
      : (language === "zh" ? `题库抽题 · ${categorySummary}` : `Question bank · ${categorySummary}`);
    elements.interviewSummary.textContent = language === "zh"
      ? `AI 面试官会通过对话配置 practice / live。${sourceLabel}`
      : `The AI interviewer configures practice / live through chat. ${sourceLabel}`;
  }
}

export function renderInterviewAnswerMode(elements = {}, options = {}) {
  const language = options.language === "en" ? "en" : "zh";
  elements.interviewAnswerFileRow?.classList.remove("hidden");
  elements.voiceAnswerBtn?.classList.remove("hidden");
  if (elements.interviewAnswer) {
    elements.interviewAnswer.placeholder = language === "zh"
      ? "输入你的回答…"
      : "Type your answer…";
    options.autoSizeAnswer?.();
  }
}

export function formatInterviewConfigSummary(config = {}, options = {}) {
  const language = options.language === "en" ? "en" : "zh";
  const focusDefs = options.focusDefs || {};
  const difficultyDefs = options.difficultyDefs || {};
  const personaDefs = options.personaDefs || {};
  const modeDefs = options.modeDefs || {};
  const defaultQuestionCount = Number(options.defaultQuestionCount || 3);
  const focus = focusDefs[config.focusKey] || focusDefs.mixed || {};
  const difficulty = difficultyDefs[config.difficulty] || difficultyDefs.adaptive || {};
  const persona = personaDefs[config.persona] || personaDefs.neutral || {};
  const mode = modeDefs[config.mode] || modeDefs.practice || {};
  const questionCount = Number(config.questionCount || defaultQuestionCount);
  const scope = config.durationMinutes
    ? (language === "zh" ? `${config.durationMinutes} 分钟` : `${config.durationMinutes} minutes`)
    : (language === "zh" ? `${questionCount} 题` : `${questionCount} questions`);
  return language === "zh"
    ? `本场设置：${mode.labelZh || "训练练习"}，方向 ${focus.labelZh || "综合"}，难度 ${difficulty.labelZh || "自适应"}，${scope}，风格 ${persona.labelZh || "中性"}。`
    : `Session setup: ${mode.labelEn || "Practice"}, focus ${focus.labelEn || "Mixed"}, difficulty ${difficulty.labelEn || "Adaptive"}, ${scope}, ${persona.labelEn || "Neutral"} style.`;
}
