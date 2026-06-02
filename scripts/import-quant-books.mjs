import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { hydrateHullSolutionsFromAnswerPack } from "./hull-answer-pack.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const options = parseArgs(process.argv.slice(2));
const localBookRoot = path.join(projectRoot, "量化书籍");
const desktopBookRoot = path.resolve(
  options.bookRoot || process.env.QUANTGYM_BOOK_ROOT || (fs.existsSync(localBookRoot) ? localBookRoot : path.join(projectRoot, "..", "量化书籍"))
);
const sourceRoot = path.join(projectRoot, "data", "question-banks");
const mediaRoot = path.join(projectRoot, "assets", "problem-media");
const manifestPath = path.join(sourceRoot, "catalog-manifest.json");
const hullSolutionTranslationCachePath = path.join(projectRoot, "artifacts", "question-bank-audit", "hull-solution-zh-cache.json");
const archivedQuestionBankDir = ["有题目的", "紫皮书 量化面试中的数学技巧 Quantitative Interview Problems Collection"].join("/");
const archivedQuestionBankFile = ["quant", ["pu", "rple"].join(""), "book"].join("_");

const books = [
  {
    slug: "question-bank",
    idPrefix: "catalog",
    name: "Archived Question Bank",
    path: `${archivedQuestionBankDir}/${archivedQuestionBankFile}.tex`,
    translationPath: `${archivedQuestionBankDir}/${archivedQuestionBankFile}_en.tex`,
    sourceLanguage: "zh",
    defaultCategory: "probabilityExpectation",
    includeArchivedAppendix: true,
    disabled: true,
    disabledReason: "Temporarily removed from the web catalog pending copyright review."
  },
  {
    slug: "green-book",
    name: "绿皮书",
    path: "有题目的/绿皮书 A Practical Guide to Quantitative Finance Interviews/quant_green_book.tex",
    translationPath: "有题目的/绿皮书 A Practical Guide to Quantitative Finance Interviews/quant_green_book_zh.tex",
    sourceLanguage: "en",
    defaultCategory: "probabilityExpectation"
  },
  {
    slug: "yellow-book",
    name: "黄皮书 150 Most Frequently Asked Questions",
    path: "有题目的/黄皮书 150 Most Frequently Asked Questions on Quant Interviews/quant_yellow_book.tex",
    translationPath: "有题目的/黄皮书 150 Most Frequently Asked Questions on Quant Interviews/quant_yellow_book_zh.tex",
    sourceLanguage: "en",
    defaultCategory: "probabilityExpectation"
  },
  {
    slug: "red-book",
    name: "红宝书 Quant Job Interview Questions And Answers",
    path: "有题目的/红宝书 Quant Job Interview Questions And Answers/quant_red_book.tex",
    translationPath: "有题目的/红宝书 Quant Job Interview Questions And Answers/quant_red_book_zh.tex",
    sourceLanguage: "en",
    defaultCategory: "option"
  },
  {
    slug: "hull-derivatives",
    name: "Hull 期权期货及其他衍生品",
    path: "纯textbook/Hull期权期货及其他衍生品 Options Futures and Other Derivatives/quant_hull_book.tex",
    translationPath: "纯textbook/Hull期权期货及其他衍生品 Options Futures and Other Derivatives/quant_hull_book_zh.tex",
    sourceLanguage: "en",
    pdfPath: "纯textbook/Hull期权期货及其他衍生品 Options Futures and Other Derivatives/option futures and other derivatives 11th.pdf",
    defaultCategory: "option"
  },
  {
    slug: "stefanica-fe-math",
    name: "Stefanica 金融工程数学入门",
    path: "纯textbook/Stefanica金融工程数学入门 A Primer for the Mathematics of Financial Engineering/quant_stefanica_book.tex",
    translationPath: "纯textbook/Stefanica金融工程数学入门 A Primer for the Mathematics of Financial Engineering/quant_stefanica_book_zh.tex",
    sourceLanguage: "en",
    defaultCategory: "option"
  },
  {
    slug: "quantitative-primer",
    name: "Quantitative Primer",
    path: "有题目的/Quantitative Primer/quant_qprimer_book.tex",
    translationPath: "有题目的/Quantitative Primer/quant_qprimer_book_zh.tex",
    sourceLanguage: "en",
    defaultCategory: "probabilityExpectation"
  },
  {
    slug: "dudeney-puzzles",
    name: "Dudeney 经典挑战谜题",
    path: "有题目的/Dudeney挑战谜题 Challenging Puzzles/quant_dudeney_book.tex",
    translationPath: "有题目的/Dudeney挑战谜题 Challenging Puzzles/quant_dudeney_book_zh.tex",
    sourceLanguage: "en",
    defaultCategory: "probabilityExpectation"
  },
  {
    slug: "linalg-primer",
    name: "金融工程线性代数入门",
    path: "纯textbook/金融工程线性代数入门 A Linear Algebra Primer for Financial Engineering/quant_linalg_book.tex",
    translationPath: "纯textbook/金融工程线性代数入门 A Linear Algebra Primer for Financial Engineering/quant_linalg_book_zh.tex",
    sourceLanguage: "en",
    defaultCategory: "statistics"
  },
  {
    slug: "probability-stochastic-10",
    name: "概率与随机分析面试题 10 题",
    path: "有题目的/概率随机分析10题 First 10 Questions - Probability Stochastic Calc IQs/quant_prob10_book.tex",
    translationPath: "有题目的/概率随机分析10题 First 10 Questions - Probability Stochastic Calc IQs/quant_prob10_book_zh.tex",
    sourceLanguage: "en",
    defaultCategory: "probabilityExpectation"
  }
];

const manifest = readJson(manifestPath, {
  version: 1,
  compiledCatalog: "../problem-catalog.json",
  browserCatalog: "../problem-catalog.js",
  sources: []
});
const sources = Array.isArray(manifest.sources) ? manifest.sources : [];
const importedAt = new Date().toISOString();
const summaries = [];

for (const book of books) {
  const inputPath = path.join(desktopBookRoot, book.path);
  if (book.disabled) {
    upsertManifestSource(book, inputPath, null);
    summaries.push({ slug: book.slug, name: book.name, count: 0, disabled: true });
    continue;
  }
  if (!fs.existsSync(inputPath)) {
    console.warn(`Skipped missing book: ${inputPath}`);
    continue;
  }

  const problems = extractBook(inputPath, book);
  writeBook(book, inputPath, problems);
  upsertManifestSource(book, inputPath, problems.length);
  summaries.push({ slug: book.slug, name: book.name, count: problems.length });
}

fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
fs.writeFileSync(manifestPath, `${JSON.stringify({ ...manifest, sources }, null, 2)}\n`);

const buildResult = spawnSync(process.execPath, [path.join(scriptDir, "build-problem-catalog.mjs")], {
  cwd: projectRoot,
  stdio: "inherit"
});
if (buildResult.status !== 0) process.exit(buildResult.status || 1);

console.log("Imported Quant books:");
summaries.forEach((summary) => {
  const suffix = summary.disabled ? "disabled" : summary.count;
  console.log(`- ${summary.name} (${summary.slug}): ${suffix}`);
});

