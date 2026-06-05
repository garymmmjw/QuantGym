import { escapeHtml } from "../../lib/text.js";
import { cleanProblemTagValue, getLocalizedProblemField } from "./format.js";

export function createProblemDetailNavigationView(options = {}) {
  const navigation = options.navigation || {};
  const isEnglish = Boolean(options.isEnglish);
  const group = document.createElement("div");
  group.className = "problem-detail-navigation";

  const makeButton = (direction, target, label, icon) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "secondary-button compact problem-detail-nav-button";
    button.disabled = !target;
    button.innerHTML = `<i data-lucide="${icon}"></i>${escapeHtml(label)}`;
    button.addEventListener("click", () => {
      if (!target) return;
      options.openProblemDetail?.(target.id);
    });
    button.setAttribute("aria-label", label);
    button.dataset.problemDetailNav = direction;
    return button;
  };

  const position = document.createElement("span");
  position.className = "problem-detail-position";
  position.textContent = navigation.index >= 0 && navigation.total
    ? `${navigation.index + 1} / ${navigation.total}`
    : "";

  group.append(
    makeButton("previous", navigation.previous, isEnglish ? "Previous" : "上一题", "chevron-left"),
    position,
    makeButton("next", navigation.next, isEnglish ? "Next" : "下一题", "chevron-right")
  );
  return group;
}

export function renderProblemDetailView(options = {}) {
  const container = options.container;
  const problem = options.problem;
  if (!container || !problem) return;
  const isEnglish = Boolean(options.isEnglish);
  const t = options.t || ((key) => key);
  const renderRichText = options.renderRichText || ((node, text) => {
    node.textContent = text;
  });

  container.innerHTML = "";

  const top = document.createElement("div");
  top.className = "problem-detail-top";

  const back = document.createElement("button");
  back.className = "secondary-button";
  back.type = "button";
  back.innerHTML = `<i data-lucide="arrow-left"></i> ${t("backToProblems")}`;
  back.addEventListener("click", () => options.returnToList?.());

  const practice = document.createElement("button");
  practice.className = "primary-button";
  practice.type = "button";
  practice.innerHTML = `<i data-lucide="messages-square"></i> ${t("useForMock")}`;
  practice.addEventListener("click", () => options.selectForInterview?.(problem.id));

  const personal = options.getPersonalState?.(problem.id) || {};
  const complete = document.createElement("button");
  complete.className = `secondary-button problem-detail-complete${personal.completed ? " active" : ""}`;
  complete.type = "button";
  complete.innerHTML = `<i data-lucide="${personal.completed ? "check-circle-2" : "circle"}"></i> ${personal.completed ? (isEnglish ? "Completed" : "已完成") : (isEnglish ? "Mark completed" : "标记完成")}`;
  complete.addEventListener("click", () => options.toggleCompleted?.(problem.id));

  const save = document.createElement("button");
  save.className = `secondary-button problem-detail-save${personal.favorite ? " active" : ""}`;
  save.type = "button";
  save.innerHTML = `<i data-lucide="bookmark${personal.favorite ? "-check" : ""}"></i> ${personal.favorite ? t("savedForReview") : t("saveForReview")}`;
  save.addEventListener("click", () => options.toggleSaved?.(problem.id));

  const actions = document.createElement("div");
  actions.className = "problem-detail-actions";
  actions.append(complete, save, practice);
  top.append(back, options.createNavigation?.(problem) || document.createElement("span"), actions);

  const title = document.createElement("h2");
  const titleZh = String(problem.titleZh || "").trim();
  const titleEn = String(problem.titleEn || "").trim();
  title.textContent = isEnglish
    ? options.getDisplayTitle?.(problem, true) || titleEn || titleZh
    : titleZh && titleEn && cleanProblemTagValue(titleZh) !== cleanProblemTagValue(titleEn)
      ? `${titleZh} / ${titleEn}`
      : titleZh || titleEn;

  const meta = document.createElement("div");
  meta.className = "problem-meta";
  [
    options.formatCategory?.(problem.category) || problem.category,
    problem.difficulty,
    ...(problem.tags || []).slice(0, 5)
  ].forEach((label) => {
    if (!label) return;
    const pill = document.createElement("span");
    pill.className = "pill";
    pill.textContent = options.formatTag?.(label) || label;
    meta.appendChild(pill);
  });

  const questionContent = [
    (isEnglish ? problem.promptEn || problem.promptZh : problem.promptZh || problem.promptEn) || t("noPrompt"),
    options.getMediaMarkdown?.(problem, "prompt")
  ].filter(Boolean).join("\n\n");
  const hintContent = getLocalizedProblemField(problem, "hint", isEnglish) || t("noHint");
  const answerParts = [
    getLocalizedProblemField(problem, "answer", isEnglish),
    getLocalizedProblemField(problem, "explanation", isEnglish),
    options.getMediaMarkdown?.(problem, "answer")
  ].filter(Boolean);
  const answerContent = answerParts.length ? answerParts.join("\n\n") : t("noAnswer");

  container.append(
    top,
    title,
    meta,
    createProblemDetailBlock(t("problemQuestion"), questionContent, { renderRichText, t }),
    createProblemDetailBlock(t("problemHint"), hintContent, {
      renderRichText,
      t,
      locked: true,
      revealed: options.isBlockRevealed?.(problem.id, "hint"),
      lockedTitle: t("problemHintLocked"),
      revealLabel: t("problemRevealHint"),
      onReveal: () => options.revealBlock?.(problem.id, "hint")
    }),
    createProblemDetailBlock(t("problemAnswer"), answerContent, {
      renderRichText,
      t,
      locked: true,
      revealed: options.isBlockRevealed?.(problem.id, "answer"),
      lockedTitle: t("problemAnswerLocked"),
      revealLabel: t("problemRevealAnswer"),
      onReveal: () => options.revealBlock?.(problem.id, "answer")
    }),
    createProblemSocialPanel(problem, options)
  );

  options.scheduleMathTypeset?.(container);
  options.refreshIcons?.();
}

