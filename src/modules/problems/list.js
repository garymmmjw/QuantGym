import {
  cleanProblemTagValue,
  difficultyClass,
  formatProblemCardPreview
} from "./format.js";

export function addProblemTag(container, label, variant = "") {
  if (!label) return;
  const pill = document.createElement("span");
  pill.className = `problem-tag ${variant}`.trim();
  pill.textContent = label;
  container.appendChild(pill);
}

export function createProblemCard(problem, options = {}) {
  const isEnglish = Boolean(options.isEnglish);
  const t = options.t || ((key) => key);
  const titleText = options.getTitle?.(problem, isEnglish) || "";
  const promptText = options.getPromptText?.(problem, isEnglish) || "";
  const personal = options.getPersonalState?.(problem.id) || {};
  const social = options.getSocial?.(problem.id) || {};
  const lastScore = personal.lastScore;

  const card = document.createElement("article");
  card.className = "problem-card";
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-label", `${t("openProblem")}: ${titleText}`);
  card.addEventListener("click", () => options.openProblem?.(problem.id));
  card.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    options.openProblem?.(problem.id);
  });

  const title = document.createElement("h3");
  title.textContent = titleText;

  const complete = document.createElement("button");
  complete.type = "button";
  complete.className = `problem-complete-button problem-complete-corner${personal.completed ? " active" : ""}`;
  complete.title = personal.completed
    ? (isEnglish ? "Mark unfinished" : "标记为未完成")
    : (isEnglish ? "Mark completed" : "标记完成");
  complete.setAttribute("aria-label", complete.title);
  complete.innerHTML = `<i data-lucide="${personal.completed ? "check-circle-2" : "circle"}"></i>`;
  complete.addEventListener("click", (event) => {
    event.stopPropagation();
    options.toggleCompleted?.(problem.id);
  });

  const meta = document.createElement("div");
  meta.className = "problem-meta";
  if (problem.bookName) addProblemTag(meta, problem.bookName, "source");
  (options.getCompanies?.(problem) || [])
    .slice(0, 2)
    .forEach((company) => addProblemTag(meta, company.name, "company"));
  addProblemTag(meta, options.formatCategory?.(problem.category) || problem.category, "topic");
  addProblemTag(meta, problem.difficulty, `difficulty ${difficultyClass(problem.difficulty)}`);
  (problem.tags || [])
    .filter((tag) => !options.isHiddenTag?.(tag) && cleanProblemTagValue(tag) !== cleanProblemTagValue(problem.bookName))
    .slice(0, 2)
    .forEach((tag) => addProblemTag(meta, options.formatTag?.(tag) || tag, "skill"));
  if (lastScore != null && Number.isFinite(Number(lastScore))) {
    addProblemTag(meta, `${t("lastScore")} ${Math.round(Number(lastScore))}/100`, "score");
  }

  const prompt = document.createElement("div");
  prompt.className = "problem-prompt";
  prompt.textContent = formatProblemCardPreview(promptText);

  const footer = document.createElement("div");
  footer.className = "problem-card-footer";
  const metrics = document.createElement("div");
  metrics.className = "problem-card-metrics";
  metrics.append(
    createProblemMetric("heart", social.likeCount),
    createProblemMetric("message-square", social.commentCount)
  );
  const save = document.createElement("button");
  save.type = "button";
  save.className = `problem-save-button${personal.favorite ? " active" : ""}`;
  save.title = personal.favorite ? t("removeSaved") : t("saveForReview");
  save.setAttribute("aria-label", save.title);
  save.innerHTML = `<i data-lucide="bookmark${personal.favorite ? "-check" : ""}"></i>`;
  save.addEventListener("click", (event) => {
    event.stopPropagation();
    options.toggleSaved?.(problem.id);
  });
  const open = document.createElement("span");
  open.className = "problem-card-open";
  open.innerHTML = `${t("viewFullProblem")} <i data-lucide="chevron-right"></i>`;
  footer.append(metrics, save, open);

  card.append(title, complete, meta, prompt, footer);
  return card;
}

export function getProblemListPage(problems = [], options = {}) {
  const {
    viewMode = "all",
    page = 1,
    pageSize = 24,
    getPersonalState = () => ({})
  } = options;
  const source = Array.isArray(problems) ? problems : [];
  const filtered = viewMode === "saved"
    ? source.filter((problem) => getPersonalState(problem.id)?.favorite)
    : source;
  const safePageSize = Math.max(1, Number(pageSize || 24));
  const totalProblems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalProblems / safePageSize));
  const currentPage = Math.min(Math.max(1, Number(page || 1)), totalPages);
  const pageStart = (currentPage - 1) * safePageSize;
  return {
    problems: filtered,
    visibleProblems: filtered.slice(pageStart, pageStart + safePageSize),
    totalProblems,
    totalPages,
    page: currentPage,
    emptyKind: viewMode === "saved" ? "saved" : "all"
  };
}

export function renderProblemList(container, problems = [], options = {}) {
  if (!container) {
    return getProblemListPage(problems, options);
  }
  container.innerHTML = "";
  const listPage = getProblemListPage(problems, options);
  if (!listPage.totalProblems) {
    const text = getProblemEmptyText({
      emptyKind: listPage.emptyKind,
      isEnglish: options.isEnglish,
      t: options.t
    });
    container.appendChild(options.emptyBlock?.(text) || document.createTextNode(text));
    return listPage;
  }

  listPage.visibleProblems.forEach((problem) => {
    container.appendChild(createProblemCard(problem, options));
  });
  return listPage;
}

export function getProblemEmptyText(options = {}) {
  const {
    emptyKind = "all",
    isEnglish = false,
    t = (key) => key
  } = options;
  if (emptyKind === "saved") {
    return isEnglish
      ? "No saved problems yet. Add any problem to your private review list."
      : "收藏本还没有题目。你可以把任意题目加入自己的复习本。";
  }
  return t("problemEmpty");
}

function createProblemMetric(icon, count) {
  const metric = document.createElement("span");
  metric.className = "problem-card-metric";
  metric.innerHTML = `<i data-lucide="${icon}"></i><span>${Number(count || 0)}</span>`;
  return metric;
}