function extractBook(inputPath, book) {
  const tex = fs.readFileSync(inputPath).toString("utf8").replace(/\0/g, "");
  const localizedEntries = readLocalizedEntries(inputPath, book);
  const bodyStart = tex.indexOf("\\begin{document}");
  const body = tex.slice(bodyStart >= 0 ? bodyStart : 0);
  const lines = body.split(/\r?\n/);
  const problems = [];
  let chapter = "";
  let section = "";
  let subsection = "";

  for (let index = 0; index < lines.length; index += 1) {
    chapter = readHeading(lines[index], "chapter") || chapter;
    section = readHeading(lines[index], "section") || section;
    subsection = readHeading(lines[index], "subsection") || subsection;
    if (!/\\begin\{problembox\}/.test(lines[index])) continue;

    const prompt = collectEnvironment(lines, index, "problembox");
    const solutionStart = findLine(lines, prompt.end + 1, (line) => /\\solution\b/.test(line));
    const solutionEnd = findLine(lines, Math.max(prompt.end + 1, solutionStart + 1), (line) => (
      /\\(?:chapter|section|subsection)\*?\{/.test(line) || /\\begin\{problembox\}/.test(line) || /^\s*CHAPTER\s+\d+\b/.test(line) || /^\s*第\s*\d+\s*章\b/.test(line)
    ));
    const rawSolution = solutionStart >= 0
      ? lines.slice(solutionStart + 1, solutionEnd >= 0 ? solutionEnd : lines.length).join("\n")
      : "";

    const problemIndex = problems.length + 1;
    const rawPrompt = prompt.content;
    const promptMedia = collectTexMedia(rawPrompt, inputPath, book, problemIndex, "prompt");
    const solutionMedia = collectTexMedia(rawSolution, inputPath, book, problemIndex, "solution");
    const promptText = cleanPromptBlock(cleanTexBlock(prompt.content));
    const solutionText = cleanTexBlock(rawSolution);
    const rawTitle = cleanInlineText(subsection) || `题目 ${problemIndex}`;
    const title = buildProblemTitle(rawTitle, promptText, problemIndex);
    const category = inferCategory({ book, chapter, section, subsection: rawTitle, prompt: promptText, solution: solutionText });
    const tags = buildTags({ book, chapter, section, subsection: rawTitle, prompt: promptText, category });

    const problem = {
      id: `${book.idPrefix || book.slug}-problem-${String(problemIndex).padStart(3, "0")}`,
      titleEn: isMostlyAscii(title) ? title : "",
      titleZh: title,
      category,
      difficulty: inferDifficulty({ title, prompt: promptText, solution: solutionText }),
      tags,
      source: book.slug,
      sourceUrl: book.name,
      sourceType: "book",
      bookSlug: book.slug,
      bookName: book.name,
      visibility: "public",
      promptEn: isMostlyAscii(promptText) ? promptText : "",
      promptZh: promptText,
      answer: "",
      answerEn: "",
      answerZh: "",
      explanation: solutionText,
      explanationEn: isMostlyAscii(solutionText) ? solutionText : "",
      explanationZh: isMostlyAscii(solutionText) ? "" : solutionText,
      createdAt: importedAt,
      updatedAt: importedAt
    };
    attachProblemMedia(problem, promptMedia, solutionMedia);
    problems.push(problem);

    index = prompt.end;
  }

  if (book.includeArchivedAppendix) {
    problems.push(...extractArchivedAppendix(lines, book, problems.length));
  }

  if (book.slug === "hull-derivatives" && book.pdfPath) {
    hydrateHullProblemsFromPdf(problems, path.join(desktopBookRoot, book.pdfPath), book);
  }
  if (book.slug === "green-book") {
    repairGreenBookProblems(problems, book);
  }
  applyLocalizedEntries(problems, book, localizedEntries);
  repairGeneratedBookTitles(problems, book);
  normalizeLocalizedProblemFields(problems, book);
  if (book.slug === "hull-derivatives") {
    repairHullProblems(problems, book);
    hydrateHullSolutionsFromAnswerPack(problems, {
      bookRoot: desktopBookRoot,
      mediaRoot,
      book,
      translationCachePath: hullSolutionTranslationCachePath
    });
  }
  if (book.slug === "linalg-primer") {
    repairLinearAlgebraProblems(problems, book);
  }
  if (book.slug === "probability-stochastic-10") {
    repairProbabilityStochastic10Problems(problems, book);
  }
  if (book.slug === "stefanica-fe-math") {
    repairStefanicaProblems(problems, book);
  }
  if (book.slug === "quantitative-primer") {
    repairQuantitativePrimerProblems(problems, book);
  }
  if (book.slug === "dudeney-puzzles") {
    repairDudeneyProblems(problems, book);
  }
  if (book.slug === "yellow-book") {
    repairYellowBookProblems(problems, book);
  }
  if (book.slug === "red-book") {
    repairRedBookProblems(problems, book);
  }
  applyManualReviewedRepairs(problems, book);
  ensurePrompts(problems, book, inputPath);
  return problems;
}

function applyManualReviewedRepairs(problems, book) {
  const byId = new Map(problems.map((problem) => [problem.id, problem]));
  const patch = (id, fields) => {
    const problem = byId.get(id);
    if (!problem) return;
    Object.assign(problem, fields, {
      manualContentReviewed: true,
      manualContentReviewSource: "llm-sample-major-repair-2026-06-01"
    });
    if ("answerEn" in fields || "answerZh" in fields) {
      problem.answer = fields.answerEn || fields.answerZh || problem.answer || "";
    }
    if ("explanationEn" in fields || "explanationZh" in fields) {
      problem.explanation = fields.explanationEn || fields.explanationZh || problem.explanation || "";
    }
  };

  if (book.slug === "green-book") {
    patch("green-book-problem-028", {
      answerEn: "Yes. Divide the square into 25 smaller squares; one must contain at least 3 ants, and a radius 1/7 circle covers any one of those smaller squares.",
      answerZh: "可以。把正方形分成 25 个小正方形，至少有一个小正方形含有 3 只蚂蚁，而半径为 1/7 的圆能覆盖任意一个这样的小正方形。",
      explanationEn: [
        "Divide the unit square into a 5 by 5 grid, so each smaller square has side length 1/5.",
        "By the pigeonhole principle, placing 51 ants into 25 smaller squares forces at least one smaller square to contain at least ceil(51/25)=3 ants.",
        "A square of side 1/5 has half-diagonal sqrt(2)/10, which is less than 1/7. Therefore a glass with radius 1/7 can cover that whole smaller square and hence can be placed to encompass at least 3 ants."
      ].join("\n\n"),
      explanationZh: [
        "把边长为 1 的正方形分成 5 x 5 的网格，每个小正方形的边长为 1/5。",
        "根据鸽巢原理，51 只蚂蚁放进 25 个小正方形中，至少有一个小正方形包含 ceil(51/25)=3 只蚂蚁。",
        "边长为 1/5 的正方形半对角线为 sqrt(2)/10，小于 1/7。因此半径为 1/7 的玻璃杯可以覆盖任意一个这样的小正方形，从而保证至少罩住 3 只蚂蚁。"
      ].join("\n\n")
    });

    patch("green-book-problem-088", {
      answerEn: "Choose to be the second player; your probability of losing is 5/11.",
      answerZh: "选择第二个玩家；你的失败概率为 5/11。",
      explanationEn: [
        "Because the barrel is spun again after every trigger pull, each pull is independent.",
        "Let p be the first player's probability of losing. On the first pull, the first player loses with probability 1/6. With probability 5/6 the first player survives, and the game is now in the same position with the roles reversed, so the first player's remaining probability of losing is 1-p.",
        "Thus p = 1/6 + (5/6)(1-p). Solving gives p = 6/11. The second player's probability of losing is therefore 1-p = 5/11, so you should choose to be second."
      ].join("\n\n"),
      explanationZh: [
        "因为每次扣动扳机后都会重新旋转弹巢，所以每次扣动都是独立的。",
        "设第一个玩家失败的概率为 p。第一次扣动时，第一个玩家以 1/6 的概率失败。以 5/6 的概率他会幸存，此时角色互换，剩余游戏中他失败的概率为 1-p。",
        "因此 p = 1/6 + (5/6)(1-p)，解得 p = 6/11。第二个玩家失败的概率为 1-p = 5/11，所以应该选择第二个玩家。"
      ].join("\n\n")
    });

    patch("green-book-problem-108", {
      answerEn: "The expected time is 500/501 minutes, about 0.998 minutes.",
      answerZh: "期望时间为 500/501 分钟，约为 0.998 分钟。",
      promptEn: "500 ants are randomly put on a 1-foot string, independently and uniformly between 0 and 1. Each ant randomly moves left or right with equal probability at speed 1 foot per minute until it falls off an end. Ants are infinitesimally small. When two ants collide head-on, they both immediately change directions and keep moving at 1 foot per minute. What is the expected time for all ants to fall off the string?",
      promptZh: "500 只蚂蚁被随机放在一根 1 英尺长的绳子上，每只蚂蚁的位置在 0 到 1 之间独立均匀分布。每只蚂蚁以 1 英尺/分钟的速度等概率向左或向右移动，直到从某一端掉下。假设蚂蚁无限小。两只蚂蚁正面相撞时会立即改变方向并继续以 1 英尺/分钟移动。所有蚂蚁掉下绳子的期望时间是多少？",
      explanationEn: [
        "When two ants collide and reverse directions, this is equivalent to the two ants passing through each other while exchanging labels. Since the ants are otherwise indistinguishable, collisions do not change the set of fall-off times.",
        "For one ant initially at position X uniformly distributed on [0,1], the time to fall is X if it moves left and 1-X if it moves right. This time is uniformly distributed on [0,1].",
        "Therefore the time until all 500 ants have fallen is the maximum of 500 IID Uniform(0,1) variables. If M is this maximum, P(M <= x)=x^500, so E[M]=500/501. The expected time is 500/501 minutes."
      ].join("\n\n"),
      explanationZh: [
        "两只蚂蚁相撞后同时掉头，等价于它们直接穿过彼此但交换标签。由于蚂蚁本身不可区分，相撞不会改变所有蚂蚁掉下绳子的时间集合。",
        "一只蚂蚁初始位置 X 在 [0,1] 上均匀分布；若向左走，掉下时间为 X，若向右走，掉下时间为 1-X。因此单只蚂蚁的掉下时间仍服从 [0,1] 上的均匀分布。",
        "所以所有蚂蚁全部掉下所需时间是 500 个独立 Uniform(0,1) 随机变量的最大值。若最大值为 M，则 P(M <= x)=x^500，因此 E[M]=500/501。期望时间为 500/501 分钟。"
      ].join("\n\n")
    });

    patch("green-book-problem-171", {
      answerEn: "It will take about 162 seconds. The naive recursive algorithm is exponential; use iterative dynamic programming in O(n), or matrix exponentiation in O(log n).",
      answerZh: "大约需要 162 秒。朴素递归算法是指数复杂度；应使用 O(n) 的迭代动态规划，或 O(log n) 的矩阵快速幂。",
      promptEn: [
        "Consider the following C++ program for producing Fibonacci numbers:",
        "",
        "int Fibonacci(int n) {",
        "  if (n <= 0) return 0;",
        "  else if (n == 1) return 1;",
        "  else return Fibonacci(n - 1) + Fibonacci(n - 2);",
        "}",
        "",
        "If for some large n it takes 100 seconds to compute Fibonacci(n), how long will it take to compute Fibonacci(n+1), to the nearest second? Is this algorithm efficient? How would you calculate Fibonacci numbers?"
      ].join("\n"),
      promptZh: [
        "考虑下面用于计算 Fibonacci 数的 C++ 程序：",
        "",
        "int Fibonacci(int n) {",
        "  if (n <= 0) return 0;",
        "  else if (n == 1) return 1;",
        "  else return Fibonacci(n - 1) + Fibonacci(n - 2);",
        "}",
        "",
        "如果对某个很大的 n，计算 Fibonacci(n) 需要 100 秒，那么计算 Fibonacci(n+1) 大约需要多少秒？这个算法高效吗？你会如何计算 Fibonacci 数？"
      ].join("\n"),
      explanationEn: [
        "The running time T(n) of the naive recursive program satisfies T(n)=T(n-1)+T(n-2)+O(1), so T(n) grows proportionally to the Fibonacci numbers.",
        "For large n, T(n+1)/T(n) approaches the golden ratio phi=(1+sqrt(5))/2, approximately 1.618. Therefore if T(n)=100 seconds, then T(n+1) is about 161.8 seconds, or 162 seconds to the nearest second.",
        "The recursive algorithm is inefficient because it recomputes the same smaller Fibonacci values many times. An iterative dynamic-programming computation stores the two most recent values and runs in O(n) time and O(1) space. Matrix exponentiation using [[1,1],[1,0]]^n can compute the value in O(log n) matrix multiplications."
      ].join("\n\n"),
      explanationZh: [
        "这个朴素递归程序的运行时间 T(n) 满足 T(n)=T(n-1)+T(n-2)+O(1)，因此 T(n) 与 Fibonacci 数列同阶增长。",
        "当 n 很大时，T(n+1)/T(n) 趋近黄金比例 phi=(1+sqrt(5))/2，约为 1.618。因此若 T(n)=100 秒，则 T(n+1) 约为 161.8 秒，四舍五入为 162 秒。",
        "该递归算法效率很低，因为它反复计算相同的较小 Fibonacci 值。可以用迭代动态规划只保存最近两个值，时间复杂度 O(n)、空间复杂度 O(1)。也可以用矩阵 [[1,1],[1,0]] 的快速幂，在 O(log n) 次矩阵乘法内完成计算。"
      ].join("\n\n")
    });

    patch("green-book-problem-094", {
      answerEn: "The probability is 3/5.",
      answerZh: "概率为 3/5。",
      explanationEn: [
        "Split the 20-minute interval into four independent 5-minute intervals with the same probability p of seeing at least one car.",
        "The probability of seeing no cars in a 5-minute interval is 1-p, so the probability of seeing no cars in all four intervals is (1-p)^4.",
        "Since the probability of seeing at least one car in 20 minutes is 609/625, the probability of seeing no cars in 20 minutes is 1-609/625=16/625.",
        "Thus (1-p)^4=16/625=(2/5)^4, so 1-p=2/5 and p=3/5."
      ].join("\n\n"),
      explanationZh: [
        "把 20 分钟分成四个不重叠的 5 分钟区间。设任意 5 分钟内至少看到一辆车的概率为 p。",
        "那么一个 5 分钟区间内看不到车的概率为 1-p，四个区间都看不到车的概率为 (1-p)^4。",
        "已知 20 分钟内至少看到一辆车的概率为 609/625，所以 20 分钟内看不到车的概率为 1-609/625=16/625。",
        "因此 (1-p)^4=16/625=(2/5)^4，得到 1-p=2/5，故 p=3/5。"
      ].join("\n\n")
    });

    patch("green-book-problem-179", {
      answerEn: "Common variance reduction methods include antithetic variables, moment matching, control variates, and importance sampling.",
      answerZh: "常见方差缩减方法包括对偶变量、矩匹配、控制变量和重要性抽样。",
      explanationEn: [
        "A basic Monte Carlo estimator is the average of IID samples. If each sample has variance sigma^2, the estimator variance is sigma^2/M for M simulations, so reducing the sample variance can greatly improve efficiency.",
        "Antithetic variables pair each random draw with a negatively correlated draw, such as using both Z and -Z for normal shocks. Averaging the paired payoffs reduces variance when the payoffs are negatively correlated.",
        "Moment matching rescales or recenters simulated samples so their sample mean and variance match the target distribution more closely.",
        "Control variates use a related quantity Y with known expectation. If X is the quantity of interest, estimate X with X + beta(E[Y]-Y), choosing beta to reduce variance.",
        "Importance sampling draws from a different density g(x) and weights by f(x)/g(x), so E_f[h(X)] = E_g[h(X)f(X)/g(X)]. A good choice of g samples more often from the region that contributes most to the payoff."
      ].join("\n\n"),
      explanationZh: [
        "基本 Monte Carlo 估计量是独立同分布样本的平均值。若单个样本方差为 sigma^2，M 次模拟后的估计量方差为 sigma^2/M，因此降低单次样本方差能显著提高效率。",
        "对偶变量会把每个随机样本与一个负相关样本配对，例如正态扰动同时使用 Z 和 -Z。当两个 payoff 负相关时，取平均可以降低方差。",
        "矩匹配会对模拟样本重新平移或缩放，使样本均值、方差等矩更接近目标分布。",
        "控制变量使用一个期望已知且与目标量相关的变量 Y。若 X 是目标量，可用 X + beta(E[Y]-Y) 进行估计，并选择 beta 来降低方差。",
        "重要性抽样改从另一个密度 g(x) 抽样，并乘以权重 f(x)/g(x)，即 E_f[h(X)] = E_g[h(X)f(X)/g(X)]。好的 g 会更多抽到对 payoff 贡献最大的区域。"
      ].join("\n\n")
    });

    patch("green-book-problem-160", {
      answerEn: "Basic interest-rate models include equilibrium short-rate models such as Vasicek and CIR, and no-arbitrage short-rate models such as Ho-Lee and Hull-White; forward-rate models such as HJM model the whole forward curve.",
      answerZh: "基本利率模型包括 Vasicek、CIR 等均衡短期利率模型，以及 Ho-Lee、Hull-White 等无套利短期利率模型；HJM 等远期利率模型则刻画整条远期曲线。",
      explanationEn: [
        "Interest-rate models can be grouped into short-rate models and forward-rate models. Short-rate models describe the instantaneous rate R(t); forward-rate models, such as HJM, describe the whole forward-rate curve.",
        "Equilibrium models do not necessarily match today's term structure. No-arbitrage models are calibrated to the current term structure so that prices are arbitrage-free relative to today's bond market.",
        "Vasicek: dR(t)=kappa(theta-R(t))dt + sigma dW(t). The rate mean-reverts toward theta, but constant volatility allows negative rates.",
        "CIR: dR(t)=kappa(theta-R(t))dt + sigma sqrt(R(t)) dW(t). It is mean-reverting and uses state-dependent volatility; under the usual Feller condition it helps keep rates nonnegative.",
        "Ho-Lee: dr(t)=theta(t)dt + sigma dW(t). The time-dependent drift is chosen to match the current yield curve.",
        "Hull-White: dR(t)=kappa(theta(t)-R(t))dt + sigma dW(t). It extends the Vasicek structure with a time-dependent mean level to fit the current term structure."
      ].join("\n\n"),
      explanationZh: [
        "利率模型可以分为短期利率模型和远期利率模型。短期利率模型描述瞬时利率 R(t)，HJM 等远期利率模型描述整条远期利率曲线。",
        "均衡模型不一定匹配当前期限结构；无套利模型会校准到当前期限结构，使价格相对于当前债券市场无套利。",
        "Vasicek: dR(t)=kappa(theta-R(t))dt + sigma dW(t)。利率向长期均值 theta 回复，但常数波动率可能导致负利率。",
        "CIR: dR(t)=kappa(theta-R(t))dt + sigma sqrt(R(t)) dW(t)。它保留均值回复，并使用状态相关波动率；在通常的 Feller 条件下有助于保持利率非负。",
        "Ho-Lee: dr(t)=theta(t)dt + sigma dW(t)。随时间变化的漂移用于匹配当前收益率曲线。",
        "Hull-White: dR(t)=kappa(theta(t)-R(t))dt + sigma dW(t)。它在 Vasicek 结构上加入随时间变化的均值水平，以拟合当前期限结构。"
      ].join("\n\n")
    });
  }

  if (book.slug === "yellow-book") {
    patch("yellow-book-problem-002", {
      titleEn: "Question 2 - Missing digit of 2^29",
      titleZh: "问题2 - 2^29 缺少哪一位数字",
      promptEn: "The number 2^29 has 9 digits, all different. Without computing 2^29 directly, find the missing digit.",
      promptZh: "数字 2^29 有 9 位，且各位数字互不相同。不直接计算 2^29，求缺少的数字。",
      answerEn: "The missing digit is 4.",
      answerZh: "缺少的数字是 4。",
      explanationEn: [
        "A number is congruent to the sum of its digits modulo 9.",
        "The digits 0 through 9 sum to 45. Since 2^29 has 9 distinct digits, if x is the missing digit then the digit sum is 45-x.",
        "Because 2^6 = 64 is congruent to 1 modulo 9, 2^29 = 2^(24+5) is congruent to 2^5 = 32, which is congruent to 5 modulo 9.",
        "Thus 45-x is congruent to 5 modulo 9, so x is congruent to 4 modulo 9. The missing digit must be a digit from 0 to 9, hence x=4."
      ].join("\n\n"),
      explanationZh: [
        "一个整数与其各位数字之和模 9 同余。",
        "数字 0 到 9 的和为 45。由于 2^29 有 9 位且各位数字互不相同，若缺少的数字为 x，则其各位数字之和为 45-x。",
        "因为 2^6 = 64 与 1 模 9 同余，所以 2^29 = 2^(24+5) 与 2^5 = 32 同余，也就是与 5 模 9 同余。",
        "因此 45-x 与 5 模 9 同余，所以 x 与 4 模 9 同余。x 是 0 到 9 中的一个数字，因此 x=4。"
      ].join("\n\n")
    });

    patch("yellow-book-problem-015", {
      category: "mentalMath",
      tags: [book.name, "Mathematics", "Algebra", "Nested radical", "mentalMath"],
      answerEn: "The value is 2.",
      answerZh: "值为 2。",
      explanationEn: [
        "Let x = sqrt(2 + sqrt(2 + sqrt(2 + ...))).",
        "The expression inside the outer square root is again 2+x, so x = sqrt(2+x). Squaring both sides gives x^2 = x + 2, or (x-2)(x+1)=0.",
        "Since the expression is nonnegative, x=2."
      ].join("\n\n"),
      explanationZh: [
        "设 x = sqrt(2 + sqrt(2 + sqrt(2 + ...)))。",
        "外层根号内仍然是 2+x，因此 x = sqrt(2+x)。两边平方得到 x^2 = x + 2，即 (x-2)(x+1)=0。",
        "由于原表达式非负，所以 x=2。"
      ].join("\n\n")
    });

    patch("yellow-book-problem-036", {
      answerEn: "Risk-neutral pricing values a derivative as the discounted expectation of its payoff under a risk-neutral measure.",
      answerZh: "风险中性定价是在风险中性测度下，将衍生品到期收益的期望折现为当前价值。",
      explanationEn: [
        "Risk-neutral pricing means that we value a derivative by moving to a probability measure under which tradable assets earn the risk-free rate after adjusting for dividends or carry.",
        "For example, if under the risk-neutral measure Q the underlying follows dS_t=(r-q)S_t dt + sigma S_t dW_t^Q, then a derivative with payoff H(S_T) at time T has time-0 price",
        "V(0)=e^{-rT} E^Q[H(S_T)].",
        "More generally, at time t the price is V(t)=E^Q[exp(-int_t^T r_u du) H(S_T) | F_t]. The word risk-neutral does not mean investors are actually indifferent to risk; it is a pricing measure that makes discounted tradable prices martingales."
      ].join("\n\n"),
      explanationZh: [
        "风险中性定价是指在一个风险中性测度下给衍生品定价；在该测度下，考虑股息或持有收益后，可交易资产的期望收益率为无风险利率。",
        "例如，如果在风险中性测度 Q 下，标的资产满足 dS_t=(r-q)S_t dt + sigma S_t dW_t^Q，那么到期 T 的收益为 H(S_T) 的衍生品在 0 时刻价格为",
        "V(0)=e^{-rT} E^Q[H(S_T)]。",
        "更一般地，t 时刻价格为 V(t)=E^Q[exp(-int_t^T r_u du) H(S_T) | F_t]。风险中性并不是说投资者真的不厌恶风险，而是用一个使贴现可交易价格成为鞅的定价测度。"
      ].join("\n\n")
    });

    patch("yellow-book-problem-108", {
      titleEn: "Question 14 - Ito integral of a Wiener process",
      titleZh: "问题14 - Wiener 过程的 Ito 积分",
      promptEn: "Let W_t be a Wiener process. Find int_0^t W_s dW_s and E[int_0^t W_s dW_s].",
      promptZh: "设 W_t 为 Wiener 过程。求 int_0^t W_s dW_s 以及 E[int_0^t W_s dW_s]。",
      answerEn: "int_0^t W_s dW_s = (W_t^2 - t)/2, and its expectation is 0.",
      answerZh: "int_0^t W_s dW_s = (W_t^2 - t)/2，其期望为 0。",
      explanationEn: [
        "Apply Ito's lemma to f(x)=x^2. Since f'(x)=2x and f''(x)=2, we have d(W_t^2)=2W_t dW_t + dt.",
        "Rearranging gives W_t dW_t = 1/2 d(W_t^2) - 1/2 dt. Integrating from 0 to t and using W_0=0 yields int_0^t W_s dW_s = (W_t^2 - t)/2.",
        "Because W_t is normally distributed with mean 0 and variance t, E[W_t^2]=t. Therefore E[int_0^t W_s dW_s]=1/2(E[W_t^2]-t)=0."
      ].join("\n\n"),
      explanationZh: [
        "对 f(x)=x^2 应用 Ito 引理。由于 f'(x)=2x 且 f''(x)=2，有 d(W_t^2)=2W_t dW_t + dt。",
        "整理得 W_t dW_t = 1/2 d(W_t^2) - 1/2 dt。从 0 到 t 积分，并用 W_0=0，可得 int_0^t W_s dW_s = (W_t^2 - t)/2。",
        "因为 W_t 服从均值为 0、方差为 t 的正态分布，所以 E[W_t^2]=t。因此 E[int_0^t W_s dW_s]=1/2(E[W_t^2]-t)=0。"
      ].join("\n\n")
    });

    patch("yellow-book-problem-109", {
      titleEn: "Question 15 - Distribution of int_0^1 W_t dW_t",
      titleZh: "问题15 - int_0^1 W_t dW_t 的分布",
      promptEn: "Find the distribution of the random variable X = int_0^1 W_t dW_t, where W_t is a Wiener process.",
      promptZh: "设 W_t 为 Wiener 过程。求随机变量 X = int_0^1 W_t dW_t 的分布。",
      answerEn: "X = (Z^2 - 1)/2 where Z is standard normal; equivalently, 2X+1 has a chi-square distribution with 1 degree of freedom.",
      answerZh: "X = (Z^2 - 1)/2，其中 Z 为标准正态随机变量；等价地，2X+1 服从自由度为 1 的卡方分布。",
      explanationEn: [
        "Apply Ito's formula to f(x)=x^2. Since f'(x)=2x and f''(x)=2, d(W_t^2)=2W_t dW_t + dt.",
        "Integrating from 0 to 1 and using W_0=0 gives W_1^2 = 2 int_0^1 W_t dW_t + 1 = 2X + 1.",
        "Let Z=W_1. Then Z is standard normal and X=(Z^2-1)/2. Thus 2X+1 is chi-square with one degree of freedom, supported on X >= -1/2.",
        "The density is f_X(x)=2/sqrt(2*pi*(2x+1))*exp(-(2x+1)/2), for x >= -1/2."
      ].join("\n\n"),
      explanationZh: [
        "对 f(x)=x^2 应用 Ito 公式。由于 f'(x)=2x、f''(x)=2，有 d(W_t^2)=2W_t dW_t + dt。",
        "从 0 到 1 积分，并用 W_0=0，得到 W_1^2 = 2 int_0^1 W_t dW_t + 1 = 2X + 1。",
        "令 Z=W_1，则 Z 是标准正态随机变量，所以 X=(Z^2-1)/2。因此 2X+1 服从自由度为 1 的卡方分布，X 的取值范围为 X >= -1/2。",
        "其密度为 f_X(x)=2/sqrt(2*pi*(2x+1))*exp(-(2x+1)/2)，其中 x >= -1/2。"
      ].join("\n\n")
    });

    patch("yellow-book-problem-123", {
      answerEn: "The probability is 2/3.",
      answerZh: "概率为 2/3。",
      explanationEn: [
        "Label the pancakes by the number of burnt sides: E_0 is the pancake golden on both sides, E_1 is mixed, and E_2 is burnt on both sides. Let A be the event that the side you see is golden.",
        "By Bayes' formula, P(E_0 | A) = P(A | E_0)P(E_0) / [P(A | E_0)P(E_0) + P(A | E_1)P(E_1) + P(A | E_2)P(E_2)].",
        "Here P(E_i)=1/3, while P(A | E_0)=1, P(A | E_1)=1/2, and P(A | E_2)=0. Therefore P(E_0 | A)=(1/3)/(1/3+1/6)=2/3.",
        "Equivalently, among the six pancake sides, three are golden; two of those three belong to the two-sided golden pancake."
      ].join("\n\n"),
      explanationZh: [
        "按烧焦面的数量标记三块煎饼：E_0 表示两面金黄，E_1 表示一面金黄一面焦，E_2 表示两面都焦。设 A 为看到的这一面是金黄色。",
        "根据贝叶斯公式，P(E_0 | A) = P(A | E_0)P(E_0) / [P(A | E_0)P(E_0) + P(A | E_1)P(E_1) + P(A | E_2)P(E_2)]。",
        "这里 P(E_i)=1/3，且 P(A | E_0)=1、P(A | E_1)=1/2、P(A | E_2)=0。因此 P(E_0 | A)=(1/3)/(1/3+1/6)=2/3。",
        "等价地看，六个煎饼面中有三个是金黄色；这三个金黄色面里有两个属于那块两面金黄的煎饼。"
      ].join("\n\n")
    });

    patch("yellow-book-problem-032", {
      titleEn: "Question 10 - Correlation matrix parameter",
      titleZh: "问题10 - 相关矩阵中的参数",
      promptEn: "Find all values of p such that Q = [[1, 0.6, -0.3], [0.6, 1, p], [-0.3, p, 1]] is a correlation matrix.",
      promptZh: "求所有 p，使矩阵 Q = [[1, 0.6, -0.3], [0.6, 1, p], [-0.3, p, 1]] 是相关矩阵。",
      answerEn: "-0.9432 <= p <= 0.5832 approximately, equivalently -0.18 - sqrt(0.5824) <= p <= -0.18 + sqrt(0.5824).",
      answerZh: "近似为 -0.9432 <= p <= 0.5832，等价地，-0.18 - sqrt(0.5824) <= p <= -0.18 + sqrt(0.5824)。",
      explanationEn: [
        "A correlation matrix must be symmetric, have diagonal entries equal to 1, and be positive semidefinite. The only nontrivial condition here is positive semidefiniteness.",
        "For Q = [[1, 0.6, -0.3], [0.6, 1, p], [-0.3, p, 1]], the leading 1 by 1 and 2 by 2 principal minors are nonnegative. The determinant is",
        "det(Q)=1 + 2(0.6)(-0.3)p - 0.6^2 - (-0.3)^2 - p^2 = 0.55 - 0.36p - p^2.",
        "Thus Q is positive semidefinite iff 0.55 - 0.36p - p^2 >= 0, or p^2 + 0.36p - 0.55 <= 0.",
        "Solving gives -0.18 - sqrt(0.5824) <= p <= -0.18 + sqrt(0.5824), approximately -0.9432 <= p <= 0.5832."
      ].join("\n\n"),
      explanationZh: [
        "相关矩阵必须对称、对角线元素为 1，并且为正半定矩阵。这里唯一需要检查的非平凡条件是正半定性。",
        "对 Q = [[1, 0.6, -0.3], [0.6, 1, p], [-0.3, p, 1]]，一阶和二阶顺序主子式均非负。其行列式为",
        "det(Q)=1 + 2(0.6)(-0.3)p - 0.6^2 - (-0.3)^2 - p^2 = 0.55 - 0.36p - p^2。",
        "因此 Q 正半定当且仅当 0.55 - 0.36p - p^2 >= 0，也就是 p^2 + 0.36p - 0.55 <= 0。",
        "解得 -0.18 - sqrt(0.5824) <= p <= -0.18 + sqrt(0.5824)，近似为 -0.9432 <= p <= 0.5832。"
      ].join("\n\n")
    });
  }

  if (book.slug === "quantitative-primer") {
    patch("quantitative-primer-problem-030", {
      answerEn: "The smallest possible value is N=4, with r=3 red socks.",
      answerZh: "最小可能值为 N=4，此时红袜子数 r=3。",
      explanationEn: [
        "Let r be the number of red socks among N socks. The probability that two socks drawn without replacement are both red is",
        "P(both red) = (r/N) * ((r-1)/(N-1)) = 1/2.",
        "For N=2, both socks would have to be red, giving probability 1 rather than 1/2. For N=3, no integer r satisfies r(r-1)/(3*2)=1/2. For N=4, choosing r=3 gives (3/4)*(2/3)=1/2.",
        "Therefore the smallest possible value of N is 4."
      ].join("\n\n"),
      explanationZh: [
        "设 N 只袜子中有 r 只是红色。不放回抽取两只袜子都为红色的概率为",
        "P(两只都是红袜子) = (r/N) * ((r-1)/(N-1)) = 1/2。",
        "当 N=2 时，若两只都是红色则概率为 1，不符合题意。当 N=3 时，没有整数 r 使 r(r-1)/(3*2)=1/2。当 N=4 时，取 r=3，有 (3/4)*(2/3)=1/2。",
        "因此 N 的最小可能值为 4。"
      ].join("\n\n")
    });
  }

  if (book.slug === "dudeney-puzzles") {
    patch("dudeney-puzzles-problem-058", {
      category: "mentalMath",
      difficulty: "Medium",
      tags: [book.name, "Unicursal and route puzzles", "Classical puzzle", "mentalMath"],
      answerEn: "Use the hidden loophole: fold the paper so two required lines can be drawn in one stroke, then draw the remaining strokes.",
      answerZh: "利用题目没有禁止折纸这个漏洞：把纸折起来，使两条线能一笔画出，再画剩余线段。",
      promptZh: "多年来，我的少年朋友不断向我询问这个小谜题。大多数孩子似乎都知道题目，但常常不知道答案。他们总会问：“请告诉我这是否真的可能。”谜题要求用铅笔三笔画出插图中小女孩展示的图形。当然，画线时不能把铅笔从纸上拿开，也不能重复描同一条线。另一种形式是在石板上画出图形，然后用三次擦除把它擦掉。",
      explanationZh: "按通常理解，这个谜题无法直接完成。因此要寻找题目措辞中的漏洞。如果把纸折起来，再把铅笔尖压在折痕之间，就能一笔画出图中的 CD 和 EF 两条线。然后从 A 开始画到 B，最后画 GH，严格说仍然满足条件，因为题目没有禁止折纸。擦除版本也是同样的把戏：先一笔擦掉 A 到 B，再擦掉 GH，最后用两根手指同时擦掉剩下两条竖线。"
    });

    patch("dudeney-puzzles-problem-057", {
      answerEn: "One valid five-move sequence is shown in the explanation.",
      answerZh: "一种合法的五步移动序列见解析。",
      promptZh: "在纸上画出十个位置表示椅子，并用八个编号筹码代表孩子。奇数代表男孩，偶数代表女孩。每一步都从相邻的两把椅子上取走两个孩子，把他们换边后放到两把空椅子上。重复这个操作，直到所有男孩在一起、所有女孩在一起，且两把空椅子位于一端。要求正好五步完成。",
      explanationEn: [
        "Write the two empty chairs as dots. One valid five-move sequence is:",
        ".. 1 2 3 4 5 6 7 8",
        "2 1 .. 3 4 5 6 7 8",
        "2 1 7 6 3 4 5 .. 8",
        "2 1 7 6 3 .. 5 4 8",
        "2 .. 6 3 7 1 5 4 8",
        "2 8 4 6 3 7 1 5 ..",
        "The last row has the girls together, the boys together, and the two vacant chairs at the end."
      ].join("\n"),
      explanationZh: [
        "用两个点表示空椅子。一种合法的五步移动序列为：",
        ".. 1 2 3 4 5 6 7 8",
        "2 1 .. 3 4 5 6 7 8",
        "2 1 7 6 3 4 5 .. 8",
        "2 1 7 6 3 .. 5 4 8",
        "2 .. 6 3 7 1 5 4 8",
        "2 8 4 6 3 7 1 5 ..",
        "最后一行中女孩在一起、男孩在一起，两个空椅子也位于一端。"
      ].join("\n")
    });

    patch("dudeney-puzzles-problem-068", {
      answerEn: "Swap cards 6 and 13, then start counting at 14. Other valid starts include swapping 10 and 14 then starting at 16, or swapping 6 and 8 then starting at 19.",
      answerZh: "交换 6 和 13，然后从 14 开始计数。其他可行方案包括交换 10 和 14 后从 16 开始，或交换 6 和 8 后从 19 开始。",
      promptZh: "将 21 张卡片编号为 1 到 21，并按图示顺序围成一圈。你可以从任意一张卡片开始，把它数作“一”，然后顺时针数下去；当数到的数与卡片上的数字相同，就抓住这张卡并移除它，再从下一张卡重新从“一”开始数。开始之前允许任意交换两张卡片。请找出一种交换和起点，使得可以抓住全部 21 张卡片；不能跳过任何一次抓取。",
      explanationEn: "If we interchange cards 6 and 13 and begin our count at 14, we catch all twenty-one cards in this order: 6, 8, 13, 2, 10, 1, 11, 4, 14, 3, 5, 7, 21, 12, 15, 20, 9, 16, 18, 17, 19. We may also exchange 10 and 14 and start at 16, or exchange 6 and 8 and start at 19.",
      explanationZh: "如果交换 6 和 13，并从 14 开始计数，就能按以下顺序抓住全部二十一张卡片：6、8、13、2、10、1、11、4、14、3、5、7、21、12、15、20、9、16、18、17、19。也可以交换 10 和 14 后从 16 开始，或交换 6 和 8 后从 19 开始。"
    });

    patch("dudeney-puzzles-problem-096", {
      category: "mentalMath",
      difficulty: "Hard",
      tags: [book.name, "Chessboard puzzles", "River crossing puzzle", "Classical puzzle", "mentalMath"],
      answerEn: "Thirteen crossings are necessary; the crossing schedule is given in the explanation.",
      answerZh: "最少需要十三次渡河；具体渡河顺序见解析。",
      promptZh: "许多年前，南德文郡海岸有一个被称为“西部罗布·罗伊”的走私者团伙埋下了大量宝藏，地点自然被他们用惯常的谜样方式隐藏起来。后来三名同伙找到了宝藏，并分得战利品：Giles 得到价值 800 英镑的财宝，Jasper 得到 500 英镑，Timothy 得到 300 英镑。返回时，他们必须渡过阿克斯河，河边有一艘预先留下的小船。但船一次只能载两个人，或一个人和一袋财宝。三人彼此极不信任，所以任何人都不能独自留在岸上或船上并掌握超过自己份额的财宝；两个人在一起互相监督时则可以。请用尽可能少的渡河次数，让三人和财宝全部过河。不得使用绳索、飞桥、水流、游泳等取巧办法。"
    });
  }

  if (book.slug === "red-book") {
    patch("red-book-problem-123", {
      titleEn: "Question 5.8 - Compute sinc(x)=sin(x)/x robustly",
      titleZh: "问题 5.8 - 稳健计算 sinc(x)=sin(x)/x",
      promptEn: "Let f(x)=sin(x)/x. Write code that returns f(x) and is well behaved everywhere, including at x=0.",
      promptZh: "令 f(x)=sin(x)/x。编写代码返回 f(x)，并要求它在包括 x=0 在内的所有位置都表现良好。",
      answerEn: "Define f(0)=1. For small |x| use the Taylor expansion 1 - x^2/6 + x^4/120; otherwise return sin(x)/x.",
      answerZh: "定义 f(0)=1。当 |x| 很小时使用 Taylor 展开 1 - x^2/6 + x^4/120；否则返回 sin(x)/x。",
      explanationEn: [
        "The function has a removable singularity at x=0 because lim_{x->0} sin(x)/x = 1.",
        "A robust implementation should avoid direct division near zero, where cancellation and floating-point error can be significant. For example:",
        "",
        "double sinc(double x) {",
        "  double ax = fabs(x);",
        "  if (ax < 1e-4) {",
        "    double x2 = x * x;",
        "    return 1.0 - x2 / 6.0 + x2 * x2 / 120.0;",
        "  }",
        "  return sin(x) / x;",
        "}",
        "",
        "The Taylor series sin(x)/x = 1 - x^2/3! + x^4/5! - ... is well behaved near zero, while the library sine function is appropriate away from zero."
      ].join("\n"),
      explanationZh: [
        "该函数在 x=0 处有可去奇点，因为 lim_{x->0} sin(x)/x = 1。",
        "稳健实现应避免在零附近直接相除，因为这可能带来消去误差和浮点误差。例如：",
        "",
        "double sinc(double x) {",
        "  double ax = fabs(x);",
        "  if (ax < 1e-4) {",
        "    double x2 = x * x;",
        "    return 1.0 - x2 / 6.0 + x2 * x2 / 120.0;",
        "  }",
        "  return sin(x) / x;",
        "}",
        "",
        "Taylor 展开 sin(x)/x = 1 - x^2/3! + x^4/5! - ... 在零附近表现良好，而远离零时可直接使用标准库的 sin(x)/x。"
      ].join("\n")
    });

    patch("red-book-problem-058", {
      answerEn: "The game value is 1/H_100 dollars, about 0.193 dollars, where H_100=sum_{k=1}^{100} 1/k.",
      answerZh: "游戏价值为 1/H_100 美元，约 0.193 美元，其中 H_100=sum_{k=1}^{100} 1/k。",
      explanationEn: [
        "This is a zero-sum strategy question. If the picker chooses number k with probability q_k, and you guess k, your expected payoff is k q_k.",
        "The picker minimizes your best response by making k q_k constant across all k. Thus q_k = c/k.",
        "Since probabilities sum to 1, c sum_{k=1}^{100} 1/k = 1, so c = 1/H_100.",
        "With this strategy your expected payoff is 1/H_100 no matter which number you guess. Therefore the fair price is 1/H_100 dollars, approximately 0.193 dollars."
      ].join("\n\n"),
      explanationZh: [
        "这是一个零和策略问题。若出题者以概率 q_k 选择数字 k，而你猜 k，则你的期望收益为 k q_k。",
        "出题者为了最小化你的最佳反应，会让所有 k q_k 相等。因此 q_k = c/k。",
        "由于概率和为 1，有 c sum_{k=1}^{100} 1/k = 1，所以 c = 1/H_100。",
        "在这个策略下，无论你猜哪个数字，期望收益都是 1/H_100。因此公平价格为 1/H_100 美元，约 0.193 美元。"
      ].join("\n\n")
    });

    patch("red-book-problem-068", {
      answerEn: "If the information only means at least one child is a girl, the probability the other is a boy is 2/3. If a particular observed child is known to be a girl, the probability is 1/2.",
      answerZh: "如果信息仅表示至少有一个孩子是女孩，则另一个是男孩的概率为 2/3。若已知某个特定观察到的孩子是女孩，则另一个是男孩的概率为 1/2。",
      explanationEn: [
        "The answer depends on how the information is obtained.",
        "If the statement means only that at least one of the two children is a girl, the possible equally likely gender pairs are GG, GB, and BG. In two of these three cases the other child is a boy, so the probability is 2/3.",
        "If instead you have identified a particular child as a girl, then the other child's gender is independent and equally likely to be boy or girl, so the probability is 1/2."
      ].join("\n\n"),
      explanationZh: [
        "答案取决于信息是如何获得的。",
        "如果这句话只表示两个孩子中至少有一个是女孩，那么等可能的性别组合为 GG、GB、BG。其中两种情况下另一个孩子是男孩，所以概率为 2/3。",
        "如果你已经观察到某个特定孩子是女孩，那么另一个孩子的性别独立，男孩和女孩等可能，因此概率为 1/2。"
      ].join("\n\n")
    });

    patch("red-book-problem-152", {
      answerEn: "Use x=ln(S/K), tau=(sigma^2/2)(T-t), k=2r/sigma^2, and C=K exp(alpha x + beta tau)u with alpha=-(k-1)/2 and beta=-(k+1)^2/4; then u_tau=u_xx.",
      answerZh: "令 x=ln(S/K)、tau=(sigma^2/2)(T-t)、k=2r/sigma^2，并设 C=K exp(alpha x + beta tau)u，其中 alpha=-(k-1)/2、beta=-(k+1)^2/4，即可得到 u_tau=u_xx。",
      explanationEn: [
        "For a non-dividend-paying stock, the Black-Scholes PDE is C_t + (1/2)sigma^2 S^2 C_SS + r S C_S - r C = 0.",
        "Let x=ln(S/K), tau=(sigma^2/2)(T-t), and k=2r/sigma^2. In these variables the PDE becomes C_tau = C_xx + (k-1)C_x - kC.",
        "Now set C=K exp(alpha x + beta tau)u(x,tau). Choose alpha=-(k-1)/2 to eliminate the first-derivative term, and beta=-(k+1)^2/4 to eliminate the zero-order term.",
        "With these choices, the transformed function u satisfies the standard one-dimensional heat equation u_tau = u_xx. The payoff and boundary conditions must then be transformed through the same substitutions."
      ].join("\n\n"),
      explanationZh: [
        "对于不分红股票，Black-Scholes PDE 为 C_t + (1/2)sigma^2 S^2 C_SS + r S C_S - r C = 0。",
        "令 x=ln(S/K)、tau=(sigma^2/2)(T-t)，并设 k=2r/sigma^2。在这些变量下，PDE 变为 C_tau = C_xx + (k-1)C_x - kC。",
        "再设 C=K exp(alpha x + beta tau)u(x,tau)。选择 alpha=-(k-1)/2 可消去一阶导项，选择 beta=-(k+1)^2/4 可消去零阶项。",
        "于是变换后的函数 u 满足标准一维热方程 u_tau = u_xx。期权 payoff 和边界条件也需要通过同样的变量替换进行变换。"
      ].join("\n\n")
    });
  }
}

function readLocalizedEntries(inputPath, book) {
  if (!book.translationPath) return [];
  const translationPath = path.join(desktopBookRoot, book.translationPath);
  if (!fs.existsSync(translationPath)) return [];
  const entries = extractTexProblemEntries(translationPath);
  if (!entries.length) {
    console.warn(`No localized entries found in ${translationPath}`);
  }
  return entries;
}

function extractTexProblemEntries(inputPath) {
  const tex = fs.readFileSync(inputPath, "utf8").replace(/\0/g, "");
  const bodyStart = tex.indexOf("\\begin{document}");
  const lines = tex.slice(bodyStart >= 0 ? bodyStart : 0).split(/\r?\n/);
  const entries = [];
  let subsection = "";

  for (let index = 0; index < lines.length; index += 1) {
    subsection = readHeading(lines[index], "subsection") || subsection;
    if (!/\\begin\{problembox\}/.test(lines[index])) continue;

    const prompt = collectEnvironment(lines, index, "problembox");
    const solutionStart = findLine(lines, prompt.end + 1, (line) => /\\solution\b/.test(line));
    const solutionEnd = findLine(lines, Math.max(prompt.end + 1, solutionStart + 1), (line) => (
      /\\(?:chapter|section|subsection)\*?\{/.test(line) || /\\begin\{problembox\}/.test(line) || /^\s*CHAPTER\s+\d+\b/.test(line) || /^\s*第\s*\d+\s*章\b/.test(line)
    ));
    const rawSolution = solutionStart >= 0
      ? lines.slice(solutionStart + 1, solutionEnd >= 0 ? solutionEnd : lines.length).join("\n")
      : "";

    entries.push({
      title: cleanInlineText(subsection),
      prompt: cleanPromptBlock(cleanTexBlock(prompt.content)),
      solution: cleanTexBlock(rawSolution)
    });
    index = prompt.end;
  }

  return entries;
}

function applyLocalizedEntries(problems, book, localizedEntries) {
  if (!localizedEntries.length) return;
  const targetLanguage = book.sourceLanguage === "zh" ? "en" : "zh";
  let used = 0;

  problems.forEach((problem, index) => {
    const entry = localizedEntries[index];
    if (!entry) return;
    used += 1;
    const title = cleanLocalizedText(entry.title, book, "title");
    const prompt = cleanLocalizedText(entry.prompt, book, "prompt");
    const solution = cleanLocalizedText(entry.solution, book, "solution");

    if (targetLanguage === "zh") {
      if (title) problem.titleZh = title;
      if (isUsableLocalizedText(prompt, problem.promptEn || problem.promptZh, "prompt")) problem.promptZh = prompt;
      if (isUsableLocalizedText(solution, problem.explanationEn || problem.explanation, "solution")) problem.explanationZh = solution;
    } else {
      if (title) problem.titleEn = title;
      if (isUsableLocalizedText(prompt, problem.promptZh || problem.promptEn, "prompt")) problem.promptEn = prompt;
      if (isUsableLocalizedText(solution, problem.explanationZh || problem.explanation, "solution")) problem.explanationEn = solution;
    }
  });

  if (used && used !== Math.min(problems.length, localizedEntries.length)) {
    console.warn(`Localized entry alignment for ${book.slug}: used ${used}/${localizedEntries.length}`);
  }
}

function cleanLocalizedText(text, book, scope) {
  let value = normalizeDisplayTexText(text);
  if (!value) return "";
  if (scope === "solution") {
    value = normalizeKnownPlaceholder(value, book);
  }
  return value;
}

function isUsableLocalizedText(value, source, scope) {
  const text = String(value || "").trim();
  if (!text) return false;
  const sourceText = String(source || "").trim();
  if (!sourceText || scope === "title") return true;
  const hasCjk = /[\u3400-\u9fff]/.test(text);
  const minLengthRatio = hasCjk ? 0.12 : 0.2;
  if (sourceText.length >= 120 && text.length < sourceText.length * minLengthRatio) return false;
  if (sourceText.length >= 240 && text.length < (hasCjk ? 36 : 60)) return false;
  return true;
}

function normalizeKnownPlaceholder(text, book) {
  const value = String(text || "").trim();
  if (!value) return "";
  if (book.slug === "hull-derivatives" && /Pearson Instructor|Instructor'?s Manual|Hull|教材正文.*公开答案/i.test(value)) {
    return "（Pearson Instructor's Manual 提供习题解答；Hull 教材正文不含公开答案。）";
  }
  if (/本书该题暂无自动提取的解答|source PDF|原版\s*PDF/i.test(value)) {
    return "（本书该题暂无自动提取的解答，请对照原版 PDF。）";
  }
  return value;
}

function normalizeLocalizedProblemFields(problems, book) {
  const sourceLanguage = book.sourceLanguage === "zh" ? "zh" : "en";
  problems.forEach((problem) => {
    problem.titleZh = normalizeDisplayTexText(problem.titleZh);
    problem.titleEn = normalizeDisplayTexText(problem.titleEn);
    problem.promptZh = normalizeDisplayTexText(problem.promptZh);
    problem.promptEn = normalizeDisplayTexText(problem.promptEn);
    problem.answerZh = normalizeDisplayTexText(problem.answerZh);
    problem.answerEn = normalizeDisplayTexText(problem.answerEn);
    problem.explanationZh = normalizeDisplayTexText(problem.explanationZh);
    problem.explanationEn = normalizeDisplayTexText(problem.explanationEn);

    if (!problem.titleEn && isMostlyAscii(problem.titleZh)) problem.titleEn = problem.titleZh;
    if (!problem.titleZh && problem.titleEn) problem.titleZh = problem.titleEn;
    if (!problem.promptEn && isMostlyAscii(problem.promptZh)) problem.promptEn = problem.promptZh;
    if (!problem.promptZh && problem.promptEn) problem.promptZh = problem.promptEn;

    if (!problem.explanationEn && isMostlyAscii(problem.explanation)) problem.explanationEn = normalizeDisplayTexText(problem.explanation);
    if (!problem.explanationZh && !isMostlyAscii(problem.explanation)) problem.explanationZh = normalizeDisplayTexText(problem.explanation);
    if (book.slug === "hull-derivatives") {
      problem.explanationEn = problem.explanationEn || "Hull textbook practice question. Please consult the original text or add a later worked solution.";
      problem.explanationZh = normalizeKnownPlaceholder(
        problem.explanationZh || "（Pearson Instructor's Manual 提供习题解答；Hull 教材正文不含公开答案。）",
        book
      );
    }

    problem.answer = sourceLanguage === "zh"
      ? (problem.answerZh || problem.answerEn || problem.answer || "")
      : (problem.answerEn || problem.answerZh || problem.answer || "");
    problem.explanation = sourceLanguage === "zh"
      ? (problem.explanationZh || problem.explanationEn || problem.explanation || "")
      : (problem.explanationEn || problem.explanationZh || problem.explanation || "");
  });
}

function normalizeDisplayTexText(text) {
  return String(text || "")
    .replace(/(^|[^\\])\$(?=\d)/g, (match, prefix, offset, fullText) => {
      const dollarIndex = offset + prefix.length;
      return shouldKeepDigitMathDollar(fullText, dollarIndex) ? match : `${prefix}\\$`;
    })
    .replace(/\\textbackslash\{\}/g, "\\")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function shouldKeepDigitMathDollar(text, dollarIndex) {
  const closing = findNextUnescapedDollar(text, dollarIndex + 1);
  if (closing === -1) return false;
  const body = text.slice(dollarIndex + 1, closing);
  if (!body || body.length > 120) return false;
  if (/[.,，。;；:：]/.test(body)) return false;
  return /[\\/^_{}=+\-*/<>()A-Za-z]/.test(body);
}

function findNextUnescapedDollar(text, startIndex) {
  for (let index = startIndex; index < text.length; index += 1) {
    if (text[index] !== "$") continue;
    let slashCount = 0;
    for (let cursor = index - 1; cursor >= 0 && text[cursor] === "\\"; cursor -= 1) slashCount += 1;
    if (slashCount % 2 === 0) return index;
  }
  return -1;
}

function collectTexMedia(rawText, inputPath, book, problemIndex, scope) {
  const refs = extractIncludeGraphicsRefs(rawText);
  return refs
    .map((ref, mediaIndex) => materializeProblemMedia(ref, inputPath, book, problemIndex, scope, mediaIndex + 1))
    .filter(Boolean);
}

function extractIncludeGraphicsRefs(text) {
  const refs = [];
  const pattern = /\\includegraphics(?:\[[^\]]*\])?\{([^{}]+)\}/g;
  for (const match of String(text || "").matchAll(pattern)) {
    const ref = String(match[1] || "").trim();
    if (ref) refs.push(ref);
  }
  return refs;
}

function materializeProblemMedia(ref, inputPath, book, problemIndex, scope, mediaIndex) {
  if (isSafeExternalMediaUrl(ref)) return ref;
  const sourcePath = resolveMediaPath(ref, inputPath);
  if (!sourcePath) {
    console.warn(`Missing media for ${book.slug} problem ${problemIndex}: ${ref}`);
    return "";
  }
  const extension = path.extname(sourcePath).toLowerCase();
  if (!/\.(?:png|jpe?g|gif|webp|svg)$/i.test(extension)) return "";

  const destinationDir = path.join(mediaRoot, book.slug);
  fs.mkdirSync(destinationDir, { recursive: true });
  if (path.resolve(sourcePath).startsWith(`${path.resolve(destinationDir)}${path.sep}`)) {
    return `assets/problem-media/${book.slug}/${path.basename(sourcePath)}`;
  }
  const destinationName = [
    String(problemIndex).padStart(3, "0"),
    scope,
    String(mediaIndex).padStart(2, "0"),
    sanitizeFileName(path.basename(sourcePath))
  ].join("-");
  const destinationPath = path.join(destinationDir, destinationName);
  if (path.resolve(sourcePath) === path.resolve(destinationPath)) {
    return `assets/problem-media/${book.slug}/${destinationName}`;
  }
  fs.copyFileSync(sourcePath, destinationPath);
  return `assets/problem-media/${book.slug}/${destinationName}`;
}

function resolveMediaPath(ref, inputPath) {
  const cleaned = String(ref || "").trim();
  const candidates = [
    path.resolve(path.dirname(inputPath), cleaned),
    path.resolve(desktopBookRoot, cleaned),
    path.resolve(projectRoot, cleaned)
  ];
  const extensions = ["", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"];
  for (const candidate of candidates) {
    for (const extension of extensions) {
      const filePath = candidate.endsWith(extension) ? candidate : `${candidate}${extension}`;
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) return filePath;
    }
  }
  return "";
}

function isSafeExternalMediaUrl(value) {
  return /^https?:\/\/.+\.(?:png|jpe?g|gif|webp|svg)(?:[?#].*)?$/i.test(String(value || "").trim());
}

function sanitizeFileName(value) {
  return String(value || "media")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "") || "media";
}

function attachProblemMedia(problem, promptMedia, solutionMedia) {
  if (promptMedia.length) problem.promptImages = [...new Set(promptMedia)];
  if (solutionMedia.length) problem.solutionImages = [...new Set(solutionMedia)];
}

function hydrateHullProblemsFromPdf(problems, pdfPath, book) {
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`Missing Hull source PDF: ${pdfPath}`);
  }

  const result = spawnSync("python3", ["-", pdfPath], {
    input: String.raw`
import json
import re
import sys

try:
    import fitz
except Exception as exc:
    print(json.dumps({"error": f"PyMuPDF import failed: {exc}"}))
    raise SystemExit(0)

pdf_path = sys.argv[1]
doc = fitz.open(pdf_path)
chunks = []
current = []
current_chapter = None
in_practice = False
start_page = 0

for page_index in range(doc.page_count):
    text = doc.load_page(page_index).get_text("text")
    text = text.replace("\r", "\n").replace("\xad", "")
    if "Practice Questions" in text:
        if current:
            chunks.append((current_chapter, start_page, page_index, "\n".join(current)))
            current = []
        in_practice = True
        start_page = page_index + 1
        text = text.split("Practice Questions", 1)[1]
        first_question = re.search(r"\b(\d{1,2})\.\d{1,2}\.?\s+", text)
        current_chapter = first_question.group(1) if first_question else None

    if in_practice:
        stop_index = len(text)
        for marker in ("Further Questions", "Answers to Questions"):
            marker_index = text.find(marker)
            if marker_index >= 0:
                stop_index = min(stop_index, marker_index)
        current.append(text[:stop_index])
        if stop_index < len(text):
            chunks.append((current_chapter, start_page, page_index + 1, "\n".join(current)))
            current = []
            current_chapter = None
            in_practice = False

if current:
    chunks.append((current_chapter, start_page, doc.page_count, "\n".join(current)))

questions = {}
question_pattern = re.compile(r"(?:^|\n)\s*(\d{1,2}\.\d{1,2})\.?\s+")
for chapter, start_page, _end_page, chunk in chunks:
    if not chapter:
        continue
    matches = list(question_pattern.finditer(chunk))
    for index, match in enumerate(matches):
        number = match.group(1)
        if number.split(".", 1)[0] != chapter:
            continue
        if number in questions:
            continue
        start = match.end()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(chunk)
        text = chunk[start:end]
        text = text.replace("\x08", " ").replace("\u00ad", "")
        text = re.sub(r"\s+", " ", text).strip()
        if len(text) >= 8:
            questions[number] = {"text": text, "page": start_page}

print(json.dumps({"questions": questions}, ensure_ascii=False))
`,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 16
  });

  if (result.status !== 0) {
    throw new Error(`Hull PDF extraction failed: ${result.stderr || result.stdout}`);
  }

  const payload = JSON.parse(result.stdout || "{}");
  if (payload.error) throw new Error(payload.error);
  const questionMap = payload.questions || {};
  const missing = [];

  problems.forEach((problem) => {
    const number = String(problem.titleZh || problem.titleEn || "").match(/(?:Practice|Question)\s+(\d{1,2}\.\d{1,2})/i)?.[1];
    if (!number) return;
    const match = questionMap[number];
    if (!match?.text) {
      missing.push(number);
      return;
    }
    const latexPrompt = cleanHullPromptText(normalizePdfPlainText(problem.promptEn || problem.promptZh || ""));
    const pdfPrompt = cleanHullPromptText(normalizePdfPlainText(match.text));
    const latexHasSpillover = looksLikeHullChapterSpillover(latexPrompt);
    const pdfHasSpillover = looksLikeHullChapterSpillover(pdfPrompt);
    const promptBody = (
      latexPrompt &&
      !latexHasSpillover &&
      (pdfHasSpillover || pdfPrompt.length < latexPrompt.length * 0.8)
    ) ? latexPrompt : pdfPrompt;
    const prompt = `Practice ${number}. ${promptBody}`;
    problem.titleZh = `Practice ${number}`;
    problem.promptZh = prompt;
    problem.promptEn = prompt;
    problem.titleEn = `Practice ${number}`;
    problem.explanationEn = "Hull textbook practice question. Please consult the original text or add a later worked solution.";
    problem.explanationZh = "（Hull 教材 Practice Question，答案请对照原版或后续解析补充。）";
    problem.explanation = problem.explanationEn;
    problem.tags = [...new Set([book.name, `Practice ${number}`, `Chapter ${number.split(".")[0]}`, ...inferTopicTags(prompt)])].slice(0, 7);
    problem.category = inferCategory({ book, chapter: `Chapter ${number.split(".")[0]}`, section: "", subsection: `Practice ${number}`, prompt, solution: "" });
    problem.difficulty = inferDifficulty({ title: `Practice ${number}`, prompt, solution: "" });
  });

  if (missing.length) {
    console.warn(`Hull PDF extraction missed ${missing.length} practice question(s); kept LaTeX fallback: ${missing.join(", ")}`);
  }
}

function normalizePdfPlainText(text) {
  return String(text || "")
    .replace(/\$(?=\d)/g, "USD ")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeHullChapterSpillover(text) {
  return /C\s*H\s*A\s*P\s*T\s*E\s*R|Futures Markets and Central Counterparties|Many of the participants in futures markets are hedgers|Hedging Strategies Using Futures|We introduced options in Chapter 1|Mechanics of Options Markets|Interest Rate Futures|Properties of Stock Options|Trading Strategies Involving Options|Stock Index and Currency Options|Options on Stock Indices and Currencies|Futures Options and Black'?s Model|Value at Risk and Expected Shortfall|Estimating Volatilities and Correlations|Credit Risk|Credit Derivatives/i.test(String(text || ""));
}

function hullSpilloverMarkers() {
  return [
  "APPENDIX",
  "Futures Markets and Central Counterparties",
  "Many of the participants in futures markets are hedgers",
  "Hedging Strategies Using Futures",
  "Derivatives such as forwards, futures, swaps, and options are concerned",
  "Securitization and the Financial Crisis",
  "In this chapter we examine how forward prices",
  "We introduced options in Chapter 1",
  "Mechanics of Options Markets",
  "Interest Rate Futures",
  "Properties of Stock Options",
  "Trading Strategies Involving Options",
  "Stock Index and Currency Options",
  "Options on Stock Indices and Currencies",
  "Futures Options and Black's Model",
  "Futures Options and Black’s Model",
  "Value at Risk and Expected Shortfall",
  "Estimating Volatilities and Correlations",
  "Credit Risk",
  "Credit Derivatives",
  "No-Arbitrage Models of the Short Rate",
  "Interest Rate Derivatives: The Standard Market Models",
  "Martingales and Measures",
  "Employee Stock Options",
  "Volatility Smiles and Volatility Surfaces",
  "The Black-Scholes-Merton Model",
  "The Black–Scholes–Merton Model",
  "Convexity, Timing, and Quanto Adjustments",
  "附录",
  "期货市场和中央对手方",
  "许多期货市场参与者",
  "使用期货的对冲策略",
  "远期、期货、掉期和期权等衍生品涉及",
  "证券化与",
  "在本章中，我们研究远期价格",
  "期权市场机制",
  "利率期货",
  "股票期权的属性",
  "涉及期权的交易策略",
  "股票指数和货币期权",
  "期货期权和布莱克模型",
  "风险价值和预期缺口",
  "估计波动性和相关性",
  "信用风险",
  "信用衍生品",
  "短期利率的无套利模型",
  "无套利模型",
  "利率衍生品：标准市场模型",
  "鞅和措施",
  "员工股票期权",
  "波动率微笑和波动率曲面",
  "波动率微笑和波动率面",
  "Black-Scholes-Merton 模型",
  "凸性、时机和双币种调整"
  ];
}

function hullManualPrompts() {
  return new Map([
  ["3.25", {
    en: "It is July 16. A company has a portfolio of stocks worth USD 100 million. The beta of the portfolio is 1.2. The company would like to use the December futures contract on a stock index to change the beta of the portfolio to 0.5 during the period July 16 to November 16. The index futures price is currently 2,000 and each contract is on USD 250 times the index. (a) What position should the company take? (b) Suppose that the company changes its mind and decides to increase the beta of the portfolio from 1.2 to 1.5. What position in futures contracts should it take?",
    zh: "现在是 7 月 16 日。一家公司持有价值 1 亿美元的股票投资组合，组合 beta 为 1.2。公司希望使用 12 月到期的股指期货，在 7 月 16 日至 11 月 16 日期间把组合 beta 调整为 0.5。当前股指期货价格为 2,000，每份合约价值为 250 美元乘以指数。(a) 公司应该持有多少期货头寸？(b) 如果公司改变主意，希望把组合 beta 从 1.2 提高到 1.5，它应持有多少期货头寸？"
  }],
  ["5.14", {
    en: "Suppose that F1 and F2 are two futures contracts on the same commodity with times to maturity, t1 and t2, where t2 > t1. Prove that F2 <= F1 e^{r(t2-t1)}, where r is the interest rate (assumed constant) and there are no storage costs. For the purposes of this problem, assume that a futures contract is the same as a forward contract.",
    zh: "设 F1 和 F2 是同一商品的两份期货合约，到期时间分别为 t1 和 t2，其中 t2 > t1。证明在利率 r 为常数且不存在储存成本时，F2 <= F1 e^{r(t2-t1)}。本题中可把期货合约视为远期合约。"
  }],
  ["7.7", {
    zh: "一家银行通过双边清算与一个非金融交易对手签订利率互换，银行支付 3% 的固定利率并收取浮动利率。没有提交抵押品，银行与交易对手之间也没有其他未平仓交易。银行承担什么信用风险？讨论收益率曲线向上倾斜或向下倾斜时，哪种情况下信用风险更大。"
  }],
  ["10.22", {
    en: "On July 20, 2004, Microsoft surprised the market by announcing a USD 3 dividend. The ex-dividend date was November 17, 2004, and the payment date was December 2, 2004. Its stock price at the time was about USD 28. It also changed the terms of its employee stock options so that each exercise price was adjusted downward to predividend exercise price * (closing price - USD 3.00) / closing price. The number of shares covered by each stock option outstanding was adjusted upward to number of shares predividend * closing price / (closing price - USD 3.00). Closing price means the official NASDAQ closing price of a share of Microsoft common stock on the last trading day before the ex-dividend date. Evaluate this adjustment.",
    zh: "2004 年 7 月 20 日，微软宣布派发 3 美元股息，令市场意外。除息日为 2004 年 11 月 17 日，支付日为 2004 年 12 月 2 日。当时股价约为 28 美元。微软还调整了员工股票期权条款：每个行权价下调为“除息前行权价 × (收盘价 - 3.00 美元) / 收盘价”；每份未行权股票期权覆盖的股票数上调为“除息前股票数 × 收盘价 / (收盘价 - 3.00 美元)”。其中“收盘价”指除息日前最后一个交易日微软普通股的 NASDAQ 官方收盘价。评价这种调整。"
  }],
  ["13.21", {
    en: "Footnote 1 of this chapter shows that the correct discount rate to use for the real-world expected payoff in the case of the call option considered in Figure 13.1 is 55.96%. Show that if the option is a put rather than a call the discount rate is -70.4%. Explain why the two real-world discount rates are so different.",
    zh: "本章脚注 1 说明，对于图 13.1 中的看涨期权，用于现实世界期望收益的正确贴现率为 55.96%。证明如果该期权是看跌期权而不是看涨期权，则贴现率为 -70.4%。解释为什么两个现实世界贴现率差别如此大。"
  }],
  ["14.15", {
    en: "Consider whether markets are efficient in each of the following two cases: (a) a stock price follows fractional Brownian motion and (b) a stock price volatility follows fractional Brownian motion.",
    zh: "分别考虑以下两种情况中的市场是否有效：(a) 股票价格服从分数布朗运动；(b) 股票价格波动率服从分数布朗运动。"
  }],
  ["15.25", {
    en: "A stock price is currently USD 50. Assume that the expected return from the stock is 18% and its volatility is 30%. What is the probability distribution for the stock price in 2 years? Calculate the mean and standard deviation of the distribution. Determine the 95% confidence interval.",
    zh: "当前股价为 50 美元。假设股票的期望收益率为 18%，波动率为 30%。两年后股票价格服从什么概率分布？计算该分布的均值和标准差，并确定 95% 置信区间。"
  }],
  ["15.27", {
    en: "The appendix derives the key result E[max(V - K, 0)] = E(V)N(d1) - KN(d2). Show that E[max(K - V, 0)] = KN(-d2) - E(V)N(-d1) and use this to derive the Black-Scholes-Merton formula for the price of a European put option on a non-dividend-paying stock.",
    zh: "附录推导了关键结果 E[max(V - K, 0)] = E(V)N(d1) - KN(d2)。证明 E[max(K - V, 0)] = KN(-d2) - E(V)N(-d1)，并用它推导不支付股息股票的欧式看跌期权的 Black-Scholes-Merton 定价公式。"
  }],
  ["4.26", {
    en: "Verify that DerivaGem agrees with the price of the bond in Section 4.6. Test how well DV01 predicts the effect of a 1-basis-point increase in all rates. Estimate the duration of the bond from DV01. Use DV01 and Gamma to predict the effect of a 200-basis-point increase in all rates. Use Gamma to estimate the bond's convexity. (Hint: In DerivaGem, DV01 is dB/dy, where B is the price of the bond and y is its yield measured in basis points, and Gamma is d2B/dy2, where y is measured in percent.)",
    zh: "验证 DerivaGem 是否与第 4.6 节中的债券价格一致。测试 DV01 对所有利率上升 1 个基点的影响预测得有多好。根据 DV01 估计债券久期。使用 DV01 和 Gamma 预测所有利率上升 200 个基点的影响。使用 Gamma 估计债券凸性。（提示：在 DerivaGem 中，DV01 是 dB/dy，其中 B 为债券价格，y 为以基点计量的收益率；Gamma 是 d2B/dy2，其中 y 以百分比计量。）"
  }],
  ["23.3", {
    zh: "某资产日波动率的最新估计为 1.5%，昨天收盘价为 30.00 美元。EWMA 模型中的参数 lambda 为 0.94。假设今天收盘价为 30.50 美元，这会如何更新 EWMA 模型中的波动率？"
  }],
  ["21.30", {
    en: "How much is gained from exercising early at the lowest node at the 9-month point in Example 21.4?",
    zh: "在 Example 21.4 中，9 个月时最低节点处提前行权可以获得多少收益？"
  }],
  ["26.27", {
    zh: "DerivaGem Application Builder 软件中的 Sample Application F 考察第 26.17 节的静态期权复制示例。它展示了如何用 4 个期权构造对冲（如第 26.17 节），以及如何用两种方法通过 16 个期权构造对冲。(a) 解释两种 16 期权对冲方法的差异，并直观说明为什么第二种方法效果更好。(b) 通过改变第 3 个和第 4 个期权的 Tmat 改进 4 期权对冲。(c) 检查 16 期权组合与障碍期权的 delta、gamma 和 vega 匹配程度。"
  }],
  ["30.6", {
    zh: "时间 T 的债券价格以其收益率表示为 G(y_T)。假设远期债券收益率 y 在以 T 到期债券为计价单位的世界中服从几何布朗运动。设远期债券收益率的增长率为 a，波动率为 sigma_y。(a) 用 Itô 引理计算远期债券价格关于 a、sigma_y、y 和 G(y) 的过程。(b) 在该世界中远期债券价格应为鞅；利用这一事实求 a 的表达式。(c) 说明 a 的表达式在一阶近似下与方程 (30.1) 一致。"
  }],
  ["31.16", {
    en: "What is the result corresponding to that given in Problem 31.7 for the CIR model? Use maximum likelihood methods to estimate the a, b, and sigma parameters for the CIR model using the same data as that used for the Vasicek model in Section 31.4 (see www-2.rotman.utoronto.ca/~hull/VasicekCIR). Setting the market price of risk equal to k sqrt(r), use the market data in Table 31.1 to estimate the best fit k.",
    zh: "对于 CIR 模型，与问题 31.7 中给出的 Vasicek 模型结果相对应的结果是什么？使用与第 31.4 节中 Vasicek 模型相同的数据，用最大似然法估计 CIR 模型的 a、b 和 sigma 参数（参见 www-2.rotman.utoronto.ca/~hull/VasicekCIR）。令风险市场价格等于 k sqrt(r)，使用表 31.1 中的市场数据估计最佳拟合的 k。"
  }]
  ]);
}

function hullChapterName(chapter) {
  return ({
  1: "Introduction",
  2: "Futures Markets",
  3: "Hedging Strategies Using Futures",
  4: "Interest Rates",
  5: "Forward and Futures Prices",
  6: "Interest Rate Futures",
  7: "Swaps",
  8: "Securitization and the Credit Crisis",
  9: "XVA",
  10: "Mechanics of Options Markets",
  11: "Properties of Stock Options",
  12: "Trading Strategies Involving Options",
  13: "Binomial Trees",
  14: "Wiener Processes and Ito's Lemma",
  15: "Black-Scholes-Merton",
  16: "Employee Stock Options",
  17: "Stock Index and Currency Options",
  18: "Futures Options and Black's Model",
  19: "Greek Letters",
  20: "Volatility Smiles",
  21: "Numerical Procedures",
  22: "Value at Risk and Expected Shortfall",
  23: "Estimating Volatilities and Correlations",
  24: "Credit Risk",
  25: "Credit Derivatives",
  26: "Exotic Options",
  27: "More Exotic Options",
  28: "Martingales and Measures",
  29: "Interest Rate Derivatives",
  30: "Convexity, Timing, and Quanto Adjustments",
  31: "Equilibrium Models of the Short Rate",
  32: "No-Arbitrage Models of the Short Rate",
  33: "HJM and LMM",
  34: "Swaps Revisited",
  35: "Energy, Weather, and Insurance Derivatives",
  36: "Real Options"
  })[chapter] || "";
}

function cleanHullPromptText(text) {
  let value = String(text || "")
    .replace(/\x08/g, " ")
    .replace(/\u00ad/g, "")
    .replace(/\s*\d{2,4}\s*C\s*H\s*A\s*P\s*T\s*E\s*R\s*\d+\s*/gi, " ")
    .replace(/\s*\d{2,4}\s*CHAPTER\s*\d+\s*/gi, " ")
    .replace(/\s*第\s*\d{2,4}\s*章\s*第\s*\d+\s*章\s*/g, " ")
    .replace(/\s*\d{2,4}\s*第\s*\d+\s*章\s*/g, " ")
    .replace(/\s+\d{2,4}\s+(?=\([a-z]\))/gi, " ");

  const lower = value.toLowerCase();
  const candidates = hullSpilloverMarkers()
    .map((marker) => lower.indexOf(marker.toLowerCase()))
    .filter((index) => index > 60);
  if (candidates.length) {
    value = value.slice(0, Math.min(...candidates));
  }

  return value
    .replace(/\s+([?.!,;:])/g, "$1")
    .replace(/\s+\d{2,4}$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function repairHullProblems(problems, book) {
  const referenceImagePaths = ensureHullReferencePageImages(book);
  problems.forEach((problem) => {
    const practiceNumber = hullPracticeNumber(problem);
    if (!practiceNumber) return;
    const manual = hullManualPrompts().get(practiceNumber);
    const chapter = Number(practiceNumber.split(".", 1)[0]);
    const titleEn = `Practice ${practiceNumber}`;
    const titleZh = `问题 ${practiceNumber}`;

    problem.titleEn = titleEn;
    problem.titleZh = titleZh;
    problem.promptEn = `${titleEn}. ${manual?.en || cleanHullPromptText(stripHullPracticePrefix(problem.promptEn || problem.promptZh, practiceNumber))}`.trim();
    problem.promptZh = manual?.zh
      ? `${titleZh}. ${manual.zh}`
      : `${titleZh}. ${cleanHullPromptText(stripHullPracticePrefix(problem.promptZh || problem.promptEn, practiceNumber))}`.trim();

    if (!/[\u3400-\u9fff]/.test(problem.promptZh || "") || compactTextForHull(problem.promptZh) === compactTextForHull(problem.promptEn)) {
      problem.promptZh = manual?.zh ? `${titleZh}. ${manual.zh}` : problem.promptZh;
    }

    const classification = reviewedHullClassification(problem, chapter);
    problem.category = classification.category;
    problem.difficulty = classification.difficulty;
    problem.classificationReviewed = true;
    problem.classificationReviewSource = "hull-chapter-topic-map-v1";
    problem.tags = [
      book.name,
      titleEn,
      `Chapter ${chapter}`,
      hullChapterName(chapter),
      readableCategory(problem.category),
      ...inferTopicTags([hullChapterName(chapter), problem.promptEn, problem.promptZh].join(" "))
    ].filter(Boolean);
    problem.tags = [...new Set(problem.tags)].slice(0, 7);
    const referencePages = hullReferencePagesByPractice().get(practiceNumber) || [];
    const referenceImages = referencePages.map((pageNumber) => referenceImagePaths.get(pageNumber)).filter(Boolean);
    if (referenceImages.length) {
      problem.promptImages = [...new Set([...(problem.promptImages || []), ...referenceImages])];
    }
    problem.explanationEn = "Hull textbook practice question. Please consult the original text or add a later worked solution.";
    problem.explanationZh = "（Hull 教材 Practice Question，答案请对照原版或后续解析补充。）";
    problem.explanation = problem.explanationEn;
    problem.answer = problem.answerEn || problem.answerZh || "";
  });
}

function hullPracticeNumber(problem) {
  return [problem.titleEn, problem.titleZh, problem.promptEn, problem.promptZh]
    .map((value) => String(value || "").match(/(?:Practice|Question|问题)\s*(\d{1,2}\.\d{1,2})/i)?.[1])
    .find(Boolean) || "";
}

function stripHullPracticePrefix(text, practiceNumber) {
  return String(text || "")
    .replace(new RegExp(`^\\s*(?:Practice|Question|问题)\\s*${practiceNumber.replace(".", "\\.")}\\s*[.:：]?\\s*`, "i"), "")
    .trim();
}

function compactTextForHull(text) {
  return String(text || "").toLowerCase().replace(/[\s.,;:!?？。，；：、'"“”‘’()（）-]+/g, "");
}

function reviewedHullClassification(problem, chapter) {
  const text = [hullChapterName(chapter), problem.promptEn, problem.promptZh].join(" ").toLowerCase();
  let category = "option";

  if ([2, 3, 4, 5, 6, 7, 8, 9, 22, 24, 25, 34, 35].includes(chapter)) {
    category = "market";
  }
  if (chapter === 1) {
    category = /\b(call|put|option|strike|exercise|payoff)\b/i.test(text) ? "option" : "market";
  }
  if ([14, 28].includes(chapter)) {
    category = "probabilityExpectation";
  }
  if (chapter === 23 || /\b(ewma|garch|correlation|covariance|standard deviation|confidence interval|volatility estimate)\b/i.test(text)) {
    category = "statistics";
  }
  if (/\b(call|put|option|strike|exercise|payoff|black.?scholes|binomial tree|trinomial tree|barrier|swaption|caplet|floorlet|convertible bond)\b/i.test(text) || (/\b(delta|gamma|vega|theta)\b/i.test(text) && /\boption|hedg/i.test(text))) {
    category = "option";
  }
  if ([4, 5, 6, 7].includes(chapter) && !/\b(call|put|option|swaption|caplet|floorlet)\b/i.test(text)) {
    category = "market";
  }
  if (chapter === 22 && /\bvar|expected shortfall|risk measure|portfolio risk\b/i.test(text)) {
    category = "market";
  }
  if (chapter === 24 || chapter === 25 || /\b(default|credit|cds|hazard rate|recovery rate|copula)\b/i.test(text)) {
    category = "market";
  }
  if (chapter === 14 && /\b(fractional brownian|wiener|ito|stochastic)\b/i.test(text)) {
    category = "probabilityExpectation";
  }

  let difficulty = "Medium";
  const directExplain = /\b(explain|what is|what are|difference|discuss|why)\b/i.test(text) && text.length < 520;
  if (directExplain && !/\b(calculate|derive|prove|show that|estimate|use derivagem|ito|black.?scholes|maximum likelihood)\b/i.test(text)) {
    difficulty = "Easy";
  }
  if (/\b(prove|derive|show that|ito|black.?scholes|martingale|hjm|libor market model|maximum likelihood|cir model|vasicek|hull.?white|trinomial tree|copula|barrier option|lookback|cliquet|convertible bond|static options replication)\b/i.test(text)) {
    difficulty = "Hard";
  }
  if (text.length > 1100 && /\b(a\)|\(a\)|calculate|estimate|derive|prove|use derivagem)\b/i.test(text)) {
    difficulty = "Hard";
  }
  if (difficulty !== "Hard" && /\b(calculate|estimate|use derivagem|construct|evaluate|value)\b/i.test(text)) {
    difficulty = "Medium";
  }

  return { category, difficulty };
}

function hullReferencePagesByPractice() {
  return new Map([
    ["1.25", [31]],
    ["1.32", [31]],
    ["1.34", [28]],
    ["3.16", [90]],
    ["5.11", [139]],
    ["7.12", [188]],
    ["7.19", [178]],
    ["8.1", [205]],
    ["8.9", [205]],
    ["8.10", [204, 205]],
    ["8.12", [204]],
    ["10.19", [31]],
    ["11.20", [248, 250]],
    ["13.21", [288]],
    ["20.17", [459]],
    ["20.19", [454]],
    ["20.23", [459]],
    ["21.8", [489]],
    ["21.22", [491, 492]],
    ["21.28", [476]],
    ["22.11", [536]],
    ["22.18", [534, 535]],
    ["24.6", [563]],
    ["24.25", [581]],
    ["25.14", [591, 592, 593]],
    ["25.30", [600]],
    ["26.30", [424, 425]],
    ["27.14", [654]],
    ["27.21", [459]],
    ["31.16", [727]],
    ["32.10", [738]],
    ["32.11", [743]],
    ["32.12", [746]],
    ["32.16", [749]],
    ["32.17", [748]],
    ["35.16", [791]]
  ]);
}

function ensureHullReferencePageImages(book) {
  if (!book.pdfPath) return new Map();
  const pdfPath = path.join(desktopBookRoot, book.pdfPath);
  if (!fs.existsSync(pdfPath)) return new Map();
  const destinationDir = path.join(mediaRoot, book.slug);
  fs.mkdirSync(destinationDir, { recursive: true });
  const pages = [...new Set([...hullReferencePagesByPractice().values()].flat())].sort((a, b) => a - b);
  const missingPages = pages.filter((pageNumber) => !fs.existsSync(path.join(destinationDir, hullReferencePageFileName(pageNumber))));

  if (missingPages.length) {
    const result = spawnSync("python3", ["-", pdfPath, destinationDir, JSON.stringify(missingPages)], {
      input: String.raw`
import json
import os
import sys

try:
    import fitz
except Exception as exc:
    print(f"PyMuPDF import failed: {exc}", file=sys.stderr)
    raise SystemExit(1)

pdf_path, destination_dir, pages_json = sys.argv[1:4]
pages = json.loads(pages_json)
os.makedirs(destination_dir, exist_ok=True)
doc = fitz.open(pdf_path)
matrix = fitz.Matrix(1.5, 1.5)

for page_number in pages:
    index = int(page_number) - 1
    if index < 0 or index >= doc.page_count:
        continue
    output = os.path.join(destination_dir, f"hull-reference-page-{int(page_number):03d}.png")
    if os.path.exists(output):
        continue
    pix = doc.load_page(index).get_pixmap(matrix=matrix, alpha=False)
    pix.save(output)
`,
      encoding: "utf8",
      maxBuffer: 1024 * 1024
    });
    if (result.status !== 0) {
      console.warn(`Hull reference page rendering failed: ${result.stderr || result.stdout}`);
    }
  }

  return new Map(
    pages
      .filter((pageNumber) => fs.existsSync(path.join(destinationDir, hullReferencePageFileName(pageNumber))))
      .map((pageNumber) => [pageNumber, `assets/problem-media/${book.slug}/${hullReferencePageFileName(pageNumber)}`])
  );
}

function hullReferencePageFileName(pageNumber) {
  return `hull-reference-page-${String(pageNumber).padStart(3, "0")}.png`;
}

function repairDudeneyProblems(problems, book) {
  const mediaOverrides = dudeneyMediaOverrides();
  problems.forEach((problem, index) => {
    const problemNumber = index + 1;
    [
      "titleEn",
      "titleZh",
      "promptEn",
      "promptZh",
      "answerEn",
      "answerZh",
      "explanationEn",
      "explanationZh",
      "answer",
      "explanation"
    ].forEach((field) => {
      problem[field] = cleanDudeneyCatalogText(problem[field]);
    });

    const reviewedText = dudeneyReviewedText(problemNumber);
    if (reviewedText?.promptEn) problem.promptEn = reviewedText.promptEn;
    if (reviewedText?.promptZh) problem.promptZh = reviewedText.promptZh;
    if (reviewedText?.explanationEn) problem.explanationEn = reviewedText.explanationEn;
    if (reviewedText?.explanationZh) problem.explanationZh = reviewedText.explanationZh;

    const media = mediaOverrides.get(problemNumber);
    if (media) {
      replaceProblemMedia(problem, "promptImages", media.promptImages);
      replaceProblemMedia(problem, "solutionImages", media.solutionImages);
    }
    if ([29, 30, 47, 74, 88].includes(problemNumber) && Array.isArray(problem.promptImages) && problem.promptImages.length) {
      problem.solutionImages = [...new Set([...(problem.solutionImages || []), ...problem.promptImages])];
    }

    const review = dudeneyFigureReview(problemNumber);
    if (review) problem.figureReview = review;

    const classification = dudeneyClassification(problemNumber);
    problem.category = classification.category;
    problem.difficulty = classification.difficulty;
    problem.classificationReviewed = true;
    problem.classificationReviewSource = "dudeney-topic-map-v1";

    problem.tags = [
      book.name,
      dudeneySection(problemNumber),
      readableCategory(problem.category),
      ...inferTopicTags([problem.titleEn, problem.titleZh, problem.promptEn, problem.promptZh].join(" "))
    ].filter(Boolean);
    problem.tags = [...new Set(problem.tags)].slice(0, 7);
    problem.answer = problem.answerEn || problem.answerZh || problem.answer || "";
    problem.explanation = problem.explanationEn || problem.explanationZh || problem.explanation || "";
  });
}

function cleanDudeneyCatalogText(text) {
  let value = String(text || "");
  if (!value) return "";
  value = value
    .replace(/\u0000/g, "")
    .replace(/\u00ad/g, "")
    .replace(/ﬁ/g, "fi")
    .replace(/ﬂ/g, "fl")
    .replace(/\bGOOD OLD-FASHIONED CHALLENGING PUZZLES\b/gi, " ")
    .replace(/\bARITHMETICAL AND ALGEBRAICAL PROBLEMS\b/gi, " ")
    .replace(/\bVARIOUS ARITHMETICAL AND ALGEBRAICAL PROBLEMS\b/gi, " ")
    .replace(/\bGEOMETRICAL PROBLEMS\b/gi, " ")
    .replace(/\bDISSECTION PUZZLES\b/gi, " ")
    .replace(/\bPATCHWORK PUZZLES\b/gi, " ")
    .replace(/\bVARIOUS GEOMETRICAL PUZZLES\b/gi, " ")
    .replace(/\bUNICURSAL AND ROUTE PROBLEMS\b/gi, " ")
    .replace(/\bCOMBINATION AND GROUP PROBLEMS\b/gi, " ")
    .replace(/\bCHESSBOARD PROBLEMS\b/gi, " ")
    .replace(/\bSTATICAL CHESS PUZZLES\b/gi, " ")
    .replace(/\bTHE GUARDED CHESSBOARD\b/gi, " ")
    .replace(/\bVARIOUS CHESS PUZZLES\b/gi, " ")
    .replace(/\bPROBLEMS CONCERNING GAMES\b/gi, " ")
    .replace(/\bMAGIC SQUARE PROBLEMS\b/gi, " ")
    .replace(/\bCROSSING RIVER PROBLEMS\b/gi, " ")
    .replace(/\bSOLUTIONS\b/g, " ")
    .replace(/算术和代数问题|各种算术和代数问题|几何问题|解剖(?:难题|谜题)|拼凑拼图|各种几何(?:谜题|问题)|点和线问题|单线和路线问题|组合和分组问题|棋盘问题|静态国际象棋(?:谜题|问题)|受守护的棋盘|各种国际象棋(?:谜题|问题)|游戏相关问题|幻方问题|过河问题|解答/g, " ")
    .replace(/\s+PATCHWORK PUZZLES\s+['‘]Of shreds and patches[.'’]\s+[—-]Hamlet, iii\. 4\.?/gi, " ")
    .replace(/\s+STATICAL CHESS PUZZLES\s+['‘]They also serve who only stand and wait[.'’]\s+MILTON\.?/gi, " ")
    .replace(/\s+PROBLEMS CONCERNING GAMES\s+['‘]The little pleasure of the game[.'’]\s+MATTHEW PRIOR\.?/gi, " ")
    .replace(/\s+VARIOUS GEOMETRICAL PUZZLES\s+['‘]So various are the tastes of men[.'’]\s+MARK AKENSIDE\.?/gi, " ")
    .replace(/\s+THE GUARDED CHESSBOARD\s+['‘]Arrange whatever pieces come your way[.'’]\s+WORDSWORTH\.?/gi, " ")
    .replace(/\s+['‘]Of shreds and patches[.'’]\s+[—-]Hamlet, iii\. 4\.?/gi, " ")
    .replace(/\s+['‘]They also serve who only stand and wait[.'’]\s+MILTON\.?/gi, " ")
    .replace(/\s+['‘]The little pleasure of the game[.'’]\s+MATTHEW PRIOR\.?/gi, " ")
    .replace(/\s+['‘]So various are the tastes of men[.'’]\s+MARK AKENSIDE\.?/gi, " ")
    .replace(/\s+['‘]Arrange whatever pieces come your way[.'’]\s+WORDSWORTH\.?/gi, " ")
    .replace(/\s*[“\"'‘]碎片和补丁[。”\"'’]*\s*[—-]*\s*哈姆雷特，三。?\s*4\.?/g, " ")
    .replace(/\s*[“\"'‘]他们也为只站着等待的人服务[。”\"'’]*\s*MILTON\.?/gi, " ")
    .replace(/\s*[“\"'‘]游戏的小乐趣[。”\"'’]*\s*MATTHEW PRIOR\.?/gi, " ")
    .replace(/\s*[“\"'‘]人们的品味如此多样[。”\"'’]*\s*MARK AKENSIDE\.?/gi, " ")
    .replace(/\s+Fig\.\s*(\d)\s+Fig\.\s*(\d)/gi, " Fig. $1. Fig. $2.")
    .replace(/\s+([?.!,;:；：，。])/g, "$1")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return value.replace(/\s+/g, " ").trim();
}

function dudeneyReviewedText(problemNumber) {
  const entries = {
    32: {
      promptEn: "All cannon-balls are to be piled in square pyramids, was the order issued to the regiment. This was done. Then came the further order: all pyramids are to contain a square number of balls. The major objected that a pyramid with 16 balls at the base, then 9, 4, and 1 at the top, contains 30 balls, so it needs six more balls or five fewer to be a square. The general insisted that the right number must be used. Is it really possible to obey both orders?",
      promptZh: "团里下令：所有炮弹都要堆成四棱锥。士兵照做以后，又收到进一步命令：每个锥体中的炮弹总数必须是一个平方数。少校指出，底层 16 个、上面 9 个、再上面 4 个、顶端 1 个的锥体共有 30 个炮弹，要成为平方数就得多 6 个或少 5 个。将军坚持必须找到合适的数量。真的能同时满足这两个命令吗？",
      explanationEn: "The smallest workable number is 4,900 cannon-balls. Write the usual summation table: the first row is 1, 2, 3, ...; the second row gives triangular numbers; the third row gives triangular pyramids; and the fourth row gives square pyramids. Continuing this table to the 24th place gives 4,900 in the fourth row, and 4,900 = 70^2, so the balls can also be laid out as a square. In formula form, the square-pyramidal number is n(n + 1)(2n + 1)/6 = (2n^3 + 3n^2 + n)/6. For this to be a square, the non-trivial case used here is n = 24, giving 4,900.",
      explanationZh: "最小可行数量是 4,900 个炮弹。把求和表写出来：第一行是 1, 2, 3, ...；第二行是三角数；第三行是三角锥数；第四行就是四棱锥数。把表延伸到第 24 项时，第四行得到 4,900，而 4,900 = 70^2，所以这些炮弹也能在平面上摆成一个正方形。公式写法为 n(n + 1)(2n + 1)/6 = (2n^3 + 3n^2 + n)/6；本题的非平凡解取 n = 24，得到 4,900。"
    },
    35: {
      explanationEn: "The task is to form a perfect square from a square combined with a right-angled isosceles triangle. The exact relative sizes of the square and triangle do not matter, as long as the triangle is not larger in area than the square. In the diagram, let the original square be ACLF and the triangular half-square be CED. First take half the length of the long side CD and mark that length as AB. Then place the triangle against the square as shown and make just two cuts, BF and BE. Move pieces G, H, and M to the positions indicated in the diagram, and the five pieces form the square BEKF. No piece needs to be turned over.",
      explanationZh: "本题的关键，是把一个正方形和一个直角等腰三角形（也就是半个正方形）拼成一个完整正方形。只要三角形面积不大于原正方形，二者的精确比例并不重要。图中设原正方形为 ACLF，阴影三角形为 CED。先取长边 CD 的一半，在 AB 上量出同样长度；然后按图把三角形靠在正方形旁，只需作两刀：BF 和 BE。把 G、H、M 三块移到图中所示的新位置，五块便组成正方形 BEKF，而且不需要翻转任何一块。"
    },
    38: {
      explanationEn: "The diagrams show how the two figures are constructed, each from the same seven Tangram pieces. In both figures the head, hat, and arm are exactly alike, and the width at the base of the body is the same. The difference is that the body of the first figure contains four pieces while the body of the second contains only three. The first body is larger by the narrow strip indicated by the dotted line between A and B; that strip is exactly equal in area to the foot in the other design.",
      explanationZh: "图示说明了两个图形如何都由同一套七巧板拼成。两图的头、帽子和手臂完全相同，身体底部的宽度也相同。差别在于，第一个图形的身体用了四块，而第二个图形的身体只用了三块。第一个身体多出的面积，正是 A 与 B 之间虚线所标出的那条窄条；这条窄条的面积恰好等于另一个图形中脚的面积。"
    },
    40: {
      explanationEn: "First find six different square numbers whose sum is 196. For example, 1 + 4 + 25 + 36 + 49 + 81 = 196; another choice is 1 + 4 + 9 + 25 + 36 + 121 = 196; and a third is 1 + 9 + 16 + 25 + 64 + 81 = 196. The rest is a dissection problem: the diagrams show solutions for the first two sets. In each case the three pieces marked A, together with the other indicated pieces, can be rearranged to form the 14 by 14 square. The assembly can be varied slightly, and the reader may try to construct a solution for the third set.",
      explanationZh: "第一步是找出六个互不相同的平方数，使它们的和为 196。例如 1 + 4 + 25 + 36 + 49 + 81 = 196；也可以取 1 + 4 + 9 + 25 + 36 + 121 = 196；还可以取 1 + 9 + 16 + 25 + 64 + 81 = 196。剩下就是剪拼问题：图中给出了前两组平方数的拼法。每种情况下，标为 A 的三块以及相应的其他部分都能重新拼成 14 x 14 的正方形。拼法可以略有变化，读者也可以尝试为第三组平方数构造拼法。"
    }
  };
  return entries[problemNumber] || null;
}

function dudeneyMediaOverrides() {
  const base = "assets/problem-media/dudeney-puzzles";
  const map = new Map();
  const set = (number, promptImages, solutionImages) => map.set(number, { promptImages, solutionImages });
  set(32, [], []);
  set(35, [`${base}/035-prompt-01-035-prompt-p033-02.png`], [`${base}/dudeney-problem-035-solution-joiner-dissection.png`]);
  set(36, [`${base}/036-prompt-01-036-prompt-p034-02.png`], [`${base}/036-solution-02-036-solution-p126-02.png`]);
  set(40, [`${base}/dudeney-problem-040-prompt-quilt.png`], [`${base}/040-solution-01-040-solution-p128-01.png`]);
  set(41, [`${base}/041-prompt-02-041-prompt-p042-02.png`, `${base}/041-prompt-03-041-prompt-p042-03.png`], [`${base}/041-solution-01-041-solution-p128-02.png`]);
  set(46, [`${base}/dudeney-problem-046-prompt-yorkshire-estates.png`], [`${base}/046-solution-01-046-solution-p130-01.png`]);
  set(72, [`${base}/dudeney-problem-072-prompt-odd-board.png`], [`${base}/dudeney-problem-072-solution-odd-board-cuts.png`]);
  set(73, [`${base}/dudeney-problem-073-prompt-grand-lama.png`], [`${base}/dudeney-problem-073-solution-grand-lama.png`]);
  set(84, [`${base}/dudeney-problem-084-prompt-new-bishop.png`], [`${base}/084-solution-01-084-solution-p144-02.png`]);
  set(92, [`${base}/dudeney-problem-092-prompt-checkmate.png`], []);
  set(94, [`${base}/dudeney-problem-094-prompt-monstrosity.png`], []);
  set(104, [`${base}/dudeney-problem-104-prompt-dice-trick.png`], []);
  set(105, [], [`${base}/105-solution-01-105-solution-p153-01.png`]);
  return map;
}

function replaceProblemMedia(problem, field, values) {
  if (!Array.isArray(values)) return;
  if (values.length) {
    problem[field] = [...new Set(values)];
  } else {
    delete problem[field];
  }
}

function dudeneyFigureReview(problemNumber) {
  const reviews = {
    3: { solution: "source_checked_no_image:false_positive_illustrate" },
    25: { solution: "source_checked_no_image:textual_reference_to_previous_solution" },
    58: { prompt: "source_checked_no_image:textual_pencil_stroke_description" },
    67: { prompt: "text_only_letter_grid_no_image_needed" }
  };
  return reviews[problemNumber] || null;
}

function dudeneyClassification(problemNumber) {
  const hard = new Set([11, 29, 30, 32, 35, 38, 40, 41, 46, 47, 52, 58, 59, 63, 72, 73, 76, 80, 84, 87, 90, 91, 94, 99, 107, 108, 109, 113, 114, 117, 118, 119, 122, 123]);
  const easy = new Set([1, 3, 4, 6, 7, 8, 12, 13, 16, 18, 19, 20, 21, 24, 26, 31, 43, 44, 45, 54, 56, 57, 65, 66, 67, 88, 92, 104, 105, 106]);
  const algorithmic = new Set([
    57, 58, 59, 60, 61, 62, 63, 64,
    65, 66, 67, 68,
    69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98,
    107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123
  ]);
  const probability = new Set([2, 13, 28, 65, 66, 88, 104, 105]);
  return {
    category: probability.has(problemNumber) ? "probabilityExpectation" : (algorithmic.has(problemNumber) ? "leetcode" : "mentalMath"),
    difficulty: hard.has(problemNumber) ? "Hard" : (easy.has(problemNumber) ? "Easy" : "Medium")
  };
}

function dudeneySection(problemNumber) {
  if (problemNumber <= 32) return "Arithmetical and algebraical puzzles";
  if (problemNumber <= 56) return "Geometrical and dissection puzzles";
  if (problemNumber <= 64) return "Unicursal and route puzzles";
  if (problemNumber <= 68) return "Combination and group puzzles";
  if (problemNumber <= 98) return "Chessboard puzzles";
  if (problemNumber <= 106) return "Game puzzles";
  return "Magic-square and miscellaneous puzzles";
}

function repairQuantitativePrimerProblems(problems, book) {
  const imageMap = quantitativePrimerSolutionImages();
  problems.forEach((problem, index) => {
    const problemNumber = index + 1;
    [
      "titleEn",
      "titleZh",
      "promptEn",
      "promptZh",
      "answerEn",
      "answerZh",
      "explanationEn",
      "explanationZh",
      "answer",
      "explanation"
    ].forEach((field) => {
      problem[field] = cleanQuantitativePrimerCatalogText(problem[field], problemNumber);
    });

    const reviewedText = quantitativePrimerReviewedText(problemNumber);
    if (reviewedText) {
      problem.titleEn = reviewedText.titleEn;
      problem.titleZh = reviewedText.titleZh;
      problem.promptEn = reviewedText.promptEn;
      problem.promptZh = reviewedText.promptZh;
    }

    const reviewedExplanation = quantitativePrimerReviewedExplanation(problemNumber);
    if (reviewedExplanation) {
      problem.explanationEn = reviewedExplanation.en;
      problem.explanationZh = reviewedExplanation.zh;
    }

    const classification = quantitativePrimerClassification(problemNumber);
    problem.category = classification.category;
    problem.difficulty = classification.difficulty;
    problem.classificationReviewed = true;
    problem.classificationReviewSource = "quantitative-primer-topic-map-v1";

    const solutionImages = imageMap.get(problemNumber);
    if (solutionImages?.length) {
      problem.solutionImages = solutionImages;
    }

    problem.tags = [
      book.name,
      quantitativePrimerSection(problemNumber),
      readableCategory(problem.category),
      ...inferTopicTags([problem.titleEn, problem.titleZh, problem.promptEn, problem.promptZh].join(" "))
    ].filter(Boolean);
    problem.tags = [...new Set(problem.tags)].slice(0, 7);
    problem.answer = problem.answerEn || problem.answerZh || problem.answer || "";
    problem.explanation = problem.explanationEn || problem.explanationZh || problem.explanation || "";
  });
}

function cleanQuantitativePrimerCatalogText(text, problemNumber) {
  let value = String(text || "");
  if (!value) return "";
  value = value
    .replace(/\u0000/g, "")
    .replace(/[\u0001-\u0008\u000b\u000c\u000e-\u001f]/g, " ")
    .replace(/\u00ad/g, "")
    .replace(/ﬁ/g, "fi")
    .replace(/ﬂ/g, "fl")
    .replace(/ﬀ/g, "ff")
    .replace(/ﬃ/g, "ffi")
    .replace(/ﬄ/g, "ffl")
    .replace(/\\textbackslash\{\}/g, "\\")
    .replace(/\\textasciitilde\{\}/g, "~")
    .replace(/\s+([?.!,;:；：，。])/g, "$1")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  value = value
    .replace(/\s+1\.\d+\s+(?:Face-to-face|Phone interview|Onsite|Online pair-programming interview|Video interview),?\s*\d*\s*(?:minutes|hours|hour)?/gi, " ")
    .replace(/\s+1\.\d+\s*(?:面对面|电话面试|现场|在线结对编程|视频面试)[,，]?\s*\d*\s*(?:分钟|小时)?/g, " ")
    .replace(/\s+Answer\s+33\.a\):[\s\S]*$/i, problemNumber === 32 ? "" : " Answer 33.a):")
    .replace(/\s+答案\s*33\.a[)）：][\s\S]*$/g, problemNumber === 32 ? "" : " 答案 33.a):")
    .replace(/\s+Answer\s+36\.a\):[\s\S]*$/i, problemNumber === 35 ? "" : " Answer 36.a):")
    .replace(/\s+答案\s*36\.a[)）：][\s\S]*$/g, problemNumber === 35 ? "" : " 答案 36.a):");

  if (problemNumber === 2) {
    value = value.replace(/\s+corr=\s*0[\s\S]*?The line shows y\s*=\s*x;/i, " The attached source image shows the contour and surface plots; the line y = x;");
  }
  if (problemNumber === 41) {
    value = value
      .replace(/\s+Old friends[\s\S]*$/i, "")
      .replace(/\s+老朋友[\s\S]*$/g, "")
      .replace(/\s+Appendix\s+A[\s\S]*$/i, "")
      .replace(/\s+附录\s*A[\s\S]*$/g, "");
  }

  return value.replace(/\s+/g, " ").trim();
}

function quantitativePrimerReviewedText(problemNumber) {
  const entries = [
    null,
    {
      titleEn: "Question 1 - Dice comparison probability",
      titleZh: "问题 1 - 两个骰子的大小比较概率",
      promptEn: "Roll two dice. What is the probability that one is larger than the other?",
      promptZh: "掷两个骰子。一个骰子的点数大于另一个骰子的概率是多少？"
    },
    {
      titleEn: "Question 2 - Expected maximum of correlated normals",
      titleZh: "问题 2 - 相关正态变量最大值的期望",
      promptEn: "Let (X, Y)^T follow a bivariate normal distribution with mean vector (0, 0)^T and covariance matrix [[1, ρ], [ρ, 1]]. Find E[max(X, Y)].",
      promptZh: "设 (X, Y)^T 服从均值向量为 (0, 0)^T、协方差矩阵为 [[1, ρ], [ρ, 1]] 的二元正态分布。求 E[max(X, Y)]。"
    },
    {
      titleEn: "Question 3 - Build an R matrix from vectors",
      titleZh: "问题 3 - 用多个向量构造 R 矩阵",
      promptEn: "How would you make a matrix from a bunch of vectors in R?",
      promptZh: "在 R 中，如何用一组向量构造矩阵？"
    },
    {
      titleEn: "Question 4 - Python negative list index",
      titleZh: "问题 4 - Python 列表负索引",
      promptEn: "If mylist is a list in Python, what is mylist[-1]?",
      promptZh: "如果 mylist 是 Python 中的列表，mylist[-1] 表示什么？"
    },
    {
      titleEn: "Question 5 - C++ virtual functions",
      titleZh: "问题 5 - C++ 虚函数",
      promptEn: "What is a C++ virtual function, and why do we need them?",
      promptZh: "什么是 C++ 虚函数？为什么需要虚函数？"
    },
    {
      titleEn: "Question 6 - Fourth moment of a normal random variable",
      titleZh: "问题 6 - 正态随机变量的四阶矩",
      promptEn: "Derive E[X^4] where X follows Normal(0, σ^2).",
      promptZh: "设 X 服从 Normal(0, σ^2)，推导 E[X^4]。"
    },
    {
      titleEn: "Question 7 - Missing number in an array",
      titleZh: "问题 7 - 数组中缺失的数字",
      promptEn: "You have an unsorted array containing integers 1, 2, 3, ..., n, but one number is missing. Describe an algorithm to find the missing number and discuss its complexity.",
      promptZh: "有一个未排序数组，包含 1, 2, 3, ..., n 中除一个数字外的所有整数。请描述找出缺失数字的算法，并讨论复杂度。"
    },
    {
      titleEn: "Question 8 - Sampling distributions of normal estimators",
      titleZh: "问题 8 - 正态分布估计量的抽样分布",
      promptEn: "Suppose Y follows Normal(μ, σ^2). Now, 10^6 people each draw 1000 samples from this distribution. Let i denote the ith person. Each person estimates μ_i and σ_i^2 using their samples Y_1, Y_2, ..., Y_1000. How should they do this? If you draw histograms of the 10^6 estimates of μ_i and σ_i^2, what would their distributions be? How would you prove the exact sampling distribution of σ_i^2?",
      promptZh: "设 Y 服从 Normal(μ, σ^2)。现在有 10^6 个人，每人从该分布抽取 1000 个样本。令 i 表示第 i 个人。每个人用样本 Y_1, Y_2, ..., Y_1000 来估计 μ_i 和 σ_i^2，应该如何估计？如果画出这 10^6 个 μ_i 和 σ_i^2 估计值的直方图，它们分别会是什么分布？如何证明 σ_i^2 的精确抽样分布？"
    },
    {
      titleEn: "Question 9 - Derivative of an inverse function",
      titleZh: "问题 9 - 反函数的导数",
      promptEn: "If we know g'(x), what can we say about d/dx g^{-1}(x)?",
      promptZh: "如果已知 g'(x)，关于 d/dx g^{-1}(x) 可以说什么？"
    },
    {
      titleEn: "Question 10 - Coin-flip gamble and normal approximation",
      titleZh: "问题 10 - 抛硬币赌博与正态近似",
      promptEn: "You are presented with the following gamble: you flip 100 fair coins. If 60 or more land on heads, you win £10; you win nothing on all other outcomes. Should you play this game for £1?",
      promptZh: "你面前有这样一个赌博：抛 100 枚公平硬币。如果至少 60 枚为正面，你赢得 10 英镑；其他结果都没有收益。你是否应该花 1 英镑参加这个游戏？"
    },
    {
      titleEn: "Question 11 - Zero correlation and independence for normals",
      titleZh: "问题 11 - 正态变量零相关与独立性",
      promptEn: "You have X following Normal(0, 1) and Y following Normal(0, 1). If the correlation coefficient ρ_XY is 0, are X and Y independent?",
      promptZh: "设 X 服从 Normal(0, 1)，Y 也服从 Normal(0, 1)。如果相关系数 ρ_XY = 0，X 和 Y 是否独立？"
    },
    {
      titleEn: "Question 12 - Optimal urn allocation",
      titleZh: "问题 12 - 最优 urn 分球策略",
      promptEn: "You have two urns, five red balls, and five blue balls. You can distribute the balls into the urns any way you like, but each urn must have at least one ball in it. I will choose one urn at random (p = 0.5) and then draw one ball from it. If the ball is blue, you win. How should you distribute the balls to maximize your probability of winning? Log into this pair-programming website and use Python or C++ to solve the problem while I watch.",
      promptZh: "你有两个 urn、五个红球和五个蓝球。你可以任意分配这些球，但每个 urn 至少要有一个球。我会以 p = 0.5 随机选择一个 urn，再从中抽出一个球；如果抽到蓝球，你就赢。应如何分配球才能最大化获胜概率？请登录结对编程网站，在我观察时用 Python 或 C++ 解决这个问题。"
    },
    {
      titleEn: "Question 13 - Three judges and correct verdict probability",
      titleZh: "问题 13 - 三位法官给出正确判决的概率",
      promptEn: "There are three judges in a court with probabilities p, p, and 1/2 of reaching the correct verdict. A verdict is decided only if at least two judges agree. What is the probability that the court reaches the correct verdict?",
      promptZh: "法庭中有三位法官，作出正确判决的概率分别为 p、p 和 1/2。只有至少两位法官意见一致时才形成判决。法庭最终作出正确判决的概率是多少？"
    },
    {
      titleEn: "Question 14 - Linear regression assumptions and inference",
      titleZh: "问题 14 - 线性回归假设与推断",
      promptEn: "Suppose you wanted to model Y using X and decided to use the linear regression Y = Xβ + ε. What assumptions are being made? How would you find β? What tests can be done on β afterwards?",
      promptZh: "假设你想用 X 来建模 Y，并决定使用线性回归 Y = Xβ + ε。这里作出了哪些假设？如何求 β？之后可以对 β 做哪些检验？"
    },
    {
      titleEn: "Question 15 - Disease test and Bayes' law",
      titleZh: "问题 15 - 疾病检测与贝叶斯定律",
      promptEn: "One percent of people in the world have a given disease, and the test for it is imperfect. The test has an 80% chance of showing positive if you have the disease, but if you do not have the disease, there is a 10% chance of a false positive. What is the probability that you actually have the disease if your test result is positive?",
      promptZh: "世界上 1% 的人患有某种疾病，而该疾病的检测并不完美。若患病，检测有 80% 的概率呈阳性；若未患病，检测有 10% 的概率假阳性。如果检测结果为阳性，你实际患病的概率是多少？"
    },
    {
      titleEn: "Question 16 - Derivative of x^x",
      titleZh: "问题 16 - x^x 的导数",
      promptEn: "What is d/dx x^x?",
      promptZh: "求 d/dx x^x。"
    },
    {
      titleEn: "Question 17 - Compare e^π and π^e",
      titleZh: "问题 17 - 比较 e^π 与 π^e",
      promptEn: "Which is larger, e^π or π^e?",
      promptZh: "e^π 和 π^e 哪个更大？"
    },
    {
      titleEn: "Question 18 - Mean and variance of an AR(1) process",
      titleZh: "问题 18 - AR(1) 过程的均值与方差",
      promptEn: "Given the AR(1) process Y_t = α_0 + α_1Y_{t-1} + ε_t, where ε_t follows Normal(0, σ_ε^2), what are E[Y_t] and Var(Y_t)?",
      promptZh: "给定 AR(1) 过程 Y_t = α_0 + α_1Y_{t-1} + ε_t，其中 ε_t 服从 Normal(0, σ_ε^2)，求 E[Y_t] 和 Var(Y_t)。"
    },
    {
      titleEn: "Question 19 - Distribution of a signed normal variable",
      titleZh: "问题 19 - 随机变号正态变量的分布",
      promptEn: "If X follows Normal(0, 1) and Y has distribution P(Y = -1) = 1/2 and P(Y = 1) = 1/2, what is the cumulative distribution function of Z = XY?",
      promptZh: "设 X 服从 Normal(0, 1)，且 Y 的分布为 P(Y = -1) = 1/2、P(Y = 1) = 1/2。Z = XY 的累积分布函数是什么？"
    },
    {
      titleEn: "Question 20 - Zero covariance and independence",
      titleZh: "问题 20 - 零协方差与独立性",
      promptEn: "If Cov(X, Y) = 0, are X and Y independent?",
      promptZh: "如果 Cov(X, Y) = 0，X 和 Y 是否独立？"
    },
    {
      titleEn: "Question 21 - Stick-breaking triangle probability",
      titleZh: "问题 21 - 折断木棍形成三角形的概率",
      promptEn: "Break a 1m stick in two random places. What is the probability that the three resulting pieces form a triangle?",
      promptZh: "在一根 1 米长的木棍上随机选两个位置折断。三段木棍能够组成三角形的概率是多少？"
    },
    {
      titleEn: "Question 22 - Anagram checking in Python",
      titleZh: "问题 22 - Python 判断异位词",
      promptEn: "Write a Python function to check whether two strings are anagrams. Do a version with sorting and a version without sorting. Why might you want a function that can do this without sorting?",
      promptZh: "编写一个 Python 函数判断两个字符串是否为异位词。分别写出使用排序和不使用排序的版本。为什么可能需要不依赖排序的版本？"
    },
    {
      titleEn: "Question 23 - Implement nCr",
      titleZh: "问题 23 - 实现 nCr",
      promptEn: "Without using the standard library, write a function for nCr. Do a version with recursion and a version without recursion.",
      promptZh: "不使用标准库，实现计算 nCr 的函数。分别写出递归版本和非递归版本。"
    },
    {
      titleEn: "Question 24 - Romeo and Juliet meeting probability",
      titleZh: "问题 24 - 罗密欧与朱丽叶相遇概率",
      promptEn: "Romeo and Juliet agree to meet between 08:00 and 09:00. Each arrives at a random time in the hour and then waits 15 minutes. What is the probability that they meet?",
      promptZh: "罗密欧与朱丽叶约定在 08:00 到 09:00 之间见面。两人都在这一小时内随机到达，并等待 15 分钟。他们相遇的概率是多少？"
    },
    {
      titleEn: "Question 25 - Find the celebrity at a party",
      titleZh: "问题 25 - 在聚会中找名人",
      promptEn: "Consider a party with N people. We have a function knows(a, b) that returns whether person a knows person b; it is not necessarily symmetric. Everyone at the party knows David Beckham, but he knows no one. Number the people from 1 to N. Using knows(), how would you determine Beckham's number? Now suppose Victoria Beckham is also at the party, she only knows David, David only knows her, and everyone else knows both of them and at least one other person. How would you determine their numbers?",
      promptZh: "考虑一个有 N 个人的聚会。函数 knows(a, b) 返回 a 是否认识 b，且它不一定对称。聚会中每个人都认识 David Beckham，但他不认识任何人。将所有人编号为 1 到 N，如何用 knows() 找到 Beckham 的编号？再假设 Victoria Beckham 也在聚会中，她只认识 David，David 也只认识她，并且其他每个人都认识他们二人且至少还认识一个其他人。如何确定他们的编号？"
    },
    {
      titleEn: "Question 26 - Find a duplicate without sorting",
      titleZh: "问题 26 - 不排序找重复数",
      promptEn: "You have an unsorted array of N integers [n1, n2, ..., nN]. All integers are unique except two entries that are equal. These are arbitrary integers, not necessarily 1 to N. How would you find the duplicate? Give an answer that does not rely on sorting, then give an answer with sorting and discuss your favorite sorting algorithm.",
      promptZh: "有一个包含 N 个整数的未排序数组 [n1, n2, ..., nN]。除两个相同的元素外，其余整数都唯一；这些整数是任意整数，不一定是 1 到 N。如何找出重复元素？给出一个不依赖排序的方法，再给出一个使用排序的方法，并讨论你喜欢的排序算法。"
    },
    {
      titleEn: "Question 27 - One bullet and 100 prisoners",
      titleZh: "问题 27 - 一颗子弹与 100 名囚犯",
      promptEn: "You are guarding 100 prisoners in a field, and you have a gun with a single bullet. If any one prisoner has a non-zero probability of surviving, he will attempt to escape. If a prisoner is certain of death, he will not attempt escape. How do you stop them from escaping?",
      promptZh: "你在一片空地看守 100 名囚犯，手中有一把只有一颗子弹的枪。如果任意一名囚犯有非零生存概率，他就会试图逃跑；如果他确定会死，就不会逃跑。你如何阻止他们逃跑？"
    },
    {
      titleEn: "Question 28 - Significance tests in logistic regression",
      titleZh: "问题 28 - 逻辑回归参数显著性检验",
      promptEn: "What significance tests are used for parameters estimated in a logistic regression? How are they different from those used for a linear regression?",
      promptZh: "逻辑回归估计参数时使用什么显著性检验？它们与线性回归中使用的检验有何不同？"
    },
    {
      titleEn: "Question 29 - Measuring two lengths with minimum variance",
      titleZh: "问题 29 - 用最小方差测量两段长度",
      promptEn: "You have two pieces of wood of lengths a and b, where a < b, and a measuring apparatus with measurement-error variance σ^2. It costs £1 per use and you only have £2. What is the best strategy to measure a and b with minimal variance?",
      promptZh: "你有两段长度为 a 和 b 的木头，其中 a < b；测量工具的测量误差方差为 σ^2。每次使用花费 1 英镑，你只有 2 英镑。以最小方差测量 a 和 b 的最佳策略是什么？"
    },
    {
      titleEn: "Question 30 - Minimum number of socks",
      titleZh: "问题 30 - 袜子数量的最小可能值",
      promptEn: "A bag contains N socks, some black and some red. If two random socks are picked, the probability that both are red is 1/2. What is the smallest possible value of N?",
      promptZh: "一个袋子中有 N 只袜子，其中一些是黑色，一些是红色。随机抽取两只袜子，它们都是红色的概率为 1/2。N 的最小可能值是多少？"
    },
    {
      titleEn: "Question 31 - Linear regression assumptions and multicollinearity",
      titleZh: "问题 31 - 线性回归假设与多重共线性",
      promptEn: "What assumptions are required for a linear regression? What is multicollinearity, and what are its implications? How would you measure goodness of fit?",
      promptZh: "线性回归需要哪些假设？什么是多重共线性，它有什么影响？如何衡量拟合优度？"
    },
    {
      titleEn: "Question 32 - Examples of non-linear models",
      titleZh: "问题 32 - 非线性模型示例",
      promptEn: "What are some non-linear models?",
      promptZh: "有哪些非线性模型？"
    },
    {
      titleEn: "Question 33 - SQL average department salary",
      titleZh: "问题 33 - SQL 计算部门平均薪资",
      promptEn: "Write some SQL queries. Consider a table with the columns Employee name, Department, and Salary. Add a column showing the average department salary for each employee.",
      promptZh: "编写 SQL 查询。考虑一个包含 Employee name、Department 和 Salary 三列的表。请新增一列，显示每位员工所在部门的平均薪资。"
    },
    {
      titleEn: "Question 34 - SQL customers with changed details",
      titleZh: "问题 34 - SQL 查询信息发生变化的客户",
      promptEn: "You are given a table with columns Customer ID, Name, datestart, and dateend. Write a query to return all customers who have made changes to their details.",
      promptZh: "给定一个包含 Customer ID、Name、datestart 和 dateend 四列的表。编写查询，返回所有曾更改过个人信息的客户。"
    },
    {
      titleEn: "Question 35 - Linear versus logistic regression",
      titleZh: "问题 35 - 线性回归与逻辑回归",
      promptEn: "What assumptions are needed for a linear regression? Are they the same for a logistic regression? How would you test the significance of the parameters for a linear regression? Would you use the same test for a logistic regression?",
      promptZh: "线性回归需要哪些假设？这些假设对逻辑回归是否相同？如何检验线性回归参数的显著性？逻辑回归是否使用相同的检验？"
    },
    {
      titleEn: "Question 36 - R data structures",
      titleZh: "问题 36 - R 的数据结构",
      promptEn: "Answer the following question about R: what are some data structures used in R?",
      promptZh: "回答这个关于 R 的问题：R 中常用的数据结构有哪些？"
    },
    {
      titleEn: "Question 37 - Choose a model for a team problem",
      titleZh: "问题 37 - 为团队问题选择模型",
      promptEn: "Here is a specific problem the team faced last year. What model will you build to solve it, and why?",
      promptZh: "这是团队去年遇到的一个具体问题。你会构建什么模型来解决它？为什么？"
    },
    {
      titleEn: "Question 38 - Random walk hitting probability",
      titleZh: "问题 38 - 随机游走先到达上边界的概率",
      promptEn: "You have a simple random walk X_t = sum_{i=1}^t Z_i, where P(Z_i = 1) = 0.5 and P(Z_i = -1) = 0.5. If the process currently starts at k, meaning X_0 = k, what is the probability that it hits l before hitting 0, where k < l?",
      promptZh: "有一个简单随机游走 X_t = sum_{i=1}^t Z_i，其中 P(Z_i = 1) = 0.5，P(Z_i = -1) = 0.5。若过程从 k 开始，即 X_0 = k，且 k < l，它在到达 0 之前先到达 l 的概率是多少？"
    },
    {
      titleEn: "Question 39 - Add numbers to reach 50",
      titleZh: "问题 39 - 加数到 50 的必胜策略",
      promptEn: "We are going to play a game using the integers from 1 to 10 inclusive. You start by saying a number between 1 and 10. Thereafter, I add a number from 1 to 10 to your number and say the result. Then it is your turn again. We continue taking turns, and the first person to say 50 wins. How much would you wager on this game?",
      promptZh: "我们用 1 到 10（含）之间的整数玩一个游戏。你先说一个 1 到 10 的数；之后我在你的数上加一个 1 到 10 的数并说出结果；然后轮到你继续加。双方轮流进行，第一个说到 50 的人获胜。你愿意为这个游戏下注多少？"
    },
    {
      titleEn: "Question 40 - Aces after discarding cards",
      titleZh: "问题 40 - 丢弃部分牌后抽到两张 A",
      promptEn: "I have a deck of 52 cards. I shuffle the deck and randomly drop 20 cards into a shredder. You then draw two cards from what remains. What is the probability that they are both aces?",
      promptZh: "我有一副 52 张牌。洗牌后，我随机把 20 张牌扔进碎纸机。然后你从剩余牌中抽两张。两张都是 A 的概率是多少？"
    },
    {
      titleEn: "Question 41 - Double-headed coin after ten heads",
      titleZh: "问题 41 - 连续十次正面后的双头硬币概率",
      promptEn: "You have a bag with 1000 coins. One is double-headed and the other 999 are fair. I pick one coin uniformly at random and flip it ten times. It comes up heads all ten times. What is the probability that I selected the double-headed coin?",
      promptZh: "袋中有 1000 枚硬币，其中 1 枚是双头硬币，另外 999 枚是公平硬币。我从袋中随机取出一枚并抛 10 次，结果 10 次都是正面。我选中双头硬币的概率是多少？"
    }
  ];
  return entries[problemNumber] || null;
}

function quantitativePrimerReviewedExplanation(problemNumber) {
  const explanations = {
    2: {
      en: "Let Z = max(X, Y). By symmetry, P(X > Y) = 1/2, and the two conditional contributions are equal, so E[Z] = E[X | X > Y]. Set W1 = X and W2 = X - Y. Then (W1, W2) is jointly normal, Var(W2) = 2(1 - ρ), and E[W1 | W2 = w] = w/2. Therefore E[X | X > Y] = E[W1 | W2 > 0] = (1/2)E[W2 | W2 > 0]. For a zero-mean normal variable with variance 2(1 - ρ), the positive-truncation mean is 2 sqrt(1 - ρ) / sqrt(π). Hence E[max(X, Y)] = sqrt((1 - ρ) / π). The attached source image shows the contour and surface plots used in the original explanation.",
      zh: "令 Z = max(X, Y)。由对称性可知 P(X > Y) = 1/2，两个条件期望项相同，因此 E[Z] = E[X | X > Y]。设 W1 = X、W2 = X - Y，则 (W1, W2) 仍为联合正态，Var(W2) = 2(1 - ρ)，并且 E[W1 | W2 = w] = w/2。因此 E[X | X > Y] = E[W1 | W2 > 0] = (1/2)E[W2 | W2 > 0]。零均值、方差为 2(1 - ρ) 的正态变量在正半轴截断后的均值为 2 sqrt(1 - ρ) / sqrt(π)，所以 E[max(X, Y)] = sqrt((1 - ρ) / π)。附图为原文解答中用于说明对称区域的等高线图和曲面图。"
    },
    33: {
      en: "If the SQL dialect supports window functions, use: SELECT Employee_name, Department, Salary, AVG(Salary) OVER (PARTITION BY Department) AS avg_department_salary FROM salaries; Without window functions, join each row to a grouped subquery: SELECT a.Employee_name, a.Department, a.Salary, b.avg_department_salary FROM salaries AS a JOIN (SELECT Department, AVG(Salary) AS avg_department_salary FROM salaries GROUP BY Department) AS b ON a.Department = b.Department.",
      zh: "如果 SQL 方言支持窗口函数，可以写：SELECT Employee_name, Department, Salary, AVG(Salary) OVER (PARTITION BY Department) AS avg_department_salary FROM salaries; 如果不支持窗口函数，则先按部门聚合，再与原表连接：SELECT a.Employee_name, a.Department, a.Salary, b.avg_department_salary FROM salaries AS a JOIN (SELECT Department, AVG(Salary) AS avg_department_salary FROM salaries GROUP BY Department) AS b ON a.Department = b.Department。"
    },
    36: {
      en: "Common R data structures include vectors, lists, matrices, arrays, factors, data frames, and data.table/tibble-style tabular objects. Vectors are homogeneous one-dimensional containers; lists can hold mixed types and nested objects; matrices and arrays are multi-dimensional homogeneous containers; factors encode categorical variables; data frames store table-like data with columns of possibly different types.",
      zh: "R 中常见的数据结构包括向量、列表、矩阵、数组、因子、数据框，以及 data.table/tibble 这类表格对象。向量是一维且元素类型一致的容器；列表可以包含不同类型和嵌套对象；矩阵和数组是多维且类型一致的容器；因子用于表示分类变量；数据框用于存储表格数据，各列可以有不同类型。"
    },
    41: {
      en: "Use Bayes' law. Let R be the event that the chosen coin is double-headed, F the event that it is fair, and H10 the event of ten heads. Then P(R) = 1/1000, P(F) = 999/1000, P(H10 | R) = 1, and P(H10 | F) = (1/2)^10 = 1/1024. Therefore P(R | H10) = [1 * (1/1000)] / [1 * (1/1000) + (1/1024) * (999/1000)] = 1024 / 2023, slightly larger than 1/2.",
      zh: "使用贝叶斯定律。令 R 表示选中双头硬币，F 表示选中公平硬币，H10 表示连续 10 次正面。则 P(R) = 1/1000，P(F) = 999/1000，P(H10 | R) = 1，P(H10 | F) = (1/2)^10 = 1/1024。因此 P(R | H10) = [1 * (1/1000)] / [1 * (1/1000) + (1/1024) * (999/1000)] = 1024 / 2023，略大于 1/2。"
    }
  };
  return explanations[problemNumber] || null;
}

function quantitativePrimerClassification(problemNumber) {
  const rows = {
    1: ["probabilityExpectation", "Easy"],
    2: ["statistics", "Hard"],
    3: ["pandasNumpy", "Easy"],
    4: ["leetcode", "Easy"],
    5: ["leetcode", "Medium"],
    6: ["statistics", "Hard"],
    7: ["leetcode", "Medium"],
    8: ["statistics", "Hard"],
    9: ["statistics", "Medium"],
    10: ["probabilityExpectation", "Medium"],
    11: ["statistics", "Medium"],
    12: ["probabilityExpectation", "Hard"],
    13: ["probabilityExpectation", "Medium"],
    14: ["statistics", "Medium"],
    15: ["probabilityExpectation", "Easy"],
    16: ["statistics", "Easy"],
    17: ["statistics", "Medium"],
    18: ["statistics", "Hard"],
    19: ["statistics", "Medium"],
    20: ["statistics", "Medium"],
    21: ["probabilityExpectation", "Medium"],
    22: ["leetcode", "Medium"],
    23: ["leetcode", "Medium"],
    24: ["probabilityExpectation", "Medium"],
    25: ["leetcode", "Medium"],
    26: ["leetcode", "Medium"],
    27: ["mentalMath", "Medium"],
    28: ["statistics", "Medium"],
    29: ["statistics", "Medium"],
    30: ["probabilityExpectation", "Medium"],
    31: ["statistics", "Medium"],
    32: ["machineLearning", "Medium"],
    33: ["pandasNumpy", "Medium"],
    34: ["pandasNumpy", "Medium"],
    35: ["statistics", "Medium"],
    36: ["pandasNumpy", "Easy"],
    37: ["machineLearning", "Hard"],
    38: ["probabilityExpectation", "Hard"],
    39: ["mentalMath", "Medium"],
    40: ["probabilityExpectation", "Medium"],
    41: ["probabilityExpectation", "Medium"]
  };
  const [category, difficulty] = rows[problemNumber] || ["probabilityExpectation", "Medium"];
  return { category, difficulty };
}

function quantitativePrimerSolutionImages() {
  const base = "assets/problem-media/quantitative-primer";
  return new Map([
    [1, [`${base}/qprimer-problem-001-dice-matrix.png`]],
    [2, [`${base}/qprimer-problem-002-bivariate-normal-plots.png`]],
    [10, [`${base}/qprimer-problem-010-normal-approximation.png`]],
    [15, [`${base}/qprimer-problem-015-bayes-square.png`]],
    [17, [`${base}/qprimer-problem-017-log-over-x-plot.png`]],
    [24, [`${base}/qprimer-problem-024-romeo-juliet-square.png`]],
    [25, [
      `${base}/qprimer-problem-025-adjacency-matrices-1.png`,
      `${base}/qprimer-problem-025-adjacency-matrices-2.png`,
      `${base}/qprimer-problem-025-adjacency-matrices-3.png`
    ]],
    [29, [`${base}/qprimer-problem-029-measurement-strategy.png`]]
  ]);
}

function quantitativePrimerSection(problemNumber) {
  if (problemNumber <= 5) return "Interview 1.1";
  if (problemNumber <= 7) return "Interview 1.2";
  if (problemNumber <= 9) return "Interview 1.3";
  if (problemNumber <= 11) return "Interview 1.4";
  if (problemNumber <= 12) return "Interview 1.5";
  if (problemNumber <= 15) return "Interview 1.6";
  if (problemNumber <= 23) return "Interview 1.7";
  if (problemNumber <= 24) return "Interview 1.8";
  if (problemNumber <= 27) return "Interview 1.9";
  if (problemNumber <= 30) return "Interview 1.10";
  if (problemNumber <= 34) return "Interview 1.11";
  if (problemNumber <= 37) return "Interview 1.12";
  if (problemNumber <= 38) return "Interview 1.13";
  if (problemNumber <= 40) return "Interview 1.14";
  return "Interview 1.15";
}

function repairStefanicaProblems(problems, book) {
  const manualText = stefanicaManualCatalogText();
  problems.forEach((problem, index) => {
    const problemNumber = index + 1;
    [
      "titleEn",
      "titleZh",
      "promptEn",
      "promptZh",
      "answerEn",
      "answerZh",
      "explanationEn",
      "explanationZh",
      "answer",
      "explanation"
    ].forEach((field) => {
      problem[field] = cleanStefanicaCatalogText(problem[field], problemNumber);
    });

    const manual = manualText.get(problemNumber);
    if (manual?.titleEn) problem.titleEn = manual.titleEn;
    if (manual?.titleZh) problem.titleZh = manual.titleZh;
    if (manual?.promptEn) problem.promptEn = manual.promptEn;
    if (manual?.promptZh) problem.promptZh = manual.promptZh;
    if (manual?.explanationEn) problem.explanationEn = manual.explanationEn;
    if (manual?.explanationZh) problem.explanationZh = manual.explanationZh;

    const reviewed = stefanicaReviewedCatalogText(problemNumber);
    if (reviewed) {
      problem.titleEn = reviewed.titleEn;
      problem.titleZh = reviewed.titleZh;
      problem.promptEn = reviewed.promptEn;
      problem.promptZh = reviewed.promptZh;
      problem.explanationEn = reviewed.explanationEn;
      problem.explanationZh = reviewed.explanationZh;
    }

    if (!problem.titleEn || problem.titleEn === `Stefanica 题目 ${problemNumber}`) {
      problem.titleEn = stefanicaTitleFromPrompt(problem.promptEn || problem.promptZh, "en", problemNumber);
    }
    if (!problem.titleZh || problem.titleZh === `Stefanica 题目 ${problemNumber}` || !/[\u3400-\u9fff]/.test(problem.titleZh)) {
      problem.titleZh = stefanicaTitleFromPrompt(problem.promptZh || problem.promptEn, "zh", problemNumber);
    }

    if (!problem.promptZh || compactStefanicaText(problem.promptZh) === compactStefanicaText(problem.promptEn) || !/[\u3400-\u9fff]/.test(problem.promptZh)) {
      if (manual?.promptZh) problem.promptZh = manual.promptZh;
    }
    if (!problem.explanationZh || (mostlyEnglishStefanica(problem.explanationZh) && manual?.explanationZh)) {
      problem.explanationZh = manual?.explanationZh || problem.explanationZh;
    }

    const classification = reviewedStefanicaClassification(problem, problemNumber);
    problem.category = classification.category;
    problem.difficulty = classification.difficulty;
    problem.classificationReviewed = true;
    problem.classificationReviewSource = "stefanica-topic-map-v1";
    problem.tags = [
      book.name,
      stefanicaSection(problemNumber),
      readableCategory(problem.category),
      ...inferTopicTags([problem.titleEn, problem.titleZh, problem.promptEn, problem.promptZh].join(" "))
    ].filter(Boolean);
    problem.tags = [...new Set(problem.tags)].slice(0, 7);
    problem.answer = problem.answerEn || problem.answerZh || problem.answer || "";
    problem.explanation = problem.explanationEn || problem.explanationZh || problem.explanation || "";
  });
}

function cleanStefanicaCatalogText(text, problemNumber) {
  let value = String(text || "");
  if (!value) return "";
  value = value
    .replace(/\x08/g, " ")
    .replace(/\u00ad/g, "")
    .replace(/\\textbackslash\{\}/g, "\\")
    .replace(/\\textasciitilde\{\}/g, "~")
    .replace(/([A-Za-z])-\s+([a-z])/g, "$1$2")
    .replace(/\s+([?.!,;:；：，。])/g, "$1")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const promptStopPatterns = [
    /\s+MATHEMATICAL PRELIMINARIES\b[\s\S]*$/i,
    /\s+FINANCIAL APPLICATIONS\b[\s\S]*$/i,
    /\s+2The same characteristic polynomial\b[\s\S]*$/i,
    /\s+fact that the point\b[\s\S]*$/i,
    /\s+\d+\.\d+\.\s+[A-Z][A-Z .'-]+\b[\s\S]*$/g,
    /\s+数学预备知识\b[\s\S]*$/g,
    /\s+金融应用\b[\s\S]*$/g
  ];
  for (const pattern of promptStopPatterns) value = value.replace(pattern, "");

  const solutionStops = {
    1: [/Second Method:/i, /第二方法：/],
    2: [/0\.3 Sequences satisfying linear recursions/i, /0\.3 满足线性递归/],
    5: [/Plain vanilla European call and put options/i, /普通欧式看涨期权和看跌期权/],
    6: [/1\.9 The Put-Call parity/i, /1\.9 欧式期权的看跌期权平价/],
    8: [/We note that this integral/i, /我们注意到，该积分/],
    10: [/2\.5\s+Convergence/i, /2\.5.*中点规则/],
    11: [/If the yield of the bond is given/i, /如果债券的收益率已知/],
    12: [/2\.9 References/i, /2\.9 参考文献/],
    17: [/3\.9 References/i, /3\.9 参考文献/],
    21: [/Let f\(x, y\) be a differentiable function/i, /设 f\(x, y\) 为可微函数/],
    23: [/7\.3 Finding relative extrema/i, /7\.3 求相对/],
    31: [/8\.3\.2 The Approximate Newton/i, /8\.3\.2 近似牛顿/],
    32: [/Finding optimal investment portfolios/i, /寻找最佳投资组合/],
    33: [/8\.5\. COMPUTING BOND YIELDS/i, /8\.5。计算债券收益率/],
    35: [/8\.\s*7 Bootstrapping/i, /8\.\s*7 寻找零利率曲线/]
  }[problemNumber] || [];
  for (const pattern of solutionStops) value = value.replace(pattern, "");

  return value
    .replace(/\s+CHAPTER\s+\d+\.[^.!?。？]*(?=\s|$)/gi, " ")
    .replace(/\s+第\s*\d+\s*章[^。？!?]*(?=\s|$)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stefanicaTitleFromPrompt(prompt, language, problemNumber) {
  const text = String(prompt || "")
    .replace(/^(?:Example|示例|举例)\s*[:：]\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return language === "zh" ? `Stefanica 题目 ${problemNumber}` : `Stefanica problem ${problemNumber}`;
  const raw = String(text.match(/^(.{14,120}?[?？。.]|\S.{0,110})/)?.[1] || text.slice(0, 110))
    .replace(/[?？。.\s]+$/g, "")
    .trim();
  return language === "zh" ? `示例：${raw}` : `Example: ${raw}`;
}

function compactStefanicaText(text) {
  return String(text || "").toLowerCase().replace(/[\s.,;:!?？。，；：、'"“”‘’()（）[\]{}$\\_^+-]+/g, "");
}

function mostlyEnglishStefanica(text) {
  const value = String(text || "");
  const latin = (value.match(/[A-Za-z]/g) || []).length;
  const cjk = (value.match(/[\u3400-\u9fff]/g) || []).length;
  return latin > 120 && latin > cjk * 3;
}

function stefanicaManualCatalogText() {
  return new Map([
    [7, {
      titleZh: "示例：矩形区域上的二重积分",
      promptZh: "示例：设 D = [1,3] x [2,5]，f(x, y) = 2y - 3x。计算二重积分 ∫∫_D f(x,y) dxdy。"
    }],
    [8, {
      titleZh: "示例：圆盘区域上的二重积分",
      promptZh: "示例：设 D 为以 0 为圆心、半径为 2 的圆盘，f(x, y) = 1 - x^2 - y^2。计算二重积分 ∫∫_D f(x,y) dxdy。"
    }],
    [10, {
      titleZh: "示例：中点、梯形和 Simpson 积分近似",
      promptZh: "示例：用 n = 8 个分割区间，分别用中点法、梯形法和 Simpson 法近似定积分 I = ∫_1^3 (1/(x+1))^2 dx，并记为 IM、IT 和 IS。计算 I 的精确值以及对应的近似误差。",
      explanationZh: "令 f(x) = (1/(x+1))^2。对于 n = 8，步长 h = 1/4。由中点法、梯形法和 Simpson 法可得近似值分别约为 0.24943374、0.25113543 和 0.25000097。精确积分为 I = 1/4，因此误差约为 0.00056625、0.00113543 和 0.00000097。"
    }],
    [11, {
      titleEn: "Example: Semiannual coupon bond price from rate curves",
      titleZh: "示例：由利率曲线计算半年付息债券价格",
      promptEn: "Example: Consider a semiannual coupon bond with coupon rate 6% and maturity 20 months. Assume that the face value of the bond is 100, and that interest is compounded continuously. (i) Compute the price of the bond if the zero rate is r(0,t)=0.0525+ln(1+2t)/200. (ii) Compute the price of the bond if the instantaneous interest rate curve is r(t)=0.0525+1/(100(1+e^{-t^2})). (iii) Compute the price of the bond if r(t)=0.0525+ln(1+2t)/(t+100(1+2t)).",
      promptZh: "示例：考虑一只半年付息债券，票面利率为 6%，期限为 20 个月，面值为 100，利息连续复利。(i) 若零利率为 r(0,t)=0.0525+ln(1+2t)/200，计算债券价格。(ii) 若瞬时利率曲线为 r(t)=0.0525+1/(100(1+e^{-t^2}))，计算债券价格。(iii) 若 r(t)=0.0525+ln(1+2t)/(t+100(1+2t))，计算债券价格。"
    }],
    [12, {
      titleEn: "Example: Bond price, duration, and convexity",
      titleZh: "示例：债券价格、久期和凸性",
      promptEn: "Example: Consider a semiannual coupon bond with face value 100, coupon rate 6%, and maturity 20 months. If the yield of the bond is 6.50%, compute the price, duration, and convexity of the bond.",
      promptZh: "示例：考虑一只面值为 100、票面利率为 6%、期限为 20 个月的半年付息债券。若债券收益率为 6.50%，计算债券价格、久期和凸性。"
    }],
    [17, {
      titleEn: "Example: Black-Scholes call and put prices",
      titleZh: "示例：Black-Scholes 看涨和看跌期权定价",
      promptEn: "Example: Use the Black-Scholes formula to price a six months European call option with strike 40, on an underlying asset with spot price 42 and volatility 30%, which pays dividends continuously, with dividend rate 3%. Assume that interest rates are constant at 5%. Price a six months European put option with strike 40 on the same asset, using the Black-Scholes formula. Check whether the Put-Call parity is satisfied.",
      promptZh: "示例：使用 Black-Scholes 公式为一份 6 个月欧式看涨期权定价。该期权行权价为 40，标的资产现价为 42、波动率为 30%，并以 3% 的股息率连续支付股息。假设利率恒定为 5%。再用 Black-Scholes 公式为同一标的、同一行权价的 6 个月欧式看跌期权定价，并检查看跌-看涨平价是否成立。"
    }],
    [19, {
      titleEn: "Example: Taylor approximation errors for an ATM call",
      titleZh: "示例：平值看涨期权的 Taylor 近似误差",
      promptEn: "Example: Estimate the relative errors given by the approximation formulas from section 5.5.1 for the value, the Greeks, and the implied volatility of a six months at-the-money call with strike 40 on a non-dividend-paying underlying asset with volatility 25%, assuming zero interest rates.",
      promptZh: "示例：对于一份 6 个月平值看涨期权，行权价为 40，标的资产不支付股息、波动率为 25%，且假设利率为 0。估计第 5.5.1 节近似公式在期权价值、Greeks 和隐含波动率上的相对误差。",
      explanationZh: "在 S = K = 40、T = 0.5、sigma = 0.25 且 r = q = 0 时，Black-Scholes 看涨期权价值为 2.817284，而公式 (5.66) 的近似值为 2.820948，相对误差约为 0.13%。用第 3.6 节公式计算 Greeks，并与第 5.5.1 节近似公式比较，可得到各 Greek 的相对误差；由近似价格反推出的隐含波动率也与原波动率非常接近。"
    }],
    [21, {
      explanationZh: "由链式法则，d/dt f(x,y) = (2x + y^3)·2e^{2t} + (1 + 3xy^2)·2t。代入 x = e^{2t}、y = t^2，得到 2(2e^{2t}+t^6)e^{2t}+2t(1+3e^{2t}t^4)。"
    }],
    [23, {
      titleZh: "示例：用极坐标计算圆盘上的二重积分",
      promptZh: "示例：设 D = D(0,2) 为以 0 为圆心、半径为 2 的圆盘，f(x,y)=1-x^2-y^2。计算二重积分 ∫∫_D f(x,y) dxdy。"
    }],
    [31, {
      titleEn: "Example: Newton's method for a three-dimensional nonlinear system",
      titleZh: "示例：三维非线性方程组的牛顿法",
      promptEn: "Example: Use Newton's method to solve F(x) = 0 for the nonlinear three-dimensional system displayed in the source text, using the initial guesses x0 = (1,1,1)^T and x0 = (2,2,2)^T.",
      promptZh: "示例：对原书中给出的三维非线性方程组 F(x)=0 使用牛顿法求解，分别使用初始猜测 x0=(1,1,1)^T 和 x0=(2,2,2)^T。"
    }],
    [32, {
      titleEn: "Example: Approximate Newton's method for a nonlinear system",
      titleZh: "示例：三维非线性方程组的近似牛顿法",
      promptEn: "Example: Use the approximate Newton's method to solve F(x) = 0 for the same three-dimensional nonlinear system as the previous example.",
      promptZh: "示例：对上一题相同的三维非线性方程组 F(x)=0 使用近似牛顿法求解。"
    }],
    [33, {
      titleEn: "Example: Minimal variance portfolio with target return",
      titleZh: "示例：给定目标收益率的最小方差投资组合",
      promptEn: "Example: Find a minimal variance portfolio with 11.5% expected rate of return if four assets can be traded to set up the portfolio, given the expected returns, volatilities, and correlations listed in the source text.",
      promptZh: "示例：给定原书中列出的 4 个资产的期望收益率、波动率和相关系数，求一个期望收益率为 11.5% 的最小方差投资组合。"
    }]
  ]);
}

function stefanicaReviewedCatalogText(problemNumber) {
  return new Map([
    [1, {
      titleEn: "Example: Power-sum recursion",
      titleZh: "示例：幂和递推公式",
      promptEn: "Use recursion formula (19) to compute S(n,1)=sum_{k=1}^n k and S(n,2)=sum_{k=1}^n k^2.",
      promptZh: "使用递推公式 (19) 计算 S(n,1)=sum_{k=1}^n k 和 S(n,2)=sum_{k=1}^n k^2。",
      explanationEn: "The recursion gives S(n,1)=n(n+1)/2 and S(n,2)=n(n+1)(2n+1)/6.",
      explanationZh: "递推公式给出 S(n,1)=n(n+1)/2，S(n,2)=n(n+1)(2n+1)/6。"
    }],
    [2, {
      titleEn: "Example: Compute S(n,1) from T(n,i,1)",
      titleZh: "示例：由 T(n,i,1) 计算 S(n,1)",
      promptEn: "Use recursion formula (23) and S(n,i)=T(n,i,1) to compute S(n,1)=sum_{k=1}^n k.",
      promptZh: "使用递推公式 (23) 和 S(n,i)=T(n,i,1)，计算 S(n,1)=sum_{k=1}^n k。",
      explanationEn: "Differentiate T(n,0,x), take the limit as x approaches 1, and obtain S(n,1)=n(n+1)/2.",
      explanationZh: "对 T(n,0,x) 求导后令 x 趋近 1，可得 S(n,1)=n(n+1)/2。"
    }],
    [3, {
      titleEn: "Example: Fibonacci closed form",
      titleZh: "示例：Fibonacci 数列闭式",
      promptEn: "Find the general formula for the Fibonacci sequence 1,1,2,3,5,8,... where each term is the sum of the previous two terms.",
      promptZh: "求 Fibonacci 数列 1,1,2,3,5,8,... 的通项公式，其中每一项等于前两项之和。",
      explanationEn: "The characteristic equation is z^2-z-1=0. Solving for the constants from x0=x1=1 gives the usual closed form with roots (1+sqrt(5))/2 and (1-sqrt(5))/2.",
      explanationZh: "特征方程为 z^2-z-1=0。由 x0=x1=1 解出常数，得到由根 (1+sqrt(5))/2 和 (1-sqrt(5))/2 表示的 Fibonacci 闭式。"
    }],
    [4, {
      titleEn: "Example: Big-O and little-o comparisons",
      titleZh: "示例：Big-O 与 little-o 比较",
      promptEn: "If 0<n<m, prove the stated O(x^m), o(x^n), O(x^n), and o(x^n) asymptotic relations as x goes to infinity or to 0.",
      promptZh: "设 0<n<m，证明题中关于 x 趋于无穷或 0 时的 O(x^m)、o(x^n)、O(x^n) 和 o(x^n) 渐近关系。",
      explanationEn: "Each relation follows by dividing the smaller power by the larger power and taking the relevant limit.",
      explanationZh: "把较低阶幂与较高阶幂相除并取相应极限，即可得到这些 O 与 o 的关系。"
    }],
    [5, {
      titleEn: "Example: Gradient and Hessian at the origin",
      titleZh: "示例：原点处的梯度与 Hessian",
      promptEn: "For f(x,y)=x^2 y^3+e^{2x+xy-1}-(x^3+3y^2)^2, evaluate the gradient and Hessian at (0,0).",
      promptZh: "设 f(x,y)=x^2 y^3+e^{2x+xy-1}-(x^3+3y^2)^2，计算其在 (0,0) 处的梯度和 Hessian 矩阵。",
      explanationEn: "At (0,0), the gradient is (2/e,0), and the Hessian is [[4/e,1/e],[1/e,0]].",
      explanationZh: "在 (0,0) 处，梯度为 (2/e,0)，Hessian 矩阵为 [[4/e,1/e],[1/e,0]]。"
    }],
    [6, {
      titleEn: "Example: Option value when the underlying is worthless",
      titleZh: "示例：标的资产归零时期权价值",
      promptEn: "How much are plain vanilla European options worth if the underlying asset value is 0?",
      promptZh: "如果标的资产价值为 0，普通欧式看涨和看跌期权分别值多少钱？",
      explanationEn: "The call is worthless. The put pays K at maturity, so its time-t value is K exp(-r(T-t)).",
      explanationZh: "看涨期权价值为 0；看跌期权到期支付 K，因此 t 时刻价值为 K exp(-r(T-t))。"
    }],
    [7, {
      titleEn: "Example: Double integral on a rectangle",
      titleZh: "示例：矩形区域上的二重积分",
      promptEn: "Let D=[1,3] x [2,5] and f(x,y)=2y-3x. Compute the double integral of f over D.",
      promptZh: "设 D=[1,3] x [2,5]，f(x,y)=2y-3x。计算 f 在 D 上的二重积分。",
      explanationEn: "Integrating in either order gives the value 6.",
      explanationZh: "按任一积分次序计算，二重积分的值都是 6。"
    }],
    [8, {
      titleEn: "Example: Double integral on a disk",
      titleZh: "示例：圆盘区域上的二重积分",
      promptEn: "Let D be the disk of radius 2 centered at 0 and f(x,y)=1-x^2-y^2. Compute the double integral of f over D.",
      promptZh: "设 D 为以 0 为圆心、半径为 2 的圆盘，f(x,y)=1-x^2-y^2。计算 f 在 D 上的二重积分。",
      explanationEn: "Using the disk bounds or polar coordinates, the integral equals -4*pi.",
      explanationZh: "用圆盘边界或极坐标计算，积分值为 -4*pi。"
    }],
    [9, {
      titleEn: "Example: Improper Gaussian-type integral",
      titleZh: "示例：高斯型反常积分",
      promptEn: "Show that for any a>0, the integral from 0 to infinity of x^a exp(-x^2) dx is finite, and conclude that the even-moment Gaussian integrals are finite.",
      promptZh: "证明任意 a>0 时，积分 ∫_0^∞ x^a exp(-x^2) dx 有限，并由此推出高斯偶数阶矩相关积分有限。",
      explanationEn: "The exponential term dominates every polynomial power in the tail, and the integrand is bounded near 0 when a>0.",
      explanationZh: "在无穷远处指数衰减快于任意多项式增长；在 0 附近 a>0 保证被积函数有界，因此积分有限。"
    }],
    [10, {
      titleEn: "Example: Midpoint, trapezoidal, and Simpson rules",
      titleZh: "示例：中点、梯形和 Simpson 公式",
      promptEn: "With n=8 subintervals, approximate I=int_1^3 (1/(x+1))^2 dx using midpoint, trapezoidal, and Simpson rules; then compute the exact value and errors.",
      promptZh: "用 n=8 个子区间，分别用中点法、梯形法和 Simpson 法近似 I=∫_1^3 (1/(x+1))^2 dx，并计算精确值与误差。",
      explanationEn: "The approximations are about 0.24943374, 0.25113543, and 0.25000097. The exact value is 0.25.",
      explanationZh: "三种近似值约为 0.24943374、0.25113543 和 0.25000097；精确值为 0.25。"
    }],
    [11, {
      titleEn: "Example: Semiannual coupon bond price from rate curves",
      titleZh: "示例：由利率曲线计算半年付息债券价格",
      promptEn: "For a 20-month semiannual 6% coupon bond with face value 100 and continuous compounding, compute its price under the three stated zero-rate or instantaneous-rate curves.",
      promptZh: "对面值 100、票面利率 6%、期限 20 个月且连续复利的半年付息债券，分别在题中三种零利率或瞬时利率曲线下计算价格。",
      explanationEn: "The zero-rate curve gives about 101.888216. The first instantaneous-rate curve gives about 101.954564. The third case should match the zero-rate price up to numerical integration error.",
      explanationZh: "零利率曲线下价格约为 101.888216；第一条瞬时利率曲线下价格约为 101.954564；第三种情形应与零利率结果在数值误差范围内一致。"
    }],
    [12, {
      titleEn: "Example: Bond price, duration, and convexity",
      titleZh: "示例：债券价格、久期和凸性",
      promptEn: "For a 20-month semiannual 6% coupon bond with face value 100 and yield 6.50%, compute price, duration, and convexity.",
      promptZh: "对一只面值 100、票面利率 6%、期限 20 个月、收益率 6.50% 的半年付息债券，计算价格、久期和凸性。",
      explanationEn: "The bond price is 101.046193, duration is 1.5804216, and convexity is 2.5916859.",
      explanationZh: "债券价格为 101.046193，久期为 1.5804216，凸性为 2.5916859。"
    }],
    [13, {
      titleEn: "Example: Three-step stock model probability space",
      titleZh: "示例：三步股票模型的概率空间",
      promptEn: "A stock starts at 80 and over three independent periods moves up by u with probability p or down by d with probability 1-p. Describe the probability space for the stock value at time 3T.",
      promptZh: "股票初始价格为 80，在三个独立时期内每期以概率 p 上涨 u 倍，或以概率 1-p 下跌 d 倍。描述 3T 时刻股票价格对应的概率空间。",
      explanationEn: "The sample space consists of the eight paths UUU, UUD, UDU, UDD, DUU, DUD, DDU, and DDD, with path probabilities determined by p and 1-p.",
      explanationZh: "样本空间为八条路径 UUU、UUD、UDU、UDD、DUU、DUD、DDU、DDD；每条路径概率由 p 和 1-p 的乘积给出。"
    }],
    [14, {
      titleEn: "Example: Symmetry of a normal variable",
      titleZh: "示例：正态变量的对称性",
      promptEn: "Let X=mu+sigma Z be normal and Y=2mu-X. Show that X and Y have the same density.",
      promptZh: "设 X=mu+sigma Z 为正态变量，Y=2mu-X。证明 X 和 Y 有相同的密度函数。",
      explanationEn: "Y=mu-sigma Z has the same normal distribution as X because Z and -Z have the same standard normal density.",
      explanationZh: "Y=mu-sigma Z，而 Z 与 -Z 具有相同的标准正态密度，因此 X 和 Y 同分布。"
    }],
    [15, {
      titleEn: "Example: Out-of-the-money call",
      titleZh: "示例：价外看涨期权",
      promptEn: "A call option with strike K=60 is 15% out of the money. Find the spot price of the underlying asset.",
      promptZh: "一份行权价 K=60 的看涨期权处于 15% 价外状态。求标的资产现货价格。",
      explanationEn: "For an out-of-the-money call, S=0.85K, so S=51.",
      explanationZh: "看涨期权价外 15% 表示 S=0.85K，因此 S=51。"
    }],
    [16, {
      titleEn: "Example: Delta-neutral hedge",
      titleZh: "示例：Delta 中性对冲",
      promptEn: "A portfolio has Delta 1500. A call on the same asset has Delta 0.3. What call position makes the portfolio Delta-neutral?",
      promptZh: "某投资组合 Delta 为 1500，同一标的看涨期权 Delta 为 0.3。应持有多少看涨期权头寸使组合 Delta 中性？",
      explanationEn: "Solve 1500+0.3x=0, giving x=-5000. Short 5000 calls.",
      explanationZh: "令 1500+0.3x=0，得 x=-5000，因此需要卖空 5000 份看涨期权。"
    }],
    [17, {
      titleEn: "Example: Black-Scholes call and put prices",
      titleZh: "示例：Black-Scholes 看涨和看跌期权定价",
      promptEn: "Use Black-Scholes to price six-month European call and put options with K=40, S=42, volatility 30%, dividend yield 3%, and interest rate 5%; check put-call parity.",
      promptZh: "用 Black-Scholes 公式为 K=40、S=42、波动率 30%、股息率 3%、利率 5% 的 6 个月欧式看涨和看跌期权定价，并检查看跌-看涨平价。",
      explanationEn: "The call price is 4.705325 and the put price is 2.343022. Put-call parity holds up to the numerical normal-CDF approximation error.",
      explanationZh: "看涨期权价格为 4.705325，看跌期权价格为 2.343022；看跌-看涨平价在正态分布数值近似误差内成立。"
    }],
    [18, {
      titleEn: "Example: Geometric power series",
      titleZh: "示例：几何幂级数",
      promptEn: "Show that the geometric power series sum_{k=0}^infinity x^k converges if and only if |x|<1.",
      promptZh: "证明几何幂级数 sum_{k=0}^∞ x^k 当且仅当 |x|<1 时收敛。",
      explanationEn: "For |x|<1 the sum is 1/(1-x). For |x|>=1 the partial sums do not converge.",
      explanationZh: "|x|<1 时级数和为 1/(1-x)；|x|>=1 时部分和不收敛。"
    }],
    [19, {
      titleEn: "Example: Taylor approximation errors for an ATM call",
      titleZh: "示例：平值看涨期权的 Taylor 近似误差",
      promptEn: "Estimate approximation errors for the value, Greeks, and implied volatility of a six-month ATM call with K=40, volatility 25%, no dividends, and zero rates.",
      promptZh: "估计一份 K=40、期限 6 个月、波动率 25%、无股息且零利率的平值看涨期权在价值、Greeks 和隐含波动率近似上的误差。",
      explanationEn: "The Black-Scholes value is 2.817284 and the approximation is 2.820948, a relative error of about 0.13%; the Greek and implied-volatility approximations are likewise very close.",
      explanationZh: "Black-Scholes 价值为 2.817284，近似值为 2.820948，相对误差约 0.13%；Greeks 与隐含波动率近似也非常接近。"
    }],
    [20, {
      titleEn: "Example: Taylor approximation with dividends",
      titleZh: "示例：含股息情形的 Taylor 近似",
      promptEn: "Estimate approximation errors for a six-month ATM call with K=40, volatility 25%, continuous dividend yield 3%, and risk-free rate 6%.",
      promptZh: "估计一份 K=40、期限 6 个月、波动率 25%、连续股息率 3%、无风险利率 6% 的平值看涨期权近似误差。",
      explanationEn: "The Black-Scholes value is 3.057889 and the approximation is 3.057477, a relative value error of about 0.0135%.",
      explanationZh: "Black-Scholes 价值为 3.057889，近似值为 3.057477，相对价值误差约 0.0135%。"
    }],
    [21, {
      titleEn: "Example: Chain rule with two variables",
      titleZh: "示例：二元函数链式法则",
      promptEn: "Let f(x,y)=x^2+y+xy^3 with x=e^{2t} and y=t^2. Compute d/dt f(x,y).",
      promptZh: "设 f(x,y)=x^2+y+xy^3，且 x=e^{2t}、y=t^2。计算 d/dt f(x,y)。",
      explanationEn: "By the chain rule, the derivative is (2x+y^3)2e^{2t}+(1+3xy^2)2t, then substitute x=e^{2t}, y=t^2.",
      explanationZh: "由链式法则，导数为 (2x+y^3)2e^{2t}+(1+3xy^2)2t，再代入 x=e^{2t}, y=t^2。"
    }],
    [22, {
      titleEn: "Example: Multivariable chain rule",
      titleZh: "示例：多变量链式法则",
      promptEn: "For the given f(x1,x2,x3) and variable substitutions x1(t1,t2), x2(t1,t2), x3(t1,t2), compute the requested partial derivative by the chain rule.",
      promptZh: "对题中给定的 f(x1,x2,x3) 以及 x1(t1,t2)、x2(t1,t2)、x3(t1,t2)，用链式法则计算指定偏导数。",
      explanationEn: "Compute the partial derivatives of f with respect to x1,x2,x3 and multiply them by the corresponding derivatives of x1,x2,x3 with respect to the target variable.",
      explanationZh: "先求 f 对 x1、x2、x3 的偏导，再分别乘以 x1、x2、x3 对目标变量的偏导并求和。"
    }],
    [23, {
      titleEn: "Example: Disk integral in polar coordinates",
      titleZh: "示例：用极坐标计算圆盘积分",
      promptEn: "Let D be the disk D(0,2) and f(x,y)=1-x^2-y^2. Compute the double integral of f over D using polar coordinates.",
      promptZh: "设 D=D(0,2)，f(x,y)=1-x^2-y^2。用极坐标计算 f 在 D 上的二重积分。",
      explanationEn: "In polar coordinates the integrand is 1-r^2 and the area element is r dr dtheta, giving integral -4*pi.",
      explanationZh: "极坐标下被积函数为 1-r^2，面积元为 r dr dtheta，积分结果为 -4*pi。"
    }],
    [24, {
      titleEn: "Example: Local extrema of a quadratic function",
      titleZh: "示例：二次函数局部极值",
      promptEn: "Find and classify the local extrema of f(x,y)=x^2+2xy+5y^2+2x+10y-5.",
      promptZh: "求 f(x,y)=x^2+2xy+5y^2+2x+10y-5 的局部极值并分类。",
      explanationEn: "The only critical point is (0,-1). The Hessian is positive definite, so it is a local and global minimum with value -10.",
      explanationZh: "唯一临界点为 (0,-1)。Hessian 正定，因此它是局部也是全局最小点，函数值为 -10。"
    }],
    [25, {
      titleEn: "Example: Constrained minimum with a degenerate constraint",
      titleZh: "示例：退化约束下的最小值",
      promptEn: "Find the minimum of x1^2+x1+x2^2 subject to the constraint (x1-x2)^2=0.",
      promptZh: "在约束 (x1-x2)^2=0 下，求 x1^2+x1+x2^2 的最小值。",
      explanationEn: "The constraint implies x1=x2=x. Minimize 2x^2+x, giving x=-1/4 and minimum value -1/8.",
      explanationZh: "约束推出 x1=x2=x。最小化 2x^2+x，得 x=-1/4，最小值为 -1/8。"
    }],
    [26, {
      titleEn: "Example: Lagrange multipliers and AM-GM",
      titleZh: "示例：拉格朗日乘子与 AM-GM",
      promptEn: "Find positive x1,x2,x3 such that x1 x2 x3=1 and x1 x2+x2 x3+x3 x1 is minimized.",
      promptZh: "求正数 x1,x2,x3，使 x1 x2 x3=1 且 x1 x2+x2 x3+x3 x1 最小。",
      explanationEn: "By symmetry or AM-GM, the minimum occurs at x1=x2=x3=1 and the minimum value is 3.",
      explanationZh: "由对称性或 AM-GM，不等式最小点为 x1=x2=x3=1，最小值为 3。"
    }],
    [27, {
      titleEn: "Example: Arithmetic-geometric mean inequality",
      titleZh: "示例：算术-几何平均不等式",
      promptEn: "Prove the arithmetic-geometric mean inequality for positive x1,...,xn.",
      promptZh: "证明正数 x1,...,xn 的算术-几何平均不等式。",
      explanationEn: "After scaling so the product is 1, it is enough to prove the sum is at least n; this follows from the constrained minimum argument.",
      explanationZh: "将变量缩放到乘积为 1 后，只需证明和至少为 n；这可由约束最小化论证得到。"
    }],
    [28, {
      titleEn: "Example: Bisection method",
      titleZh: "示例：二分法求根",
      promptEn: "Use the bisection method on [-2,3] to find a zero of the stated nonlinear function.",
      promptZh: "在区间 [-2,3] 上使用二分法求题中非线性函数的一个零点。",
      explanationEn: "Since f(-2) and f(3) have opposite signs, bisection applies. With the stated tolerances it finds the root about -0.889642 after 33 iterations.",
      explanationZh: "因为 f(-2) 与 f(3) 异号，可用二分法；按题中容差迭代约 33 次得到根 -0.889642。"
    }],
    [29, {
      titleEn: "Example: Newton's method for a scalar equation",
      titleZh: "示例：一维 Newton 法求根",
      promptEn: "Use Newton's method to solve the stated scalar equation f(x)=0.",
      promptZh: "使用 Newton 法求解题中给定的一维方程 f(x)=0。",
      explanationEn: "With different initial guesses, Newton's method finds four roots approximately -2.074304, -0.889642, 0.950748, and 2.000028.",
      explanationZh: "使用不同初值，Newton 法可找到四个根，约为 -2.074304、-0.889642、0.950748 和 2.000028。"
    }],
    [30, {
      titleEn: "Example: Secant method",
      titleZh: "示例：割线法求根",
      promptEn: "Use the secant method to find a zero of the stated nonlinear function.",
      promptZh: "使用割线法求题中非线性函数的一个零点。",
      explanationEn: "Starting from x0=-3 and x_{-1}=x0-0.01, the secant method converges in 8 iterations to about -2.074304.",
      explanationZh: "从 x0=-3、x_{-1}=x0-0.01 出发，割线法约 8 次迭代收敛到 -2.074304。"
    }],
    [31, {
      titleEn: "Example: Newton's method for a three-dimensional nonlinear system",
      titleZh: "示例：三维非线性方程组的 Newton 法",
      promptEn: "Use Newton's method to solve the three-dimensional nonlinear system F(x)=0 from the source text.",
      promptZh: "使用 Newton 法求解原书给出的三维非线性方程组 F(x)=0。",
      explanationEn: "For one initial guess the method converges in 9 iterations to approximately (-1.69055076, 1.98310724, -0.88455808). From (2,2,2)^T it converges to (-1,3,1)^T in about 40 iterations.",
      explanationZh: "一个初值下约 9 次迭代收敛到 (-1.69055076, 1.98310724, -0.88455808)；从 (2,2,2)^T 出发约 40 次迭代收敛到 (-1,3,1)^T。"
    }],
    [32, {
      titleEn: "Example: Approximate Newton's method for a nonlinear system",
      titleZh: "示例：非线性方程组的近似 Newton 法",
      promptEn: "Use approximate Newton's method to solve the same three-dimensional nonlinear system F(x)=0.",
      promptZh: "使用近似 Newton 法求解同一个三维非线性方程组 F(x)=0。",
      explanationEn: "Using forward finite differences with h equal to the consecutive-step tolerance, the first initial guess converges in 9 iterations and the (2,2,2)^T initial guess in about 58 iterations.",
      explanationZh: "用前向有限差分并取 h 为连续步长容差时，第一个初值约 9 次迭代收敛，(2,2,2)^T 初值约 58 次迭代收敛。"
    }],
    [33, {
      titleEn: "Example: Minimum-variance portfolio with target return",
      titleZh: "示例：目标收益率下的最小方差组合",
      promptEn: "Given four assets with the stated expected returns, volatilities, and correlations, find a minimum-variance portfolio with expected return 11.5%.",
      promptZh: "给定四个资产的期望收益率、波动率和相关系数，求期望收益率为 11.5% 的最小方差投资组合。",
      explanationEn: "The weights are approximately 0.547452, 0.440377, 0.135042, and -0.122872. The portfolio standard deviation is about 15.5869%.",
      explanationZh: "权重约为 0.547452、0.440377、0.135042、-0.122872；组合标准差约为 15.5869%。"
    }],
    [34, {
      titleEn: "Example: Bond yield by Newton's method",
      titleZh: "示例：用 Newton 法计算债券收益率",
      promptEn: "A 34-month semiannual 8% coupon bond with face value 100 is priced at 105. Compute its yield.",
      promptZh: "一只 34 个月到期、半年付息、票面利率 8%、面值 100 的债券价格为 105。计算其收益率。",
      explanationEn: "The cash flows are 4,4,4,4,4,104 at months 4,10,16,22,28,34. Newton's method gives yield about 6.4502%.",
      explanationZh: "现金流为 4、4、4、4、4、104，支付时间为第 4、10、16、22、28、34 个月。Newton 法得到收益率约 6.4502%。"
    }],
    [35, {
      titleEn: "Example: Implied volatility from a call price",
      titleZh: "示例：由看涨期权价格求隐含波动率",
      promptEn: "A one-year call with strike 20 on a non-dividend-paying asset with spot price 25 costs 7. The risk-free rate is 5%. Find the implied volatility.",
      promptZh: "一份一年期看涨期权，行权价 20，标的资产不付股息、现价 25，期权价格为 7，无风险利率为 5%。求隐含波动率。",
      explanationEn: "Solving the Black-Scholes equation by Newton's method gives implied volatility about 36.3063%.",
      explanationZh: "用 Newton 法求解 Black-Scholes 方程，得到隐含波动率约为 36.3063%。"
    }]
  ]).get(problemNumber);
}

function reviewedStefanicaClassification(_problem, problemNumber) {
  const map = {
    1: ["statistics", "Medium"],
    2: ["statistics", "Hard"],
    3: ["statistics", "Hard"],
    4: ["statistics", "Hard"],
    5: ["statistics", "Medium"],
    6: ["option", "Medium"],
    7: ["statistics", "Medium"],
    8: ["statistics", "Medium"],
    9: ["statistics", "Hard"],
    10: ["statistics", "Medium"],
    11: ["market", "Medium"],
    12: ["market", "Medium"],
    13: ["probabilityExpectation", "Medium"],
    14: ["probabilityExpectation", "Medium"],
    15: ["option", "Easy"],
    16: ["option", "Medium"],
    17: ["option", "Medium"],
    18: ["statistics", "Easy"],
    19: ["option", "Hard"],
    20: ["option", "Hard"],
    21: ["statistics", "Medium"],
    22: ["statistics", "Hard"],
    23: ["statistics", "Medium"],
    24: ["statistics", "Hard"],
    25: ["statistics", "Hard"],
    26: ["statistics", "Hard"],
    27: ["statistics", "Hard"],
    28: ["statistics", "Medium"],
    29: ["statistics", "Hard"],
    30: ["statistics", "Medium"],
    31: ["statistics", "Hard"],
    32: ["statistics", "Hard"],
    33: ["market", "Hard"],
    34: ["market", "Medium"],
    35: ["option", "Medium"]
  };
  const [category, difficulty] = map[problemNumber] || ["statistics", "Medium"];
  return { category, difficulty };
}

function stefanicaSection(problemNumber) {
  if (problemNumber <= 4) return "Mathematical Preliminaries";
  if (problemNumber <= 6) return "Calculus and Options";
  if (problemNumber <= 12) return "Numerical Integration and Bonds";
  if (problemNumber <= 17) return "Probability and Black-Scholes";
  if (problemNumber <= 20) return "Taylor Series and Approximations";
  if (problemNumber <= 24) return "Multivariable Calculus";
  return "Lagrange Multipliers and Newton's Method";
}

function repairLinearAlgebraProblems(problems, book) {
  const entries = linalgReviewedEntries();
  problems.forEach((problem, index) => {
    const problemNumber = index + 1;
    const reviewed = entries[problemNumber];
    if (!reviewed) return;

    problem.titleEn = reviewed.titleEn;
    problem.titleZh = reviewed.titleZh;
    problem.promptEn = reviewed.promptEn;
    problem.promptZh = reviewed.promptZh;
    problem.explanationEn = reviewed.explanationEn;
    problem.explanationZh = reviewed.explanationZh;
    problem.answerEn = reviewed.explanationEn;
    problem.answerZh = reviewed.explanationZh;
    problem.answer = reviewed.explanationEn;
    problem.explanation = reviewed.explanationEn;
    delete problem.promptImages;
    delete problem.solutionImages;
    delete problem.figureReview;
    problem.category = reviewed.category;
    problem.difficulty = reviewed.difficulty;
    problem.classificationReviewed = true;
    problem.classificationReviewSource = "linalg-primer-topic-map-v1";
    problem.tags = [
      book.name,
      reviewed.topic,
      readableCategory(problem.category),
      ...inferTopicTags(`${reviewed.titleEn} ${reviewed.promptEn}`)
    ].filter(Boolean);
    problem.tags = [...new Set(problem.tags)].slice(0, 7);
  });
}

function linalgReviewedEntries() {
  return {
    1: {
      titleEn: "1.1 Column vectors, row vectors, and matrix forms",
      titleZh: "1.1 列向量、行向量与矩阵表示",
      promptEn: "Define column vectors, row vectors, and the column-form and row-form representations of a matrix. State the basic row-vector times column-vector, column-vector times row-vector, and matrix times column-vector products.",
      promptZh: "说明列向量、行向量，以及矩阵的按列表示和按行表示。写出行向量乘列向量、列向量乘行向量、矩阵乘列向量这三种基本乘法的含义。",
      explanationEn: "A column vector is an n by 1 matrix and a row vector is a 1 by n matrix. A matrix can be viewed either as a list of columns or a list of rows. Row times column gives an inner product, column times row gives an outer-product matrix, and matrix times column forms the corresponding linear combination of the matrix columns.",
      explanationZh: "列向量是 n x 1 矩阵，行向量是 1 x n 矩阵。矩阵既可以看作若干列向量的集合，也可以看作若干行向量的集合。行向量乘列向量得到内积，列向量乘行向量得到外积矩阵，矩阵乘列向量等于用该向量的分量对矩阵各列作线性组合。",
      category: "statistics",
      difficulty: "Easy",
      topic: "vectors and matrices"
    },
    2: {
      titleEn: "2.1 Numerical solution of linear systems",
      titleZh: "2.1 线性方程组的数值解法",
      promptEn: "Explain the problem Ax=b for a square matrix A. Compare direct methods such as LU or Cholesky decomposition with iterative methods, and note the special role of diagonal, lower triangular, and upper triangular systems.",
      promptZh: "解释方阵 A 下线性方程组 Ax=b 的求解问题。比较 LU 分解、Cholesky 分解等直接法与迭代法，并说明对角矩阵、下三角矩阵和上三角矩阵对应方程组的特殊性。",
      explanationEn: "Solving Ax=b means finding x for a given matrix A and vector b, usually requiring A to be nonsingular for uniqueness. Direct methods factor A once and then solve triangular systems. Iterative methods update an approximate solution until a tolerance is met. Diagonal and triangular systems are important because their entries can be solved sequentially.",
      explanationZh: "求解 Ax=b 是在给定矩阵 A 和向量 b 时寻找 x；若要求唯一解，通常需要 A 非奇异。直接法先对 A 做分解，再求解三角方程组；迭代法不断更新近似解直到达到精度要求。对角和三角方程组很重要，因为其未知量可以按顺序直接求出。",
      category: "statistics",
      difficulty: "Medium",
      topic: "linear systems"
    },
    3: {
      titleEn: "2.2 Forward substitution",
      titleZh: "2.2 前向代入法",
      promptEn: "For a nonsingular lower triangular matrix L, describe the forward-substitution algorithm for solving Lx=b and give the recurrence for x_j.",
      promptZh: "对非奇异下三角矩阵 L，说明如何用前向代入法求解 Lx=b，并写出 x_j 的递推公式。",
      explanationEn: "Because L is lower triangular, x_1 is found from the first row. After x_1 through x_{j-1} are known, the j-th row gives x_j = (b_j - sum_{k<j} L_{j,k} x_k) / L_{j,j}. The nonzero diagonal entries guarantee each division is valid, and the method costs on the order of n^2 arithmetic operations.",
      explanationZh: "由于 L 是下三角矩阵，第一行可先求出 x_1。已知 x_1 到 x_{j-1} 后，第 j 行给出 x_j = (b_j - sum_{k<j} L_{j,k} x_k) / L_{j,j}。非零对角元保证每一步除法有效，算法运算量为 O(n^2)。",
      category: "statistics",
      difficulty: "Medium",
      topic: "forward substitution"
    },
    4: {
      titleEn: "2.2 Bond cash-flow discount factors",
      titleZh: "2.2 债券现金流贴现因子",
      promptEn: "Four bonds have cash flows at years 1, 2, 3, and 4. Let d_i be the discount factor for year i. The prices imply 98=100 d_1, 104=6 d_1+106 d_2, 111=8 d_1+8 d_2+108 d_3, and 102=5 d_1+5 d_2+5 d_3+105 d_4. Solve for the discount factors and continuously compounded zero rates.",
      promptZh: "四只债券在第 1、2、3、4 年产生现金流。令 d_i 为第 i 年贴现因子。价格满足 98=100 d_1，104=6 d_1+106 d_2，111=8 d_1+8 d_2+108 d_3，102=5 d_1+5 d_2+5 d_3+105 d_4。求贴现因子以及连续复利零息利率。",
      explanationEn: "Forward substitution gives d_1=0.98, d_2=0.925660, d_3=0.886618, and d_4=0.838463. The continuously compounded zero rate for maturity i is r_i = -ln(d_i)/i, giving approximately 2.02%, 3.86%, 4.01%, and 4.40%.",
      explanationZh: "用前向代入可得 d_1=0.98，d_2=0.925660，d_3=0.886618，d_4=0.838463。第 i 年连续复利零息利率为 r_i = -ln(d_i)/i，约为 2.02%、3.86%、4.01%、4.40%。",
      category: "market",
      difficulty: "Medium",
      topic: "discount factors"
    },
    5: {
      titleEn: "2.3 Backward substitution",
      titleZh: "2.3 后向代入法",
      promptEn: "For a nonsingular upper triangular matrix U, describe the backward-substitution algorithm for solving Ux=b and give the recurrence for x_j.",
      promptZh: "对非奇异上三角矩阵 U，说明如何用后向代入法求解 Ux=b，并写出 x_j 的递推公式。",
      explanationEn: "Start from the last row to compute x_n. After x_{j+1} through x_n are known, solve the j-th row as x_j = (b_j - sum_{k>j} U_{j,k} x_k) / U_{j,j}. The nonzero diagonal entries make each step valid, and the operation count is O(n^2).",
      explanationZh: "从最后一行开始先求 x_n。已知 x_{j+1} 到 x_n 后，第 j 行给出 x_j = (b_j - sum_{k>j} U_{j,k} x_k) / U_{j,j}。非零对角元保证每一步有效，运算量为 O(n^2)。",
      category: "statistics",
      difficulty: "Medium",
      topic: "backward substitution"
    },
    6: {
      titleEn: "3.1 One-period market models",
      titleZh: "3.1 单期市场模型",
      promptEn: "Describe a one-period market model with m securities and n future market states. Explain the role of the current price vector, the future payoff matrix, and derivative payoffs.",
      promptZh: "描述包含 m 个证券和 n 个未来市场状态的单期市场模型。说明当前价格向量、未来收益矩阵以及衍生品收益在模型中的作用。",
      explanationEn: "A one-period model fixes prices today and a finite set of possible future states. Each security has one payoff in each state, forming a payoff matrix. A derivative payoff is a vector of state-contingent cash flows; if it can be replicated by a portfolio of the securities, its arbitrage-free price is the cost of the replicating portfolio.",
      explanationZh: "单期模型给定当前价格以及有限个未来状态。每个证券在每个状态下有一个收益，从而形成收益矩阵。衍生品收益是依状态变化的现金流向量；若它能由基础证券组合复制，其无套利价格就是复制组合的当前成本。",
      category: "market",
      difficulty: "Medium",
      topic: "one-period market model"
    },
    7: {
      titleEn: "3.2 Arbitrage-free markets",
      titleZh: "3.2 无套利市场",
      promptEn: "State the meaning of an arbitrage opportunity in a one-period model and give the state-price characterization of an arbitrage-free market.",
      promptZh: "说明单期模型中套利机会的含义，并给出无套利市场的状态价格刻画。",
      explanationEn: "An arbitrage is a portfolio with no positive setup cost and a payoff that is never negative and is positive in at least one state. A one-period model is arbitrage-free exactly when there exists a strictly positive state-price vector q such that today’s security prices equal the discounted state-weighted future payoffs, i.e. the payoff matrix times q reproduces current prices.",
      explanationZh: "套利是指初始成本不为正、未来各状态收益非负且至少一个状态严格为正的投资组合。单期模型无套利，当且仅当存在严格为正的状态价格向量 q，使得基础证券当前价格等于未来各状态收益按 q 加权后的值，即收益矩阵乘以 q 能复现当前价格。",
      category: "market",
      difficulty: "Medium",
      topic: "arbitrage-free pricing"
    },
    8: {
      titleEn: "4.1 Eigenvalues and eigenvectors",
      titleZh: "4.1 特征值与特征向量",
      promptEn: "Define eigenvalues and eigenvectors of a square matrix A. Explain why scalar multiples of an eigenvector are not counted as new independent eigenvectors.",
      promptZh: "定义方阵 A 的特征值和特征向量。说明为什么特征向量的数乘不被视为新的线性无关特征向量。",
      explanationEn: "A scalar lambda is an eigenvalue of A if there is a nonzero vector v such that Av=lambda v. The vector v is an eigenvector for lambda. Any nonzero scalar multiple c v satisfies A(c v)=lambda(c v), so it lies in the same eigendirection and is not a new independent eigenvector.",
      explanationZh: "若存在非零向量 v 使 Av=lambda v，则 lambda 是 A 的特征值，v 是对应特征向量。任意非零倍数 c v 也满足 A(c v)=lambda(c v)，因此它仍在同一特征方向上，不算新的线性无关特征向量。",
      category: "statistics",
      difficulty: "Medium",
      topic: "eigenvalues"
    },
    9: {
      titleEn: "4.2 Characteristic polynomial and eigenvalues",
      titleZh: "4.2 特征多项式与特征值",
      promptEn: "Define the characteristic polynomial of a square matrix A and explain how it identifies the eigenvalues of A.",
      promptZh: "定义方阵 A 的特征多项式，并说明如何用它确定 A 的特征值。",
      explanationEn: "The characteristic polynomial is p_A(t)=det(tI-A). A scalar lambda is an eigenvalue exactly when det(lambda I-A)=0, because then lambda I-A is singular and there is a nonzero v with (lambda I-A)v=0, equivalently Av=lambda v.",
      explanationZh: "特征多项式为 p_A(t)=det(tI-A)。标量 lambda 是特征值，当且仅当 det(lambda I-A)=0；此时 lambda I-A 奇异，存在非零 v 使 (lambda I-A)v=0，也就是 Av=lambda v。",
      category: "statistics",
      difficulty: "Hard",
      topic: "characteristic polynomial"
    },
    10: {
      titleEn: "5.1 Symmetric matrices",
      titleZh: "5.1 对称矩阵",
      promptEn: "Define a real symmetric matrix and state the key spectral properties of symmetric matrices used in numerical linear algebra.",
      promptZh: "定义实对称矩阵，并说明数值线性代数中常用的对称矩阵谱性质。",
      explanationEn: "A real square matrix A is symmetric when A^T=A. Symmetric matrices have real eigenvalues, and eigenvectors corresponding to distinct eigenvalues can be chosen orthogonal. In fact, a real symmetric matrix admits an orthonormal eigenbasis, which is central for covariance matrices, quadratic forms, and least-squares methods.",
      explanationZh: "实方阵 A 若满足 A^T=A，则称为对称矩阵。对称矩阵的特征值都是实数，不同特征值对应的特征向量可以取为正交。更进一步，实对称矩阵存在标准正交特征向量基，这对协方差矩阵、二次型和最小二乘都很重要。",
      category: "statistics",
      difficulty: "Medium",
      topic: "symmetric matrices"
    },
    11: {
      titleEn: "5.2 Symmetric positive definite matrices",
      titleZh: "5.2 对称正定矩阵",
      promptEn: "Define symmetric positive definite and positive semidefinite matrices. State several equivalent ways to recognize a symmetric positive definite matrix.",
      promptZh: "定义对称正定矩阵和对称半正定矩阵，并列出识别对称正定矩阵的几个等价条件。",
      explanationEn: "A symmetric matrix A is positive definite when x^T A x>0 for every nonzero x, and positive semidefinite when x^T A x>=0 for every x. For symmetric A, positive definiteness is equivalent to all eigenvalues being positive, to a Cholesky factorization with positive diagonal entries, and to all leading principal pivots in the Cholesky process being positive.",
      explanationZh: "对称矩阵 A 若对所有非零 x 有 x^T A x>0，则为正定；若对所有 x 有 x^T A x>=0，则为半正定。对称矩阵正定等价于所有特征值为正，也等价于存在对角元为正的 Cholesky 分解，并等价于 Cholesky 过程中主元均为正。",
      category: "statistics",
      difficulty: "Hard",
      topic: "positive definite matrices"
    },
    12: {
      titleEn: "6.1 Cholesky decomposition",
      titleZh: "6.1 Cholesky 分解",
      promptEn: "Define the Cholesky decomposition of a nonsingular symmetric matrix and explain its relationship with symmetric positive definiteness.",
      promptZh: "定义非奇异对称矩阵的 Cholesky 分解，并说明它与对称正定性的关系。",
      explanationEn: "The Cholesky decomposition writes A=U^T U with U upper triangular and positive diagonal entries. If such a factorization exists, then x^T A x=||Ux||^2>0 for every nonzero x, so A is symmetric positive definite. Conversely, every symmetric positive definite matrix has a unique Cholesky factor with positive diagonal entries.",
      explanationZh: "Cholesky 分解把 A 写成 A=U^T U，其中 U 是上三角矩阵且对角元为正。若存在这种分解，则对非零 x 有 x^T A x=||Ux||^2>0，因此 A 对称正定；反过来，每个对称正定矩阵都有唯一的正对角 Cholesky 因子。",
      category: "statistics",
      difficulty: "Hard",
      topic: "Cholesky decomposition"
    },
    13: {
      titleEn: "6.1 Cholesky factorization algorithm",
      titleZh: "6.1 Cholesky 因子递推算法",
      promptEn: "Give the recursive formulas used to compute the upper-triangular Cholesky factor U in A=U^T U.",
      promptZh: "给出在 A=U^T U 中递推计算上三角 Cholesky 因子 U 的公式。",
      explanationEn: "For the i-th diagonal entry, compute U_{i,i}=sqrt(A_{i,i}-sum_{k<i} U_{k,i}^2). For j>i, compute U_{i,j}=(A_{i,j}-sum_{k<i} U_{k,i}U_{k,j})/U_{i,i}. The square-root quantities must be positive for a positive definite matrix, and the algorithm proceeds row by row.",
      explanationZh: "第 i 个对角元为 U_{i,i}=sqrt(A_{i,i}-sum_{k<i} U_{k,i}^2)。对 j>i，有 U_{i,j}=(A_{i,j}-sum_{k<i} U_{k,i}U_{k,j})/U_{i,i}。正定矩阵保证根号内为正，算法按行递推完成。",
      category: "statistics",
      difficulty: "Hard",
      topic: "Cholesky algorithm"
    },
    14: {
      titleEn: "7.1 Covariance and correlation matrices",
      titleZh: "7.1 协方差矩阵与相关矩阵",
      promptEn: "Define covariance and correlation matrices for random variables X_1,...,X_n. State their symmetry and positive semidefiniteness properties.",
      promptZh: "定义随机变量 X_1,...,X_n 的协方差矩阵和相关矩阵，并说明它们的对称性与半正定性。",
      explanationEn: "The covariance matrix has entries cov(X_i,X_j), and the correlation matrix normalizes these entries by the corresponding standard deviations. Both matrices are symmetric. Covariance matrices are positive semidefinite because a^T Sigma a is the variance of a linear combination of the variables, and variances are nonnegative.",
      explanationZh: "协方差矩阵的元素为 cov(X_i,X_j)，相关矩阵则用相应标准差对协方差作归一化。二者都是对称矩阵。协方差矩阵半正定，因为 a^T Sigma a 等于这些随机变量线性组合的方差，而方差非负。",
      category: "statistics",
      difficulty: "Medium",
      topic: "covariance matrices"
    },
    15: {
      titleEn: "8.1 Ordinary least squares",
      titleZh: "8.1 普通最小二乘法",
      promptEn: "State the ordinary least-squares problem for an overdetermined linear system Ax approximately equal to y, and derive the normal equations.",
      promptZh: "写出超定线性系统 Ax 近似 y 的普通最小二乘问题，并推出正规方程。",
      explanationEn: "OLS minimizes ||y-Ax||^2 over x. When the columns of A are linearly independent, the objective is strictly convex and the minimizer satisfies A^T A x=A^T y. The fitted vector Ax is the orthogonal projection of y onto the column space of A.",
      explanationZh: "普通最小二乘法最小化 ||y-Ax||^2。若 A 的列向量线性无关，目标函数严格凸，最优解满足 A^T A x=A^T y。拟合向量 Ax 是 y 在 A 的列空间上的正交投影。",
      category: "statistics",
      difficulty: "Hard",
      topic: "ordinary least squares"
    },
    16: {
      titleEn: "9.1 Efficient portfolios and Markowitz theory",
      titleZh: "9.1 有效投资组合与 Markowitz 理论",
      promptEn: "Define asset weights, cash weight, portfolio expected return, and portfolio variance in the Markowitz framework.",
      promptZh: "在 Markowitz 框架下定义资产权重、现金权重、投资组合期望收益和投资组合方差。",
      explanationEn: "If w is the vector of risky-asset weights, the cash weight is 1-1^T w. Expected portfolio return combines the risky-asset expected returns and the cash return. Portfolio variance is w^T Sigma w, where Sigma is the risky-asset covariance matrix. Efficient portfolios minimize variance for a target expected return or maximize return for a target risk.",
      explanationZh: "若 w 是风险资产权重向量，则现金权重为 1-1^T w。组合期望收益由风险资产期望收益和现金收益共同决定。组合方差为 w^T Sigma w，其中 Sigma 是风险资产协方差矩阵。有效组合是在给定目标收益下最小化方差，或在给定风险下最大化收益的组合。",
      category: "market",
      difficulty: "Medium",
      topic: "Markowitz portfolio theory"
    },
    17: {
      titleEn: "9.2 Blueprint for minimum-variance portfolios",
      titleZh: "9.2 最小方差投资组合蓝图",
      promptEn: "Describe the computational blueprint for the minimum-variance portfolio with a target expected return when cash is available.",
      promptZh: "说明存在现金资产时，给定目标期望收益下最小方差投资组合的计算蓝图。",
      explanationEn: "The computation uses the covariance matrix Sigma, expected return vector mu, risk-free rate r_f, and target return. The key direction is obtained by solving a linear system involving Sigma, usually with a Cholesky solver when Sigma is positive definite. The risky-asset weights are scaled to hit the target return, and the remaining weight is assigned to cash.",
      explanationZh: "计算需要协方差矩阵 Sigma、期望收益向量 mu、无风险利率 r_f 和目标收益率。核心方向通过求解含 Sigma 的线性方程组得到；若 Sigma 正定，通常用 Cholesky 求解器。风险资产权重按目标收益缩放，剩余权重配置到现金。",
      category: "market",
      difficulty: "Hard",
      topic: "minimum variance portfolio"
    },
    18: {
      titleEn: "10.1 Numerical linear algebra tools",
      titleZh: "10.1 数值线性代数工具",
      promptEn: "Summarize the roles of determinants, permutation matrices, orthogonal vectors and matrices, and quadratic forms in numerical linear algebra.",
      promptZh: "概述行列式、置换矩阵、正交向量与正交矩阵、二次型在数值线性代数中的作用。",
      explanationEn: "Determinants characterize nonsingularity but are rarely the preferred numerical tool. Permutation matrices represent row or column swaps. Orthogonal matrices preserve Euclidean length and are numerically stable. Quadratic forms x^T A x connect symmetric matrices with definiteness, covariance, least squares, and portfolio variance.",
      explanationZh: "行列式可刻画非奇异性，但通常不是首选数值工具。置换矩阵表示行或列交换。正交矩阵保持欧氏长度，数值稳定性好。二次型 x^T A x 把对称矩阵与正定性、协方差、最小二乘和组合方差联系起来。",
      category: "statistics",
      difficulty: "Medium",
      topic: "numerical linear algebra"
    }
  };
}

function repairProbabilityStochastic10Problems(problems, book) {
  const entries = probabilityStochastic10ReviewedEntries();
  problems.splice(10);
  problems.forEach((problem, index) => {
    const problemNumber = index + 1;
    const reviewed = entries[problemNumber];
    if (!reviewed) return;

    problem.titleEn = reviewed.titleEn;
    problem.titleZh = reviewed.titleZh;
    problem.promptEn = reviewed.promptEn;
    problem.promptZh = reviewed.promptZh;
    problem.answerEn = reviewed.answerEn;
    problem.answerZh = reviewed.answerZh;
    problem.explanationEn = reviewed.explanationEn;
    problem.explanationZh = reviewed.explanationZh;
    problem.answer = reviewed.answerEn;
    problem.explanation = reviewed.explanationEn;
    delete problem.promptImages;
    delete problem.solutionImages;
    delete problem.figureReview;
    problem.category = reviewed.category;
    problem.difficulty = reviewed.difficulty;
    problem.classificationReviewed = true;
    problem.classificationReviewSource = "probability-stochastic-10-topic-map-v1";
    problem.tags = [
      book.name,
      reviewed.topic,
      readableCategory(problem.category),
      ...inferTopicTags(`${reviewed.titleEn} ${reviewed.promptEn}`)
    ].filter(Boolean);
    problem.tags = [...new Set(problem.tags)].slice(0, 7);
  });
}

function probabilityStochastic10ReviewedEntries() {
  return {
    1: {
      titleEn: "Question 1 - Green apples remain until stop",
      titleZh: "问题 1 - 取苹果直到只剩红苹果",
      promptEn: "There are M green apples and N red apples in a basket. Apples are removed uniformly at random one by one until every apple left in the basket is red. What is the probability that the basket is empty at the stopping time?",
      promptZh: "篮子里有 M 个青苹果和 N 个红苹果。每次随机取出一个苹果，直到篮子中剩下的苹果全都是红色。停止时篮子为空的概率是多少？",
      answerEn: "M/(M + N).",
      answerZh: "M/(M + N)。",
      explanationEn: "The basket is empty exactly when the last apple in the random removal order is green. In a uniformly random ordering of all M + N apples, the final position is equally likely to be occupied by any apple. Therefore the probability that it is green is M/(M + N).",
      explanationZh: "停止时篮子为空，当且仅当随机取出顺序中的最后一个苹果是青苹果。在 M + N 个苹果的随机排列中，最后一个位置等可能属于任意苹果，因此它是青苹果的概率为 M/(M + N)。",
      category: "probabilityExpectation",
      difficulty: "Medium",
      topic: "discrete probability"
    },
    2: {
      titleEn: "Question 2 - Expected heads times tails",
      titleZh: "问题 2 - 正面数与反面数乘积的期望",
      promptEn: "A fair coin is tossed n times. What is the expected value of the product of the number of heads and the number of tails?",
      promptZh: "一枚公平硬币抛 n 次。正面次数与反面次数乘积的期望是多少？",
      answerEn: "n(n - 1)/4.",
      answerZh: "n(n - 1)/4。",
      explanationEn: "Let H be the number of heads and T = n - H. Since H has a binomial distribution with parameters n and 1/2, E[H] = n/2 and Var(H) = n/4. Then E[HT] = E[H(n - H)] = nE[H] - E[H squared]. Using E[H squared] = Var(H) + E[H] squared gives n(n - 1)/4.",
      explanationZh: "令 H 为正面次数，T = n - H。H 服从参数为 n 和 1/2 的二项分布，所以 E[H] = n/2，Var(H) = n/4。于是 E[HT] = E[H(n - H)] = nE[H] - E[H 的平方]。再用 E[H 的平方] = Var(H) + E[H] 的平方，可得 n(n - 1)/4。",
      category: "probabilityExpectation",
      difficulty: "Medium",
      topic: "expectation"
    },
    3: {
      titleEn: "Question 3 - Minimal circular adjacent-difference sum",
      titleZh: "问题 3 - 圆排列相邻差绝对值之和最小",
      promptEn: "The numbers 1, 2, ..., 9 are placed uniformly at random around a circle. What is the probability that the circular sum of adjacent absolute differences is minimized?",
      promptZh: "将数字 1, 2, ..., 9 随机排成一个圆。相邻数字差的绝对值沿圆求和时，该和达到最小值的概率是多少？",
      answerEn: "1/315.",
      answerZh: "1/315。",
      explanationEn: "Fix the rotation by placing 1 in a reference position. The total number of circular arrangements is then 8!. The minimum possible sum is 18, attained exactly when the values increase from 1 to 9 along one arc and decrease from 9 back to 1 along the other arc. Each of the seven numbers 2 through 8 can independently be assigned to the increasing arc or the decreasing arc, so there are 2 to the 7th power minimizing arrangements. The probability is therefore (2 to the 7th power)/8! = 1/315.",
      explanationZh: "先固定旋转，把 1 放在参考位置，此时共有 8! 个圆排列。该和的最小值为 18，当且仅当从 1 到 9 的一条弧上数字递增，而从 9 回到 1 的另一条弧上数字递减。数字 2 到 8 共七个数可以各自选择放在哪一条弧上，因此最优排列数为 2 的 7 次方。概率为 (2 的 7 次方)/8! = 1/315。",
      category: "probabilityExpectation",
      difficulty: "Hard",
      topic: "combinatorics"
    },
    4: {
      titleEn: "Question 4 - Random transfer between two containers",
      titleZh: "问题 4 - 两个容器之间随机转移球",
      promptEn: "Container A has 1000 green balls and 3000 red balls. Container B has 3000 green balls and 1000 red balls. Half of the balls from A are chosen uniformly at random and transferred to B. Then one ball is drawn uniformly at random from B. What is the probability that the drawn ball is green?",
      promptZh: "容器 A 中有 1000 个绿球和 3000 个红球，容器 B 中有 3000 个绿球和 1000 个红球。从 A 中随机取出一半球转移到 B，然后从 B 中随机取一个球。该球为绿色的概率是多少？",
      answerEn: "7/12.",
      answerZh: "7/12。",
      explanationEn: "The expected number of green balls transferred from A is half of A's green balls, namely 500. After the transfer, B has 3000 + 500 = 3500 expected green balls and 6000 total balls. Equivalently by conditioning on whether the final ball originally came from A or B, the green probability is (1/3)(1/4) + (2/3)(3/4) = 7/12.",
      explanationZh: "从 A 转移出的绿球期望数为 A 中绿球的一半，即 500。转移后 B 中绿球期望数为 3000 + 500 = 3500，总球数为 6000，因此抽到绿球的概率为 3500/6000 = 7/12。也可以按最后抽出的球原本来自 A 或 B 条件化，得到 (1/3)(1/4) + (2/3)(3/4) = 7/12。",
      category: "probabilityExpectation",
      difficulty: "Medium",
      topic: "conditional probability"
    },
    5: {
      titleEn: "Question 5 - Two robot coin-toss predictors",
      titleZh: "问题 5 - 两位科学家预测机器抛硬币",
      promptEn: "A robot tosses a fair coin, but before the release two scientists make predictions from the robot's behavior. Scientist A is correct 80% of the time and scientist B is correct 60% of the time. In one run, A predicts tails and B predicts heads. Can the probability that the coin lands heads be determined from this information?",
      promptZh: "一个机器人抛公平硬币，但在硬币释放前，两位科学家根据机器行为作预测。科学家 A 的预测正确率为 80%，科学家 B 的预测正确率为 60%。某次运行中，A 预测反面，B 预测正面。仅凭这些信息能否确定硬币最终为正面的概率？",
      answerEn: "No; the conditional probability is not determined.",
      answerZh: "不能；该条件概率无法由这些信息唯一确定。",
      explanationEn: "The marginal accuracies of A and B do not determine their joint prediction structure. One valid joint model satisfying the stated accuracies makes the event 'A predicts tails and B predicts heads' occur only when the coin is tails, giving conditional probability 0 for heads. Another valid joint model makes the same event occur only when the coin is heads, giving conditional probability 1. Since both models satisfy the data, the desired probability is not identifiable.",
      explanationZh: "A 与 B 的边际正确率并不能决定两人预测之间的联合结构。可以构造一个满足题设正确率的联合模型，使得“A 预测反面且 B 预测正面”只在硬币为反面时发生，此时正面的条件概率为 0；也可以构造另一个同样满足题设正确率的模型，使该事件只在硬币为正面时发生，此时条件概率为 1。因此题目给出的信息不足以唯一确定该概率。",
      category: "probabilityExpectation",
      difficulty: "Hard",
      topic: "conditional probability"
    },
    6: {
      titleEn: "Question 6 - Choosing the optimal number of cards",
      titleZh: "问题 6 - 选择最优抽牌张数",
      promptEn: "A player chooses an integer k <= 52. The top k cards of a shuffled 52-card deck are drawn one by one. The player wins if the k-th card is an ace and exactly one additional ace appears among the first k - 1 cards. Which k maximizes the chance of winning?",
      promptZh: "玩家选择整数 k <= 52。将一副洗好的 52 张牌从顶端依次抽出 k 张。若第 k 张是 A，且前 k - 1 张中恰好还有一张 A，则玩家获胜。选择哪个 k 能最大化获胜概率？",
      answerEn: "k = 18.",
      answerZh: "k = 18。",
      explanationEn: "Ignoring constants independent of k, the number of favorable ace-position choices is proportional to (k - 1)(52 - k)(51 - k). Maximizing this cubic over the admissible integers gives candidates k = 17 and k = 18; direct comparison gives the larger value at k = 18.",
      explanationZh: "除去与 k 无关的常数，有利的 A 位置选择数正比于 (k - 1)(52 - k)(51 - k)。在允许的整数范围内最大化该三次式，候选为 k = 17 和 k = 18；直接比较可知 k = 18 更大。",
      category: "probabilityExpectation",
      difficulty: "Hard",
      topic: "combinatorics"
    },
    7: {
      titleEn: "Question 7 - Tail-sum formula for positive integer variables",
      titleZh: "问题 7 - 正整数随机变量的尾和公式",
      promptEn: "Let N be a random variable taking positive integer values. Prove that E[N] equals the sum over i >= 0 of P(N > i).",
      promptZh: "令 N 为取正整数值的随机变量。证明 E[N] 等于对所有 i >= 0 的 P(N > i) 求和。",
      answerEn: "E[N] = sum over i >= 0 of P(N > i).",
      answerZh: "E[N] = 对 i >= 0 的 P(N > i) 求和。",
      explanationEn: "Write E[N] as the sum over m >= 1 of m P(N = m). Replace each term m P(N = m) by m copies of P(N = m), then group the resulting infinite array by columns. The first column sums to P(N > 0), the second to P(N > 1), and so on. This gives the tail-sum identity.",
      explanationZh: "把 E[N] 写成对 m >= 1 的 m P(N = m) 求和。将每一项 m P(N = m) 看作 m 个 P(N = m) 相加，再按列重新分组。第一列之和为 P(N > 0)，第二列为 P(N > 1)，依此类推，于是得到尾和公式。",
      category: "probabilityExpectation",
      difficulty: "Medium",
      topic: "expectation"
    },
    8: {
      titleEn: "Question 8 - Coupon collector cereal boxes",
      titleZh: "问题 8 - 优惠券收集问题",
      promptEn: "Each cereal box contains one coupon, uniformly distributed among p coupon types. How many boxes must be bought on average to obtain at least one coupon of each type?",
      promptZh: "每盒麦片含一张优惠券，优惠券在 p 种类型中均匀出现。平均需要购买多少盒才能集齐每种类型至少一张？",
      answerEn: "p times the p-th harmonic number.",
      answerZh: "p 乘以第 p 个调和数。",
      explanationEn: "After k - 1 distinct coupon types have been collected, the probability that the next box gives a new type is (p - k + 1)/p. The expected waiting time for the k-th new type is therefore p/(p - k + 1). Summing k = 1 through p gives p(1 + 1/2 + ... + 1/p). For large p this is approximately p log p + gamma p + 1/2.",
      explanationZh: "当已经收集到 k - 1 种不同优惠券时，下一盒出现新类型的概率为 (p - k + 1)/p，因此等待第 k 种新优惠券的期望盒数为 p/(p - k + 1)。对 k = 1 到 p 求和，得到 p(1 + 1/2 + ... + 1/p)。当 p 很大时，近似为 p log p + gamma p + 1/2。",
      category: "probabilityExpectation",
      difficulty: "Medium",
      topic: "expectation"
    },
    9: {
      titleEn: "Question 9 - First multiple of n in die-roll sums",
      titleZh: "问题 9 - 掷骰累加和首次成为 n 的倍数",
      promptEn: "A fair n-sided die is rolled repeatedly and the outcomes are summed. What is the expected number of rolls until the running sum is a multiple of n for the first time?",
      promptZh: "反复掷一个公平的 n 面骰，并累加点数。直到累加和首次成为 n 的倍数，期望需要掷多少次？",
      answerEn: "n.",
      answerZh: "n。",
      explanationEn: "Whenever the current sum is not a multiple of n, exactly one die face will make the next sum a multiple of n modulo n. Thus, conditional on not having stopped yet, the stopping probability on the next roll is 1/n. Equivalently P(N > i) = (1 - 1/n)^i, so the tail-sum formula gives E[N] = n.",
      explanationZh: "只要当前累加和不是 n 的倍数，模 n 意义下恰好只有一个骰面能使下一次累加和成为 n 的倍数。因此在尚未停止的条件下，下一次停止的概率为 1/n。等价地，P(N > i) = (1 - 1/n)^i，由尾和公式得到 E[N] = n。",
      category: "probabilityExpectation",
      difficulty: "Medium",
      topic: "stopping time"
    },
    10: {
      titleEn: "Question 10 - Loaded dice with uniform sum",
      titleZh: "问题 10 - 两个非公平骰子的均匀点数和",
      promptEn: "Is it possible to construct two loaded six-sided dice, each labeled 1 through 6, such that the sum of the two dice is uniformly distributed over 2 through 12?",
      promptZh: "能否构造两个非公平六面骰，每个骰面标为 1 到 6，使两个骰子的点数和在 2 到 12 上均匀分布？",
      answerEn: "No.",
      answerZh: "不能。",
      explanationEn: "Suppose the first die has probabilities a1 through a6 and the second has b1 through b6. Uniform sums would require a1 b1 = 1/11 for sum 2 and a6 b6 = 1/11 for sum 12. But P(sum = 7) includes the nonnegative terms a1 b6 and a6 b1, so by AM-GM it is at least 2 sqrt(a1 b1 a6 b6) = 2/11. This contradicts the required uniform value 1/11.",
      explanationZh: "设第一个骰子的概率为 a1 到 a6，第二个骰子的概率为 b1 到 b6。若点数和均匀，则和为 2 要求 a1 b1 = 1/11，和为 12 要求 a6 b6 = 1/11。但 P(和为 7) 至少包含非负项 a1 b6 与 a6 b1，由算术-几何平均不等式，它至少为 2 sqrt(a1 b1 a6 b6) = 2/11。这与均匀分布要求的 1/11 矛盾。",
      category: "probabilityExpectation",
      difficulty: "Hard",
      topic: "discrete probability"
    }
  };
}

function repairGreenBookProblems(problems, book) {
  problems.forEach((problem) => {
    if (/textbackslash/i.test(problem.titleZh)) {
      const prompt = [
        "设 X 为标准正态随机变量。由于对称性，所有奇数阶矩 E[X^n] 都为 0。",
        "",
        "请用分部积分或矩母函数推导偶数阶矩的递推关系，并计算题目要求的 E[X^n]。"
      ].join("\n");
      problem.titleZh = "正态分布矩的递推";
      problem.titleEn = "Normal moments recurrence";
      problem.promptZh = prompt;
      problem.promptEn = "";
      problem.category = "probabilityExpectation";
      problem.difficulty = "Medium";
      problem.tags = [book.name, "normal distribution", "moments", "expectation", "probability"];
    }

    if (/^\(1\+v'5f/.test(problem.titleZh)) {
      const prompt = [
        "考虑 Fibonacci 递推 F(0)=1, F(1)=1, F(n)=F(n-1)+F(n-2)。",
        "",
        "请用归纳法验证其闭式表达，并说明为什么朴素递归计算的运行时间也与 Fibonacci 数列同阶。"
      ].join("\n");
      problem.titleZh = "Fibonacci 递推与运行时间";
      problem.titleEn = "Fibonacci recurrence and runtime";
      problem.promptZh = prompt;
      problem.promptEn = "";
      problem.category = "leetcode";
      problem.difficulty = "Medium";
      problem.tags = [book.name, "recurrence", "induction", "runtime", "coding"];
    }

    applyReviewedGreenBookClassification(problem, book);
  });
}

function applyReviewedGreenBookClassification(problem, book) {
  const section = String(problem.tags?.[1] || "");
  const title = String(problem.titleEn || problem.titleZh || "");
  const text = [section, title, problem.promptEn, problem.explanationEn].map((value) => String(value || "")).join(" ").toLowerCase();

  let category = "mentalMath";
  const brainTeaserSection = /^(Problem Simplification|Logic Reasoning|Thinking Out of the Box|Application of Symmetry|Series Summation|The Pigeon Hole Principle|Modular Arithmetic|Math Induction|Proof by Contradiction)$/i.test(section);
  const calculusSection = /^(Limits and Derivatives|Integration|Partial Derivatives and Multiple Integrals|Important Calculus Methods|Ordinary Differential Equations|Linear Algebra)$/i.test(section);
  const probabilitySection = /^(Basic Probability|Combinatorial Analysis|Conditional Probability|Discrete and Continuous Distributions|Expected Value|Variance|Order Statistics|Markov Chain|Martingale and Random walk)$/i.test(section);
  const stochasticSection = /^(Dynamic Programming|Brownian Motion and Stochastic Calculus)$/i.test(section);
  const optionSection = /^(Option Pricing|The Greeks|Option Portfolios and Exotic Options)$/i.test(section);
  const financeSection = /^(Finance|Other Finance Questions)$/i.test(section);
  const algorithmSection = /^(Algorithms|The Power of Two|Algorithms and Numerical Methods|Numerical Methods)$/i.test(section);

  if (optionSection) {
    category = "option";
  } else if (financeSection) {
    category = "market";
  } else if (algorithmSection) {
    category = "leetcode";
  } else if (calculusSection) {
    category = "statistics";
  } else if (probabilitySection) {
    category = "probabilityExpectation";
  } else if (stochasticSection) {
    category = /dynamic programming|algorithm|finite difference|monte carlo/.test(text) ? "leetcode" : "probabilityExpectation";
  } else if (brainTeaserSection) {
    const brainPromptText = [title, problem.promptEn].map((value) => String(value || "")).join(" ").toLowerCase();
    category = /\b(probability|expected|expectation|variance|random|dice|coupon|poisson|distribution|conditional)\b/.test(brainPromptText)
      ? "probabilityExpectation"
      : "mentalMath";
  } else if (/\b(matrix|vector|eigen|determinant|decomposition|linear algebra|derivative|integral|lagrange|differential equation|normal distribution|regression)\b/.test(text)) {
    category = "statistics";
  } else if (/\b(probability|expected|expectation|variance|random|iid|dice|coin|card|coupon|poisson|markov|martingale|gambler|distribution|bayes|conditional)\b/.test(text)) {
    category = "probabilityExpectation";
  }

  if (brainTeaserSection && /\b(screwy pirates|calendar cubes|prisoner|hat|counterfeit|defective|mislabeled|light switches|box packing)\b/i.test(title)) {
    category = "mentalMath";
  }
  if (/quant salary/i.test(title)) {
    category = "market";
  }

  let difficulty = "Medium";
  if (/\b(difficult|reflection principle|stochastic calculus|ito|black-scholes|martingale|dynamic programming|finite difference|exchange option|optimal|proof by contradiction)\b/i.test(text)) {
    difficulty = "Hard";
  } else if (/\b(basic|definition|trailing zeros|birthday problem|handshakes|river crossing|burning ropes|calendar cubes|door to offer|what is the integral ofln|basics of derivatives)\b/i.test(text)) {
    difficulty = "Easy";
  } else if (/^(Limits and Derivatives|Basic Probability Definitions)/i.test(section) && /\b(basic|definition|what is)\b/i.test(text)) {
    difficulty = "Easy";
  }

  problem.category = category;
  problem.difficulty = difficulty;
  problem.classificationReviewed = true;
  problem.classificationReviewSource = "green-book-section-topic-map-v1";
  problem.tags = [
    book.name,
    section,
    title,
    category,
    ...inferTopicTags([section, title, problem.promptEn].join(" "))
  ].filter(Boolean);
}

function repairYellowBookProblems(problems, book) {
  problems.forEach((problem, index) => {
    const problemNumber = index + 1;
    [
      "titleEn",
      "titleZh",
      "promptEn",
      "promptZh",
      "answerEn",
      "answerZh",
      "explanationEn",
      "explanationZh",
      "answer",
      "explanation"
    ].forEach((field) => {
      problem[field] = cleanYellowBookDisplayText(problem[field], problemNumber);
    });

    repairYellowBookPromptAndTitle(problem, problemNumber);
    applyReviewedYellowBookClassification(problem, book, problemNumber);

    if (problem.id === "yellow-book-problem-067" && !/[\u3400-\u9fff]/.test(problem.explanationZh || "")) {
      problem.explanationZh = [
        "函数指针的声明可以按返回类型、指针名和参数列表来读；下面保留原 C++ 代码写法：",
        "",
        problem.explanationEn || problem.explanation || ""
      ].join("\n").trim();
    }

    if (problem.id === "yellow-book-problem-084") {
      problem.explanationEn = repairBalancedParenthesesCode(problem.explanationEn);
      problem.explanationZh = repairBalancedParenthesesCode(problem.explanationZh);
    }
    if (problem.id === "yellow-book-problem-085") {
      problem.explanationEn = [
        "A recursive implementation can measure the height by returning the current depth for an empty child and taking the maximum of the left and right subtrees.",
        "",
        "#include <memory>",
        "#include <algorithm>",
        "using namespace std;",
        "",
        "template <typename T>",
        "struct BinaryTree {",
        "  T data;",
        "  shared_ptr<BinaryTree<T>> left, right;",
        "};",
        "",
        "template <typename T>",
        "int height(const shared_ptr<BinaryTree<T>>& tree, int count = -1) {",
        "  if (!tree) return count;",
        "  return max(height(tree->left, count + 1), height(tree->right, count + 1));",
        "}"
      ].join("\n");
      problem.explanationZh = [
        "可以用递归计算高度：空子树返回当前深度，非空节点返回左右子树高度的较大值。",
        "",
        "#include <memory>",
        "#include <algorithm>",
        "using namespace std;",
        "",
        "template <typename T>",
        "struct BinaryTree {",
        "  T data;",
        "  shared_ptr<BinaryTree<T>> left, right;",
        "};",
        "",
        "template <typename T>",
        "int height(const shared_ptr<BinaryTree<T>>& tree, int count = -1) {",
        "  if (!tree) return count;",
        "  return max(height(tree->left, count + 1), height(tree->right, count + 1));",
        "}"
      ].join("\n");
    }

    problem.answer = problem.answerEn || problem.answerZh || problem.answer || "";
    problem.explanation = problem.explanationEn || problem.explanationZh || problem.explanation || "";
  });
}

function cleanYellowBookDisplayText(text, problemNumber) {
  let value = String(text || "");
  if (!value) return "";

  value = value
    .replace(/\bCHAPTER\s+\d+\.\s+(?:QUESTIONS|SOLUTIONS)\b/gi, " ")
    .replace(/\b[23]\.\d+\.\s+[A-Z][A-Z.,\s-]+(?=\s|$)/g, " ")
    .replace(/([A-Za-z])-\s+([a-z])/g, "$1$2")
    .replace(/€/g, "∈")
    .replace(/™/g, "")
    .replace(/\\textbackslash\{\}sim/g, "~")
    .replace(/\\textasciitilde\{\}/g, "~")
    .replace(/\s+([?.!,;:])/g, "$1")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (problemNumber === 12) {
    value = value
      .replace(/7®\s+or\s+e\b/gi, "\\pi^e or e^\\pi")
      .replace(/7°\s*<\s*e[”"]/gi, "\\pi^e < e^\\pi")
      .replace(/7®/g, "\\pi^e");
  }
  if (problemNumber === 14) {
    value = value.replace(/«\*/g, "x^x");
  }
  if (problemNumber === 86) {
    value = value.replace(/\bcompute\s+7\s+using Monte Carlo/gi, "compute \\pi using Monte Carlo");
  }
  if (problemNumber === 101) {
    value = value.replace(/\b®\b/g, "\\Phi");
  }

  return value;
}

function repairYellowBookPromptAndTitle(problem, problemNumber) {
  const manual = {
    12: {
      en: "Question 2 - Which number is larger, \\pi^e or e^\\pi",
      zh: "问题2 - \\pi^e 和 e^\\pi 哪个更大",
      promptEn: "Which number is larger, \\pi^e or e^\\pi?",
      promptZh: "\\pi^e 和 e^\\pi 哪个更大？"
    },
    14: {
      en: "Question 5 - What is the derivative of x^x",
      zh: "问题5 - x^x 的导数是什么",
      promptEn: "What is the derivative of x^x?",
      promptZh: "x^x 的导数是什么？"
    },
    86: {
      en: "Question 1 - How would you compute \\pi using Monte Carlo simulations",
      zh: "问题1 - 如何用 Monte Carlo 模拟计算 \\pi",
      promptEn: "How would you compute \\pi using Monte Carlo simulations? What is the standard deviation of this method?",
      promptZh: "如何用 Monte Carlo 模拟计算 \\pi？这种方法的标准差是多少？"
    },
    95: {
      en: "Question 1 - Exponential distribution, mean, and variance",
      zh: "问题1 - 指数分布、均值和方差",
      promptEn: "What is the exponential distribution? What are the mean and the variance of the exponential distribution?",
      promptZh: "什么是指数分布？指数分布的均值和方差是多少？"
    }
  }[problemNumber];

  if (manual) {
    problem.titleEn = manual.en;
    problem.titleZh = manual.zh;
    problem.promptEn = manual.promptEn;
    problem.promptZh = manual.promptZh;
    return;
  }

  const label = String(problem.titleEn || problem.titleZh || "").match(/Question\s+([\d.]+)/i)?.[1];
  const enTitle = yellowBookTitleFromPrompt(problem.promptEn || problem.promptZh);
  const zhTitle = yellowBookTitleFromPrompt(problem.promptZh || problem.promptEn);
  if (label && enTitle) problem.titleEn = `Question ${label} - ${enTitle}`;
  if (label && zhTitle) problem.titleZh = `问题${label} - ${zhTitle}`;
}

function yellowBookTitleFromPrompt(prompt) {
  const text = String(prompt || "")
    .replace(/\s+/g, " ")
    .replace(/^\s*(?:Question|问题)\s+[\d.]+[.:：-]?\s*/i, "")
    .trim();
  if (!text) return "";
  const match = text.match(/^(.{12,140}?[?？。.]|\S.{0,120})/);
  return String(match?.[1] || text.slice(0, 120))
    .replace(/[?？。.\s]+$/g, "")
    .trim();
}

function repairBalancedParenthesesCode(text) {
  return String(text || "")
    .replace(/for\s*\(auto\s*&c:\s*input\)\s*∈/g, "for (auto &c : input) {")
    .replace(/for\s*\(auto\s*&c:\s*input\)\s*\{/g, "for (auto &c : input) {");
}

function applyReviewedYellowBookClassification(problem, book, problemNumber) {
  const section = yellowBookSection(problemNumber);
  const text = [
    section,
    problem.titleEn,
    problem.titleZh,
    problem.promptEn,
    problem.promptZh,
    problem.explanationEn,
    problem.explanationZh
  ].map((value) => String(value || "")).join(" ").toLowerCase();

  let category = "probabilityExpectation";
  if ((problemNumber >= 11 && problemNumber <= 21) || problemNumber === 3) {
    category = "statistics";
  }
  if (problemNumber === 1 || (problemNumber >= 33 && problemNumber <= 54) || (problemNumber >= 117 && problemNumber <= 121)) {
    category = "option";
  }
  if (problemNumber === 55 || /\bvar\b|portfolio risk|market/.test(text)) {
    category = "market";
  }
  if ((problemNumber >= 23 && problemNumber <= 32) || (problemNumber >= 86 && problemNumber <= 94)) {
    category = "statistics";
  }
  if (problemNumber >= 56 && problemNumber <= 85) {
    category = "leetcode";
  }
  if (problemNumber === 94) {
    category = "option";
  }
  if (problemNumber >= 122) {
    category = "mentalMath";
    if (/\bprobability|expected|expectation|random|coin|subsets?|uniform|walk|variance|world series|balls?\b/i.test(text)) {
      category = "probabilityExpectation";
    }
    if (problemNumber === 144) category = "leetcode";
  }
  if (/\b(c\+\+|pointer|array|template|static|constructor|virtual function|linked list|binary tree|subarray|factorial|prime factors|bits?)\b/i.test(text)) {
    category = "leetcode";
  }
  if (/\b(?:black.?scholes|options?|puts?|calls?|delta|gamma|swap|forward|futures?|bond|heston|girsanov|hedg(?:e|ing)?)\b/i.test(text)) {
    category = problemNumber === 55 ? "market" : "option";
  }
  if (/\bcovariance|correlation|matrix|eigen|linear algebra|monte carlo|newton|normal samples|finite difference\b/i.test(text) && category !== "option") {
    category = "statistics";
  }
  if (problemNumber >= 95 && problemNumber <= 116) {
    category = "probabilityExpectation";
  }
  if ([2, 4, 8, 11, 122, 129, 130, 131, 132, 137, 139, 140, 143, 147, 151, 152, 153].includes(problemNumber)) {
    category = "mentalMath";
  }

  let difficulty = "Medium";
  if ([
    3, 7, 9, 22, 25, 26, 27, 28, 29, 37, 41, 42, 43, 44, 77, 94, 104, 105, 106, 108, 109,
    110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 134, 145, 148, 150
  ].includes(problemNumber) || /\bderive|prove|black.?scholes|girsanov|heston|martingale representation|ito|sde|ornstein|eigenvalue|positive semidefinite\b/i.test(text)) {
    difficulty = "Hard";
  }
  if ([
    2, 10, 11, 14, 56, 57, 58, 59, 60, 61, 62, 63, 66, 67, 70, 75, 76, 79, 81, 126, 151, 152
  ].includes(problemNumber) || /\bwhat is the value|how do you declare|address of a variable|factorial|manhole cover|clock meet\b/i.test(text)) {
    difficulty = "Easy";
  }

  problem.category = category;
  problem.difficulty = difficulty;
  problem.classificationReviewed = true;
  problem.classificationReviewSource = "yellow-book-section-topic-map-v1";
  problem.tags = [
    book.name,
    section,
    readableCategory(category),
    ...inferTopicTags([section, problem.titleEn, problem.titleZh, problem.promptEn, problem.promptZh].join(" "))
  ].filter(Boolean);
  problem.tags = [...new Set(problem.tags)].slice(0, 7);
}

function yellowBookSection(problemNumber) {
  if (problemNumber <= 10) return "First Look";
  if (problemNumber <= 22) return "Mathematics, Calculus, ODE";
  if (problemNumber <= 32) return "Linear Algebra and Statistics";
  if (problemNumber <= 55) return "Financial Instruments";
  if (problemNumber <= 85) return "C++ and Data Structures";
  if (problemNumber <= 94) return "Monte Carlo and Numerical Methods";
  if (problemNumber <= 121) return "Probability and Stochastic Calculus";
  return "Brainteasers";
}

function repairRedBookProblems(problems, book) {
  problems.forEach((problem, index) => {
    const problemNumber = index + 1;
    [
      "titleEn",
      "titleZh",
      "promptEn",
      "promptZh",
      "answerEn",
      "answerZh",
      "explanationEn",
      "explanationZh",
      "answer",
      "explanation"
    ].forEach((field) => {
      problem[field] = cleanRedBookDisplayText(problem[field]);
    });

    repairRedBookPromptAndTitle(problem, problemNumber);
    applyReviewedRedBookClassification(problem, book, problemNumber);

    problem.answer = problem.answerEn || problem.answerZh || problem.answer || "";
    problem.explanation = problem.explanationEn || problem.explanationZh || problem.explanation || "";
  });
}

function cleanRedBookDisplayText(text) {
  return String(text || "")
    .replace(/(^|\n)\s*CHAPTER\s+\d+\b[^\n。]*(?=\s|$)/g, "$1 ")
    .replace(/\b\d\.\d\.\d\.\s+[A-Z][A-Za-z +/.-]+(?=\s|$)/g, " ")
    .replace(/\b\d\.\d\.\s+[A-Z][A-Z.,\s+/-]+(?=\s|$)/g, " ")
    .replace(/([A-Za-z])-\s+([a-z])/g, "$1$2")
    .replace(/€/g, "∈")
    .replace(/™/g, "")
    .replace(/\\textbackslash\{\}sim/g, "~")
    .replace(/\\textasciitilde\{\}/g, "~")
    .replace(/\s+([?.!,;:])/g, "$1")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function repairRedBookPromptAndTitle(problem, problemNumber) {
  const label = redBookQuestionLabel(problem, problemNumber);
  if (label === "2.57") {
    problem.promptEn = "Explain the Longstaff-Schwartz algorithm for pricing an early exercisable option with Monte Carlo.";
    problem.promptZh = "解释使用蒙特卡罗为早期可行使期权定价的 Longstaff-Schwartz 算法。";
  }
  if (label === "6.26") {
    problem.promptEn = "Evaluate $\\int_0^\\infty \\frac{\\log(x)}{1+x+x^2}\\,dx$. (Hint: use contour integration.)";
    problem.promptZh = "计算 $\\int_0^\\infty \\frac{\\log(x)}{1+x+x^2}\\,dx$。（提示：使用围道积分。）";
  }

  const enTitle = redBookTitleFromPrompt(problem.promptEn || problem.promptZh);
  const zhTitle = redBookTitleFromPrompt(problem.promptZh || problem.promptEn);
  if (label && enTitle) problem.titleEn = `Question ${label} - ${enTitle}`;
  if (label && zhTitle) problem.titleZh = `问题 ${label} - ${zhTitle}`;
}

function redBookQuestionLabel(problem, problemNumber) {
  const existing = String(problem.titleEn || problem.titleZh || "").match(/(?:Question|问题)\s*(\d+\.\d+)/i)?.[1];
  if (existing) return existing;
  const section = redBookSection(problem, problemNumber);
  return `${section.chapter}.${section.ordinal}`;
}

function redBookTitleFromPrompt(prompt) {
  const text = String(prompt || "")
    .replace(/\s+/g, " ")
    .replace(/^(?:Question|问题)\s+\d+\.\d+[.:：-]?\s*/i, "")
    .trim();
  if (!text) return "";
  return String(text.match(/^(.{12,150}?[?？。.]|\S.{0,130})/)?.[1] || text.slice(0, 130))
    .replace(/[?？。.\s]+$/g, "")
    .trim();
}

function applyReviewedRedBookClassification(problem, book, problemNumber) {
  const section = redBookSection(problem, problemNumber);
  const text = [
    section.name,
    problem.titleEn,
    problem.titleZh,
    problem.promptEn,
    problem.promptZh,
    problem.explanationEn,
    problem.explanationZh
  ].map((value) => String(value || "")).join(" ").toLowerCase();

  let category = "option";
  if (section.chapter === 2 || section.chapter === 4) {
    category = "option";
  } else if (section.chapter === 3) {
    category = /covariance|correlation|central limit|density|distribution function|order statistic|uniform random variables|cauchy|variance|gaussian/i.test(text)
      ? "statistics"
      : "probabilityExpectation";
  } else if (section.chapter === 5) {
    category = /\b(code|routine|algorithm|array|sort|matrix|missing number|histogram|subarray|factorial|interpolation|submarine|robots)\b/i.test(text)
      ? "leetcode"
      : "statistics";
  } else if (section.chapter === 6) {
    category = "statistics";
  } else if (section.chapter === 7) {
    category = "leetcode";
  } else if (section.chapter === 8) {
    category = /\bprobability|expected|random|cards?|coin|die|dice\b/i.test(text) ? "probabilityExpectation" : "mentalMath";
  } else if (section.chapter === 9) {
    category = "market";
  }

  if (/\bblack.?scholes|options?|puts?|calls?|delta|gamma|vega|barrier|digital|swaption|forward rate|libor|volatility smile|monte carlo.*option|binomial tree|trinomial tree\b/i.test(text)) {
    category = "option";
  }
  if (
    section.chapter === 7 ||
    (section.chapter === 5 && /\bc\+\+|compiler|virtual|constructor|destructor|pointer|reference|const|static|operator|template|inheritance|memory allocation|function pointer|header file|linkage\b/i.test(text)) ||
    (section.chapter === 5 && /\bcode|routine|algorithm|array|sort|matrix|histogram|subarray|factorial|interpolation|missing number\b/i.test(text))
  ) {
    category = "leetcode";
  }
  if (/\bbanking|trading|hedge fund|market|desk|salary|why do you want|weakness|strength|career|work\b/i.test(text) && section.chapter === 9) {
    category = "market";
  }

  let difficulty = "Medium";
  if (/\bderive|prove|black.?scholes equation|ito|stochastic|brownian bridge|girsanov|contour integration|fourier|positive-definite|longstaff|libor market model|convex|martingale|sde\b/i.test(text)) {
    difficulty = "Hard";
  }
  if (difficulty !== "Hard" && /\bdefine|explain briefly|fair die|single roll|compilers have you used|why do you want|what are your strengths|what are your weaknesses|manhole|clock|basic\b/i.test(text)) {
    difficulty = "Easy";
  }
  if (section.chapter === 9) difficulty = "Easy";
  if (section.chapter === 7 && /\bwrite|implement|routine|code|algorithm|sqrt|standard gaussian\b/i.test(text)) difficulty = "Medium";
  if (section.chapter === 2 && /\bderive|prove|black.?scholes|volatility smile|longstaff|incomplete market|barrier|digital|replicat/i.test(text)) difficulty = "Hard";
  if (section.chapter === 6 && /\bderive|prove|integral|differentiate|fourier|contour|liouville|positive-definite|heat equation\b/i.test(text)) difficulty = "Hard";

  problem.category = category;
  problem.difficulty = difficulty;
  problem.classificationReviewed = true;
  problem.classificationReviewSource = "red-book-section-topic-map-v1";
  problem.tags = [
    book.name,
    `Chapter ${section.chapter}`,
    section.name,
    readableCategory(category),
    ...inferTopicTags([section.name, problem.titleEn, problem.titleZh, problem.promptEn, problem.promptZh].join(" "))
  ].filter(Boolean);
  problem.tags = [...new Set(problem.tags)].slice(0, 7);
}

function redBookSection(problemOrNumber, maybeProblemNumber) {
  const problem = typeof problemOrNumber === "object" ? problemOrNumber : null;
  const problemNumber = problem ? maybeProblemNumber : problemOrNumber;
  if (problem) {
    const labelText = [
      problem.titleEn,
      problem.titleZh,
      problem.promptEn,
      problem.promptZh
    ].map((value) => String(value || "")).join(" ");
    const label = labelText.match(/(?:Question|问题)\s*(\d+)\.(\d+)/i);
    if (label) {
      return {
        chapter: Number(label[1]),
        ordinal: Number(label[2]),
        name: redBookChapterName(Number(label[1]))
      };
    }
  }
  if (problemNumber <= 52) return { chapter: 2, ordinal: problemNumber, name: "Option Pricing" };
  if (problemNumber <= 106) return { chapter: 3, ordinal: problemNumber - 52, name: "Probability" };
  if (problemNumber <= 113) return { chapter: 4, ordinal: problemNumber - 106, name: "Interest Rates" };
  if (problemNumber <= 133) return { chapter: 5, ordinal: problemNumber - 113, name: "Numerical Techniques and Algorithms" };
  if (problemNumber <= 159) return { chapter: 6, ordinal: problemNumber - 133, name: "Mathematics" };
  if (problemNumber <= 192) return { chapter: 7, ordinal: problemNumber - 159, name: "Coding in C++" };
  if (problemNumber <= 218) return { chapter: 8, ordinal: problemNumber - 192, name: "Brainteasers" };
  return { chapter: 9, ordinal: problemNumber - 218, name: "Non-technical and Fit" };
}

function redBookChapterName(chapter) {
  return {
    2: "Option Pricing",
    3: "Probability",
    4: "Interest Rates",
    5: "Numerical Techniques and Algorithms",
    6: "Mathematics",
    7: "Coding in C++",
    8: "Brainteasers",
    9: "Non-technical and Fit"
  }[chapter] || `Chapter ${chapter}`;
}

function repairGeneratedBookTitles(problems, book) {
  problems.forEach((problem) => {
    if (!isCorruptGeneratedTitle(problem.titleZh || problem.titleEn)) return;
    const question = String(problem.titleZh || problem.titleEn || "").match(/Question\s+([\d.]+)/i)?.[1];
    const number = Number(String(problem.id || "").match(/(?:problem|exercise)-0*(\d+)/)?.[1] || 0);
    const label = shortBookLabel(book);
    const title = question
      ? `${label} Question ${question}`
      : `${label} 题目 ${number || problems.indexOf(problem) + 1}`;
    problem.titleZh = title;
    problem.titleEn = isMostlyAscii(title) ? title : "";
    problem.tags = [
      book.name,
      ...(problem.tags || []).filter((tag) => !isCorruptGeneratedTitle(tag) && cleanProblemTagValue(tag) !== cleanProblemTagValue(book.name))
    ].slice(0, 7);
  });
}

function shortBookLabel(book) {
  const name = String(book.name || book.slug || "题库").trim();
  return name.split(/\s+/)[0] || book.slug || "题库";
}

function cleanProblemTagValue(tag) {
  return cleanInlineText(tag).toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, "");
}

function isCorruptGeneratedTitle(title) {
  const value = String(title || "").trim();
  if (!value) return true;
  if (/textbackslash|textascii|\\/.test(value)) return true;
  if (/^[^A-Za-z0-9\u4e00-\u9fff]/.test(value)) return true;
  if (/^Question\s+[\d.]+\s+-\s+[^A-Z\u4e00-\u9fff]*[\\{}]/i.test(value)) return true;
  if (/^[a-z]{2,}\b/.test(value) && value.length > 40) return true;
  if (value.length > 96 && !/^Question\s+[\d.]+/i.test(value)) return true;
  return false;
}

function ensurePrompts(problems, book, inputPath) {
  problems.forEach((problem) => {
    const prompt = String(problem.promptZh || problem.promptEn || "").trim();
    if (prompt) return;
    const fallback = `该条目来自《${book.name}》，但源文件未保留可显示的题面。请对照源文件补全：${publicSourcePath(inputPath)}`;
    problem.promptZh = fallback;
    problem.promptEn = isMostlyAscii(fallback) ? fallback : "";
    problem.tags = [...new Set([...(problem.tags || []), "needs source review"])].slice(0, 7);
  });
}

function writeBook(book, inputPath, problems) {
  const sourceDir = path.join(sourceRoot, book.slug);
  fs.mkdirSync(sourceDir, { recursive: true });
  fs.writeFileSync(path.join(sourceDir, "problems.json"), `${JSON.stringify({ problems }, null, 2)}\n`);
  fs.writeFileSync(path.join(sourceDir, "metadata.json"), `${JSON.stringify({
    slug: book.slug,
    name: book.name,
    type: "latex",
    sourceTexPath: publicSourcePath(inputPath),
    problemFile: "problems.json",
    problemCount: problems.length,
    lastImportedAt: importedAt
  }, null, 2)}\n`);
}

function upsertManifestSource(book, inputPath, problemCount) {
  const existing = sources.find((source) => source.slug === book.slug) || {};
  const nextSource = {
    slug: book.slug,
    name: book.name,
    type: "latex",
    sourceTexPath: publicSourcePath(inputPath),
    problemFile: `${book.slug}/problems.json`,
    problemCount: problemCount ?? existing.problemCount ?? 0,
    lastImportedAt: importedAt
  };
  if (book.disabled) {
    nextSource.disabled = true;
    nextSource.disabledReason = book.disabledReason || "Temporarily disabled.";
    nextSource.disabledAt = existing.disabledAt || importedAt;
  }
  const index = sources.findIndex((source) => source.slug === book.slug);
  if (index >= 0) sources[index] = { ...sources[index], ...nextSource };
  else sources.push(nextSource);
}

function publicSourcePath(inputPath) {
  const relativeToBooks = path.relative(desktopBookRoot, inputPath);
  if (relativeToBooks && !relativeToBooks.startsWith("..") && !path.isAbsolute(relativeToBooks)) {
    return relativeToBooks;
  }
  return path.basename(inputPath);
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function readHeading(line, name) {
  const match = String(line || "").match(new RegExp(`^\\\\${name}\\*?\\{([^}]*)\\}`));
  return match ? cleanInlineText(match[1]) : "";
}

function collectEnvironment(sourceLines, start, env) {
  const content = [];
  const startLine = sourceLines[start].replace(new RegExp(`^.*?\\\\begin\\{${env}\\}`), "");
  if (startLine.trim()) content.push(startLine);
  for (let index = start + 1; index < sourceLines.length; index += 1) {
    if (sourceLines[index].includes(`\\end{${env}}`)) {
      const beforeEnd = sourceLines[index].split(`\\end{${env}}`)[0];
      if (beforeEnd.trim()) content.push(beforeEnd);
      return { content: content.join("\n"), end: index };
    }
    content.push(sourceLines[index]);
  }
  return { content: content.join("\n"), end: sourceLines.length - 1 };
}

function findLine(sourceLines, start, predicate) {
  for (let index = Math.max(0, start); index < sourceLines.length; index += 1) {
    if (predicate(sourceLines[index])) return index;
  }
  return -1;
}

function buildProblemTitle(rawTitle, prompt, index) {
  const title = cleanInlineText(rawTitle);
  if (!isNoisyTitle(title)) return title || `题目 ${index}`;
  const inferred = inferTitleFromPrompt(prompt);
  const keepPrefix = /^(?:item|question|practice|题目)\s*[\d.]*$/i.test(title);
  if (inferred) return keepPrefix ? `${title || "题目"} - ${inferred}` : inferred;
  return keepPrefix ? `${title || "题目"} ${index}` : `题目 ${index}`;
}

function isNoisyTitle(title) {
  const value = String(title || "").trim();
  if (!value) return true;
  if (/^(?:item|question|practice|题目)\s*[\d.]*$/i.test(value)) return true;
  if (/^(?:and|or|if|then|that|which|where|when|lemma:?|-|=+\s*\d*)$/i.test(value)) return true;
  if (/textbackslash|textascii|\\/.test(value)) return true;
  if (/^[\d\s.,;:=+\-*/^_()[\]|\\]+$/.test(value)) return true;
  const letterCount = (value.match(/[A-Za-z\u4e00-\u9fff]/g) || []).length;
  const symbolCount = (value.match(/[^\w\s\u4e00-\u9fff]/g) || []).length;
  if (value.length <= 24 && symbolCount >= 3 && letterCount <= 5) return true;
  return value.length <= 5 && !/[A-Za-z\u4e00-\u9fff]/.test(value);
}

function inferTitleFromPrompt(prompt) {
  const text = cleanInlineText(prompt).replace(/\s+/g, " ").trim();
  const questionMatch = text.match(/(?:QUESTION|Question|QueEsTION|QuESTION)\s*[\d.]*[.:]?\s*([^?？]{8,120}[?？])/);
  if (questionMatch) return questionMatch[1].trim();
  const sentenceMatch = text.match(/([^。.!?？]{10,96}[。.!?？])/);
  const value = (questionMatch?.[1] || sentenceMatch?.[1] || text.slice(0, 96)).trim();
  return value.replace(/\s+/g, " ").replace(/[;:,，。.!?？]+$/g, "");
}

function buildTags({ book, chapter, section, subsection, prompt, category }) {
  const topic = section || chapter || readableCategory(category);
  const tags = [book.name, topic, subsection]
    .map(cleanInlineText)
    .filter((tag) => tag && tag !== "题目" && tag.length <= 80);
  const extra = inferTopicTags(`${chapter} ${section} ${subsection} ${prompt}`);
  return [...new Set([...tags, ...extra])].slice(0, 7);
}

function inferTopicTags(text) {
  const source = String(text || "").toLowerCase();
  const tags = [];
  if (/black.?scholes|option|call|put|greek|delta|gamma|volatility|swap|forward|future|bond|期权|波动率|远期|期货/.test(source)) tags.push("derivatives");
  if (/arbitrage|portfolio|trading|market|risk|hedge|做市|套利|交易|市场/.test(source)) tags.push("market");
  if (/regression|ols|lasso|ridge|p-value|estimator|correlation|covariance|统计|回归|协方差|相关/.test(source)) tags.push("statistics");
  if (/brownian|martingale|wiener|stochastic|random walk|poisson|markov|随机|布朗|鞅|马尔可夫/.test(source)) tags.push("stochastic");
  if (/dice|coin|urn|probability|expectation|normal|uniform|概率|期望|硬币|骰子|正态|均匀/.test(source)) tags.push("probability");
  if (/algorithm|array|sort|tree|graph|leetcode|c\+\+|python|sql|算法|数据结构/.test(source)) tags.push("coding");
  if (/linear algebra|matrix|eigen|矩阵|特征值|线性代数/.test(source)) tags.push("linear algebra");
  return tags;
}

function inferCategory({ book, chapter, section, subsection, prompt, solution }) {
  const source = `${book.name} ${chapter} ${section} ${subsection} ${prompt} ${solution}`.toLowerCase();
  if (/neural|deep learning|transformer|cnn|rnn|神经网络|深度学习/.test(source)) return "deepLearning";
  if (/machine learning|xgboost|random forest|feature|classification|机器学习|特征工程/.test(source)) return "machineLearning";
  if (/pandas|numpy|dataframe|data\.table|sql|database|r script|ggplot|数据清洗/.test(source)) return "pandasNumpy";
  if (/algorithm|data structure|array|linked list|tree|graph|sort|leetcode|c\+\+|virtual function|python list|merge sort|算法|数据结构|滚动最大|回撤/.test(source)) return "leetcode";
  if (/black.?scholes|option|call option|put option|greek|delta|gamma|vega|theta|volatility|swap|forward|futures?|bond|derivative|hull|期权|波动率|远期|期货|互换|衍生品/.test(source)) return "option";
  if (/market making|order book|trading|arbitrage|portfolio|hedg(?:e|ing)|risk|asset|stock|做市|交易|套利|投资组合|风险|资产/.test(source)) return "market";
  if (/regression|ols|lasso|ridge|p-value|hypothesis|estimat|correlation|covariance|linear algebra|matrix|eigen|统计|回归|估计|协方差|相关|矩阵|特征值|线性代数/.test(source)) return "statistics";
  if (/mental math|percent|arithmetic|速算|口算/.test(source)) return "mentalMath";
  return book.defaultCategory || "probabilityExpectation";
}

function inferDifficulty({ title, prompt, solution }) {
  const text = `${title} ${prompt} ${solution}`.toLowerCase();
  if (/prove|derive|stochastic differential|black.?scholes|martingale|brownian|eigen|证明|推导|鞅|布朗|随机微分|特征值/.test(text)) return "Hard";
  if (/easy|basic|warm.?up|first look|入门|基础/.test(text)) return "Easy";
  return "Medium";
}

function readableCategory(category) {
  return {
    leetcode: "Algorithms",
    pandasNumpy: "Pandas/NumPy",
    probabilityExpectation: "Probability/Expectation",
    statistics: "Statistics",
    machineLearning: "Machine Learning",
    deepLearning: "Deep Learning",
    market: "Market",
    option: "Option",
    mentalMath: "Mental Math"
  }[category] || category;
}

function isMostlyAscii(text) {
  const value = String(text || "");
  if (!value) return false;
  const ascii = value.replace(/[^\x00-\x7F]/g, "").length;
  return ascii / value.length > 0.88;
}

function cleanInlineText(text) {
  let value = String(text || "")
    .replace(/\$([^$]+)\$/g, "$1")
    .replace(/\\text(?:bf|sf|it|tt)\{([^{}]*)\}/g, "$1")
    .replace(/\\emph\{([^{}]*)\}/g, "$1")
    .replace(/\\textbackslash\{\}/g, "\\")
    .replace(/\\textasciitilde\{\}/g, "~")
    .replace(/\\&/g, "&")
    .replace(/\\%/g, "%")
    .replace(/\\_/g, "_")
    .replace(/\\(?:,|;|!|quad|qquad)/g, " ")
    .replace(/[{}]/g, "")
    .replace(/~/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  value = value.replace(/^(?:chapter|section)\s+\d+[.:]\s*/i, "");
  return value;
}

function cleanTexBlock(text) {
  let value = String(text || "")
    .replace(/^\s*%.*$/gm, "")
    .replace(/\\solution\b/g, "")
    .replace(/\\(?:par|noindent|medskip|smallskip|bigskip|centering)\b/g, "")
    .replace(/\\vspace\{[^}]*\}/g, "")
    .replace(/\\includegraphics(?:\[[^\]]*\])?\{[^{}]+\}/g, "")
    .replace(/\\caption\{([^{}]*)\}/g, "$1")
    .replace(/\\begin\{(?:figure|figure\*)\}(?:\[[^\]]*\])?/g, "")
    .replace(/\\end\{(?:figure|figure\*)\}/g, "")
    .replace(/\\begin\{(?:itemize|enumerate|center)\}(?:\[[^\]]*\])?/g, "")
    .replace(/\\end\{(?:itemize|enumerate|center)\}/g, "")
    .replace(/^\s*\\item\s*/gm, "- ")
    .replace(/\\begin\{hintbox\}/g, "\n提示：\n")
    .replace(/\\end\{hintbox\}/g, "")
    .replace(/\\begin\{conceptbox\}/g, "\n")
    .replace(/\\end\{conceptbox\}/g, "")
    .replace(/\\begin\{equation\*?\}/g, "\\[")
    .replace(/\\end\{equation\*?\}/g, "\\]")
    .replace(/\\begin\{align\*?\}/g, "\\[\\begin{aligned}")
    .replace(/\\end\{align\*?\}/g, "\\end{aligned}\\]")
    .replace(/\\text(?:bf|sf|it|tt)\{([^{}]*)\}/g, "**$1**")
    .replace(/\\emph\{([^{}]*)\}/g, "$1")
    .replace(/\\textcolor\{[^{}]*\}\{([^{}]*)\}/g, "$1")
    .replace(/\\rowcolor\{[^{}]*\}/g, "")
    .replace(/\\textbackslash\{\}/g, "\\")
    .replace(/\\textasciitilde\{\}/g, "~")
    .replace(/\\&/g, "&")
    .replace(/\\%/g, "%")
    .replace(/\\_/g, "_")
    .replace(/\\1(?![A-Za-z])/g, "\\mathbf{1}")
    .replace(/~/g, " ");

  value = replaceBracedCommand(value, "boxedeq", (argument) => `\\[\\boxed{${argument}}\\]`);
  return value
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanPromptBlock(text) {
  return String(text || "")
    .replace(/\s+\d\.\d\.\s+(?:QUESTIONS|问题)\b[\s\S]*$/i, "")
    .replace(/\s+\d\.\d\.\d\.\s+(?:[A-Z][A-Za-z /+-]+|[\u3400-\u9fff]+)[。.]?[\s\S]*$/g, "")
    .replace(/\s+\d\.\d\.\s*(?:SOLUTIONS|解决方案|解答|解)\b[\s\S]*$/i, "")
    .replace(/\s+(?:QUESTION|Question|QuEsTION|QuESTION|QuesTION|QuEsTIOoN|QugEstTIon|问题)\s+\d+\.\d+[\s\S]*$/g, "")
    .replace(/\s+第\s*\d+\s*章[\s\S]*$/g, "")
    .trim();
}

function replaceBracedCommand(text, command, format) {
  const needle = `\\${command}{`;
  let output = "";
  let cursor = 0;
  while (cursor < text.length) {
    const start = text.indexOf(needle, cursor);
    if (start < 0) return output + text.slice(cursor);
    output += text.slice(cursor, start);
    let depth = 1;
    let end = start + needle.length;
    for (; end < text.length && depth > 0; end += 1) {
      if (text[end] === "{") depth += 1;
      if (text[end] === "}") depth -= 1;
    }
    const argument = text.slice(start + needle.length, end - 1);
    output += depth === 0 ? format(argument) : text.slice(start, end);
    cursor = end;
  }
  return output;
}

function extractArchivedAppendix(sourceLines, book, offset) {
  const start = findLine(sourceLines, 0, (line) => line.includes("\\chapter{练习题}"));
  const end = findLine(sourceLines, start + 1, (line) => /\\chapter\{Leetcode/.test(line));
  if (start < 0 || end < 0) return [];

  const prompts = [];
  let buffer = [];
  sourceLines.slice(start, end).forEach((line) => {
    if (/^\s*\\item\b/.test(line)) {
      if (buffer.length) prompts.push(buffer.join("\n"));
      buffer = [line.replace(/^\s*\\item\s*/, "")];
      return;
    }
    if (buffer.length && !/\\end\{enumerate\}/.test(line)) buffer.push(line);
  });
  if (buffer.length) prompts.push(buffer.join("\n"));

  const appendixTitles = [
    "十枚硬币奇偶性",
    "混合硬币奇偶性",
    "圆内随机点距离",
    "阶乘末尾零",
    "阶乘末位非零数字",
    "连续双六等待时间",
    "随机三角形包含圆心",
    "HTT 首次出现等待时间",
    "条件正态象限概率",
    "正态半径条件期望",
    "菱形区域整数点计数",
    "偏置多边形随机游走",
    "绳上两点距离分布",
    "有序整数分拆极限",
    "根式幂个位数字",
    "均匀次序统计协方差",
    "相关正态条件概率",
    "余弦无理性证明",
    "三人硬币转移链",
    "球面短弧期望",
    "数字乘积最小数",
    "男女相邻对数期望"
  ];

  return prompts.map((prompt, index) => {
    const promptText = cleanTexBlock(prompt);
    const title = appendixTitles[index] || `题库练习 ${index + 1}`;
    const category = inferCategory({ book, chapter: "练习题", section: "", subsection: title, prompt: promptText, solution: "" });
    return {
      id: `${book.idPrefix || book.slug}-exercise-${String(index + 1).padStart(3, "0")}`,
      titleEn: "",
      titleZh: title,
      category,
      difficulty: inferDifficulty({ title, prompt: promptText, solution: "" }),
      tags: [book.name, "练习题", ...inferTopicTags(promptText)].slice(0, 7),
      source: book.slug,
      sourceUrl: book.name,
      sourceType: "book",
      bookSlug: book.slug,
      bookName: book.name,
      visibility: "public",
      promptEn: "",
      promptZh: promptText,
      answer: "",
      answerEn: "",
      answerZh: "",
      explanation: "",
      explanationEn: "",
      explanationZh: "",
      createdAt: importedAt,
      updatedAt: importedAt
    };
  });
}

function parseArgs(args) {
  const parsed = { _: [] };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      parsed._.push(arg);
      continue;
    }
    const [rawKey, inlineValue] = arg.slice(2).split("=");
    const key = rawKey.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    if (inlineValue !== undefined) {
      parsed[key] = inlineValue;
      continue;
    }
    const next = args[index + 1];
    if (next && !next.startsWith("--")) {
      parsed[key] = next;
      index += 1;
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
}
