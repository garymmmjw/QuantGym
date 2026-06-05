export function getProblemPopularityScore(social = {}) {
  return Number(social.likeCount || 0) * 3 + Number(social.commentCount || 0) * 2;
}

export function compareProblemsByPopularity(left, right, options = {}) {
  const getSocial = options.getSocial || (() => ({}));
  const getTitle = options.getTitle || ((problem) => problem?.titleEn || problem?.titleZh || "");
  const leftSocial = getSocial(left.id);
  const rightSocial = getSocial(right.id);
  const socialDiff = getProblemPopularityScore(rightSocial) - getProblemPopularityScore(leftSocial);
  if (socialDiff) return socialDiff;
  const likeDiff = Number(rightSocial.likeCount || 0) - Number(leftSocial.likeCount || 0);
  if (likeDiff) return likeDiff;
  return getTitle(left).localeCompare(getTitle(right), options.locale || "en");
}

export function renderProblemRanking(options = {}) {
  const container = options.container;
  if (!container) return;
  const getSocial = options.getSocial || (() => ({}));
  const getTitle = options.getTitle || ((problem) => problem?.titleEn || problem?.titleZh || "");
  const formatCategory = options.formatCategory || ((category) => category || "");
  const t = options.t || ((key) => key);

  container.innerHTML = "";
  const ranked = [...(options.problems || [])]
    .sort((left, right) => compareProblemsByPopularity(left, right, {
      getSocial,
      getTitle,
      locale: options.locale
    }))
    .slice(0, options.limit || 50);

  if (!ranked.length) {
    container.appendChild(options.emptyBlock?.(t("problemEmpty")) || document.createTextNode(t("problemEmpty")));
    return;
  }

  ranked.forEach((problem, index) => {
    const social = getSocial(problem.id);
    const row = document.createElement("button");
    row.type = "button";
    row.className = "problem-ranking-row";
    row.addEventListener("click", () => options.openProblem?.(problem.id));

    const rank = document.createElement("strong");
    rank.className = "problem-ranking-position";
    rank.textContent = String(index + 1).padStart(2, "0");

    const copy = document.createElement("span");
    copy.className = "problem-ranking-copy";
    copy.innerHTML = "<strong></strong><small></small>";
    copy.querySelector("strong").textContent = getTitle(problem);
    copy.querySelector("small").textContent = `${formatCategory(problem.category)} · ${problem.difficulty}`;

    const stats = document.createElement("span");
    stats.className = "problem-ranking-stats";
    stats.innerHTML = `<strong>${getProblemPopularityScore(social)}</strong><small>${t("popularity")}</small><span><i data-lucide="heart"></i> ${Number(social.likeCount || 0)}</span><span><i data-lucide="message-square"></i> ${Number(social.commentCount || 0)}</span>`;
    row.append(rank, copy, stats);
    container.appendChild(row);
  });
}
