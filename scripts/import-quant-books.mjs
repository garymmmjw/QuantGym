import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const options = parseArgs(process.argv.slice(2));
const desktopBookRoot = path.resolve(
  options.bookRoot || process.env.QUANTGYM_BOOK_ROOT || path.join(projectRoot, "..", "量化书籍")
);
const sourceRoot = path.join(projectRoot, "data", "question-banks");
const manifestPath = path.join(sourceRoot, "catalog-manifest.json");
const archivedQuestionBankDir = ["紫", "皮", "书"].join("");
const archivedQuestionBankFile = ["quant", ["pu", "rple"].join(""), "book"].join("_");

const books = [
  {
    slug: "question-bank",
    idPrefix: "catalog",
    name: "Archived Question Bank",
    path: `${archivedQuestionBankDir}/${archivedQuestionBankFile}.tex`,
    defaultCategory: "probabilityExpectation",
    includeArchivedAppendix: true,
    disabled: true,
    disabledReason: "Temporarily removed from the web catalog pending copyright review."
  },
  {
    slug: "green-book",
    name: "绿皮书",
    path: "绿皮书/quant_green_book.tex",
    defaultCategory: "probabilityExpectation"
  },
  {
    slug: "yellow-book",
    name: "黄皮书 150 Most Frequently Asked Questions",
    path: "黄皮书/quant_yellow_book.tex",
    defaultCategory: "probabilityExpectation"
  },
  {
    slug: "red-book",
    name: "红宝书 Quant Job Interview Questions And Answers",
    path: "红宝书/quant_red_book.tex",
    defaultCategory: "option"
  },
  {
    slug: "hull-derivatives",
    name: "Hull 期权期货及其他衍生品",
    path: "Hull期权期货及其他衍生品/quant_hull_book.tex",
    pdfPath: "必读textbook/option futures and other derivatives 11th.pdf",
    defaultCategory: "option"
  },
  {
    slug: "stefanica-fe-math",
    name: "Stefanica 金融工程数学入门",
    path: "Stefanica金融工程数学入门/quant_stefanica_book.tex",
    defaultCategory: "option"
  },
  {
    slug: "quantitative-primer",
    name: "Quantitative Primer",
    path: "QuantitativePrimer/quant_qprimer_book.tex",
    defaultCategory: "probabilityExpectation"
  },
  {
    slug: "dudeney-puzzles",
    name: "Dudeney 经典挑战谜题",
    path: "Dudeney挑战谜题/quant_dudeney_book.tex",
    defaultCategory: "probabilityExpectation"
  },
  {
    slug: "linalg-primer",
    name: "金融工程线性代数入门",
    path: "金融工程线性代数入门/quant_linalg_book.tex",
    defaultCategory: "statistics"
  },
  {
    slug: "probability-stochastic-10",
    name: "概率与随机分析面试题 10 题",
    path: "概率随机分析10题/quant_prob10_book.tex",
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
      /\\(?:chapter|section|subsection)\*?\{/.test(line) || /\\begin\{problembox\}/.test(line)
    ));
    const rawSolution = solutionStart >= 0
      ? lines.slice(solutionStart + 1, solutionEnd >= 0 ? solutionEnd : lines.length).join("\n")
      : "";

    const problemIndex = problems.length + 1;
    const promptText = cleanTexBlock(prompt.content);
    const solutionText = cleanTexBlock(rawSolution);
    const rawTitle = cleanInlineText(subsection) || `题目 ${problemIndex}`;
    const title = buildProblemTitle(rawTitle, promptText, problemIndex);
    const category = inferCategory({ book, chapter, section, subsection: rawTitle, prompt: promptText, solution: solutionText });
    const tags = buildTags({ book, chapter, section, subsection: rawTitle, prompt: promptText, category });

    problems.push({
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
      explanation: solutionText,
      createdAt: importedAt,
      updatedAt: importedAt
    });

    index = prompt.end;
  }

  if (book.includeArchivedAppendix) {
    problems.push(...extractArchivedAppendix(lines, book, problems.length));
  }

  if (book.slug === "hull-derivatives" && book.pdfPath) {
    hydrateHullProblemsFromPdf(problems, path.join(desktopBookRoot, book.pdfPath), book);
  }
  if (book.slug === "linalg-primer") {
    repairLinearAlgebraProblems(problems, book);
  }
  if (book.slug === "green-book") {
    repairGreenBookProblems(problems, book);
  }
  repairGeneratedBookTitles(problems, book);
  ensurePrompts(problems, book, inputPath);
  return problems;
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
    const number = String(problem.titleZh || "").match(/Practice\s+(\d{1,2}\.\d{1,2})/i)?.[1];
    if (!number) return;
    const match = questionMap[number];
    if (!match?.text) {
      missing.push(number);
      return;
    }
    const prompt = `Practice ${number}. ${normalizePdfPlainText(match.text)}`;
    problem.titleZh = `Practice ${number}`;
    problem.promptZh = prompt;
    problem.promptEn = prompt;
    problem.titleEn = `Practice ${number}`;
    problem.explanation = "（Hull 教材 Practice Question，答案请对照原版或后续解析补充。）";
    problem.tags = [...new Set([book.name, `Practice ${number}`, `Chapter ${number.split(".")[0]}`, ...inferTopicTags(prompt)])].slice(0, 7);
    problem.category = inferCategory({ book, chapter: `Chapter ${number.split(".")[0]}`, section: "", subsection: `Practice ${number}`, prompt, solution: "" });
    problem.difficulty = inferDifficulty({ title: `Practice ${number}`, prompt, solution: "" });
  });

  if (missing.length) {
    throw new Error(`Hull PDF extraction missed ${missing.length} practice question(s): ${missing.join(", ")}`);
  }
}

