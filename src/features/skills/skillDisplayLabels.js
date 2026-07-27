// Display-label helpers for the Playful Precision skills page (skills-zh).
// Chinese-first skill naming: zh main title + English subtitle, mirroring the
// design hierarchy (「概率 / 期望」大字 + Probability/Expectation 小字).
//
// Pure presentation layer — skillDefs `name` in src/skills.js is untouched
// (it is referenced app-wide). Chinese names come from existing mappings only:
// - the stable skill-category labels below (the retired Problems page no
//   longer owns cross-route display copy);
// - skillDefs subtitles for fuller forms where the category label is an
//   abbreviation (线代 → 线性代数);
// - probabilityExpectation follows the design spec exactly (「概率 / 期望」).
const CATEGORY_LABELS_ZH = Object.freeze({
  mentalMath: "速算",
  probabilityExpectation: "概率期望",
  calculus: "微积分",
  statistics: "统计",
  complexNumbers: "复数",
  linearAlgebra: "线代",
  algebra: "代数",
  optimization: "优化",
  machineLearning: "机器学习",
  deepLearning: "深度学习",
  market: "市场",
  option: "期权",
  leetcode: "编程",
  coding: "编程",
  cppProgramming: "C++ 编程",
  pandasNumpy: "Pandas/NumPy"
});

const localizeCategoryLabel = (value) => {
  const raw = String(value || "").trim();
  return CATEGORY_LABELS_ZH[raw] || raw;
};

// Proper nouns keep the original name as the primary title
// (user decision: LeetCode / Mental Math / C++ / Pandas·NumPy 保持原文为主).
const KEEP_ORIGINAL_PRIMARY = new Set([
  "leetcode",
  "cppProgramming",
  "pandasNumpy",
  "mentalMath"
]);

const SKILL_TITLE_ZH = {
  probabilityExpectation: "概率 / 期望",
  statistics: "统计",
  calculus: "微积分",
  algebra: "代数",
  linearAlgebra: "线性代数",
  optimization: "优化",
  complexNumbers: "复数",
  machineLearning: "机器学习",
  deepLearning: "深度学习",
  market: "市场",
  option: "期权"
};

// Compact labels for the radar axes (the design draws the short zh name per
// axis via `s.name.split(' ')[0]`; proper nouns stay in original text).
const SKILL_RADAR_LABEL_ZH = {
  leetcode: "LeetCode",
  cppProgramming: "C++",
  pandasNumpy: "Pandas",
  probabilityExpectation: "概率期望",
  statistics: "统计",
  calculus: "微积分",
  algebra: "代数",
  linearAlgebra: "线代",
  optimization: "优化",
  complexNumbers: "复数",
  machineLearning: "机器学习",
  deepLearning: "深度学习",
  market: "市场",
  option: "期权",
  mentalMath: "速算"
};

// {title, sub} pair for a skill row/card. zh-named skills flip to zh title +
// English name subtitle; proper-noun skills keep the original name as primary
// with the existing zh descriptor below. `isEnglish` restores the original
// arrangement (full en strings land with the i18n pass).
export function getSkillDisplayPair(key, def, isEnglish = false) {
  const name = String(def?.name || "").trim();
  const subtitle = String(def?.subtitle || "").trim();
  const titleZh = SKILL_TITLE_ZH[key];
  if (isEnglish || KEEP_ORIGINAL_PRIMARY.has(key) || !titleZh) {
    return { title: name || key, sub: subtitle };
  }
  return { title: titleZh, sub: name };
}

// Primary display name (radar tooltip / coach banner / weakest-skill stat).
export function getSkillDisplayName(key, def, isEnglish = false) {
  return getSkillDisplayPair(key, def, isEnglish).title;
}

// Compact axis label for the radar canvas.
export function getSkillRadarLabel(key, def) {
  return SKILL_RADAR_LABEL_ZH[key] || String(def?.short || key);
}

// zh problems-page category name for the coach banner's「题目 → X」path,
// so the reference matches the actual category labels on the problems page.
export function getSkillPracticeCategoryZh(key, def) {
  const label = localizeCategoryLabel(key);
  if (label && label !== key) return label;
  return String(def?.subtitle || "");
}