function createProblemDetailBlock(title, content, options = {}) {
  const block = document.createElement("section");
  const isLocked = Boolean(options.locked && !options.revealed);
  const t = options.t || ((key) => key);
  block.className = `problem-detail-block${isLocked ? " is-locked" : options.locked ? " is-unlocked" : ""}`;
  const heading = document.createElement("h3");
  heading.textContent = title;
  const body = document.createElement("div");
  body.className = "problem-detail-body";
  if (isLocked) body.setAttribute("aria-hidden", "true");
  options.renderRichText?.(body, content);
  block.append(heading, body);
  if (isLocked) {
    const overlay = document.createElement("div");
    overlay.className = "problem-lock-overlay";
    overlay.innerHTML = `
      <span class="problem-lock-icon" aria-hidden="true"><i data-lucide="lock"></i></span>
      <strong>${escapeHtml(options.lockedTitle || t("problemContentLocked"))}</strong>
      <small>${escapeHtml(t("problemLockedHint"))}</small>
      <button class="secondary-button compact" type="button">
        <i data-lucide="eye"></i>${escapeHtml(options.revealLabel || t("problemRevealContent"))}
      </button>
    `;
    overlay.querySelector("button")?.addEventListener("click", () => {
      options.onReveal?.();
      block.classList.remove("is-locked");
      block.classList.add("is-unlocked");
      body.removeAttribute("aria-hidden");
    });
    block.appendChild(overlay);
  }
  return block;
}

function createProblemSocialPanel(problem, options = {}) {
  const t = options.t || ((key) => key);
  const social = options.getSocial?.(problem.id) || { comments: [], likeCount: 0, liked: false };
  const panel = document.createElement("section");
  panel.className = "problem-social-panel";

  const header = document.createElement("div");
  header.className = "problem-social-header";
  const heading = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = t("problemDiscussion");
  const hint = document.createElement("p");
  hint.textContent = t("problemDiscussionHint");
  heading.append(title, hint);

  const like = document.createElement("button");
  like.type = "button";
  like.className = `problem-like-button${social.liked ? " active" : ""}`;
  like.innerHTML = `<i data-lucide="heart"></i><span>${social.liked ? t("unlike") : t("like")}</span><strong>${social.likeCount}</strong>`;
  like.addEventListener("click", () => options.toggleLike?.(problem.id));
  header.append(heading, like);

  const notice = document.createElement("p");
  notice.className = `problem-social-notice${options.socialNotice ? "" : " hidden"}`;
  notice.textContent = options.socialNotice || "";

  const comments = document.createElement("div");
  comments.className = "problem-comments";
  if (!social.comments.length) {
    comments.appendChild(options.emptyBlock?.(t("problemCommentEmpty")) || document.createTextNode(t("problemCommentEmpty")));
  } else {
    social.comments.forEach((comment) => {
      comments.appendChild(createProblemComment(problem.id, comment, options));
    });
  }

  const form = document.createElement("form");
  form.className = "problem-comment-form";
  const input = document.createElement("textarea");
  input.rows = 3;
  input.maxLength = 1200;
  input.placeholder = t("problemCommentPlaceholder");
  const submit = document.createElement("button");
  submit.type = "submit";
  submit.className = "primary-button";
  submit.innerHTML = `<i data-lucide="send"></i> ${t("problemCommentPost")}`;
  form.append(input, submit);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    options.postComment?.(problem.id, input.value);
  });

  panel.append(header, notice, comments, form);
  return panel;
}

function createProblemComment(problemId, comment, options = {}) {
  const t = options.t || ((key) => key);
  const card = document.createElement("article");
  card.className = "problem-comment";
  const top = document.createElement("div");
  const author = document.createElement("strong");
  author.textContent = comment.author || "Quant";
  const time = document.createElement("time");
  time.textContent = options.formatDate?.(comment.createdAt) || "";
  top.append(author, time);
  if (comment.isOwn) {
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "problem-comment-delete";
    remove.title = t("deleteComment");
    remove.setAttribute("aria-label", remove.title);
    remove.innerHTML = '<i data-lucide="trash-2"></i>';
    remove.addEventListener("click", () => options.deleteComment?.(problemId, comment.id));
    top.append(remove);
  }
  const text = document.createElement("p");
  text.textContent = comment.text;
  card.append(top, text);
  return card;
}
