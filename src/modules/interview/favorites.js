export function getCurrentQuestionMessages(session = null, messages = []) {
  if (!session || session.currentIndex < 0) return [];
  const safeMessages = Array.isArray(messages) ? messages : [];
  const startId = session.currentQuestionMessageId;
  let startIndex = startId ? safeMessages.findIndex((message) => message.id === startId) : -1;
  if (startIndex < 0) {
    const marker = `Q${session.currentIndex + 1}/`;
    startIndex = safeMessages.findLastIndex((message) => (
      message.role === "system" && String(message.text || "").startsWith(marker)
    ));
  }
  if (startIndex < 0) return [];

  const nextQuestionIndex = safeMessages.findIndex((message, index) => (
    index > startIndex && message.role === "system" && /^Q\d+\//.test(String(message.text || ""))
  ));
  return safeMessages
    .slice(startIndex, nextQuestionIndex < 0 ? undefined : nextQuestionIndex)
    .filter((message) => !message.thinking)
    .filter((message) => !/本题完成|Question complete|模拟面试结束|Mock interview complete/i.test(String(message.text || "")));
}

export function getInterviewFavoriteSummary(messages = [], problem = {}, options = {}) {
  const language = options.language === "en" ? "en" : "zh";
  const title = language === "zh" ? problem.titleZh || problem.titleEn : problem.titleEn || problem.titleZh;
  const feedback = [...(Array.isArray(messages) ? messages : [])].reverse().find((message) => (
    message.role === "coach"
    && !/本题完成|Question complete|请开始作答|Start your answer|评测中|Evaluating|生成 hint|Generating hint/i.test(String(message.text || ""))
  ));
  const firstLine = String(feedback?.text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  const evaluation = options.parseEvaluation?.(feedback?.text || "") || "";
  return `${title || "Untitled"}：${evaluation || firstLine || "已完成一轮面试复盘。"}`.slice(0, 180);
}

export function formatInterviewConversation(messages = [], options = {}) {
  const language = options.language === "en" ? "en" : "zh";
  const roleLabels = {
    system: language === "zh" ? "题目" : "Prompt",
    user: language === "zh" ? "我" : "Me",
    coach: "Coach"
  };
  return (Array.isArray(messages) ? messages : []).map((message) => {
    const label = roleLabels[message.role] || message.role;
    return `[${label}]\n${String(message.text || message.displayText || "").trim()}`;
  }).join("\n\n");
}

export function buildInterviewFavorite(options = {}) {
  const {
    problem,
    messages = [],
    language = "zh",
    makeId = () => `${Date.now()}-${Math.random()}`,
    normalizeCategory = (value) => value,
    parseEvaluation,
    nowIso = () => new Date().toISOString()
  } = options;
  if (!problem || !Array.isArray(messages) || !messages.length) return null;
  const createdAt = nowIso();
  return {
    id: makeId(),
    problemId: problem.id || "",
    title: language === "zh" ? problem.titleZh || problem.titleEn : problem.titleEn || problem.titleZh,
    category: normalizeCategory(problem.category),
    difficulty: problem.difficulty || "",
    summary: getInterviewFavoriteSummary(messages, problem, { language, parseEvaluation }),
    conversation: formatInterviewConversation(messages, { language }),
    createdAt
  };
}

export function renderInterviewFavorites(summaryNode, listNode, favorites = [], options = {}) {
  if (!listNode) return;
  const safeFavorites = Array.isArray(favorites) ? favorites : [];
  listNode.innerHTML = "";
  if (summaryNode) {
    summaryNode.textContent = safeFavorites.length
      ? `${safeFavorites.length} 条复盘`
      : "保存高价值题目复盘。";
  }
  if (!safeFavorites.length) {
    const empty = document.createElement("small");
    empty.className = "interview-favorite-empty";
    empty.textContent = "完成一题后可以把要点收进这里。";
    listNode.appendChild(empty);
    return;
  }

  safeFavorites.slice().reverse().slice(0, 6).forEach((favorite) => {
    const item = document.createElement("article");
    item.className = "interview-favorite-item";
    const title = document.createElement("strong");
    title.textContent = favorite.title || "Untitled";
    const meta = document.createElement("small");
    meta.textContent = [
      favorite.category ? options.formatCategory?.(favorite.category) || favorite.category : "",
      favorite.createdAt ? options.formatDate?.(favorite.createdAt) || favorite.createdAt : ""
    ].filter(Boolean).join(" · ");
    const summary = document.createElement("p");
    summary.textContent = favorite.summary || "";
    item.append(title, meta, summary);
    listNode.appendChild(item);
  });
}