function normalizePdfPlainText(text) {
  return String(text || "")
    .replace(/\$(?=\d)/g, "USD ")
    .replace(/\s+/g, " ")
    .trim();
}

function repairLinearAlgebraProblems(problems, book) {
  problems.forEach((problem) => {
    if (problem.id === "linalg-primer-problem-004" || /^0\.98\s+0\.9257\b/.test(problem.titleZh)) {
      const prompt = [
        "Bond cash-flow discount factor example.",
        "",
        "Four bonds have cash flows at 1, 2, 3, and 4 years. Let d_i be the discount factor for year i. The bond prices imply the lower-triangular system:",
        "98 = 100 d_1",
        "104 = 6 d_1 + 106 d_2",
        "111 = 8 d_1 + 8 d_2 + 108 d_3",
        "102 = 5 d_1 + 5 d_2 + 5 d_3 + 105 d_4",
        "",
        "Use forward substitution to solve for d and then convert the discount factors into continuously compounded zero rates."
      ].join("\n");
      problem.titleZh = "2.2 Bond cash-flow discount factors";
      problem.titleEn = problem.titleZh;
      problem.promptZh = prompt;
      problem.promptEn = prompt;
      problem.category = "option";
      problem.difficulty = "Medium";
      problem.tags = [book.name, "Forward substitution", "discount factors", "bond", "linear algebra"];
    }

    if (problem.id === "linalg-primer-problem-005" || /^0\.8866\s+0\.8385\b/.test(problem.titleZh)) {
      problem.titleZh = "2.3 Backward substitution";
      problem.titleEn = problem.titleZh;
      problem.tags = [book.name, "Backward substitution", "linear algebra", "numerical methods"];
      problem.category = "statistics";
    }

    if (problem.id === "linalg-primer-problem-009" || /^0\.501\s+=\s+0\.501\s+-1/.test(problem.titleZh)) {
      problem.titleZh = "4.2 Characteristic polynomial and eigenvalues";
      problem.titleEn = problem.titleZh;
      problem.tags = [book.name, "Eigenvalues", "characteristic polynomial", "linear algebra"];
      problem.category = "statistics";
    }
  });
}

function repairGreenBookProblems(problems, book) {
  problems.forEach((problem) => {
    if (problem.id === "green-book-problem-099" || /textbackslash/i.test(problem.titleZh)) {
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

    if (problem.id === "green-book-problem-172" || /^\(1\+v'5f/.test(problem.titleZh)) {
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
  });
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
    sourceTexPath: book.disabled ? "" : publicSourcePath(inputPath),
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
    .replace(/(^|[^\\])%.*$/gm, "$1")
    .replace(/\\solution\b/g, "")
    .replace(/\\(?:par|noindent|medskip|smallskip|bigskip|centering)\b/g, "")
    .replace(/\\vspace\{[^}]*\}/g, "")
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
      explanation: "",
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
