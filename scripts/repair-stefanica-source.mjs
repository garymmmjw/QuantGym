import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const bookRoot = path.resolve(process.env.QUANTGYM_BOOK_ROOT || path.join(projectRoot, "量化书籍"));
const bookDir = path.join(bookRoot, "纯textbook", "Stefanica金融工程数学入门 A Primer for the Mathematics of Financial Engineering");
const englishPath = path.join(bookDir, "quant_stefanica_book.tex");
const chinesePath = path.join(bookDir, "quant_stefanica_book_zh.tex");
const reviewedCatalogPath = path.join(projectRoot, "data", "question-banks", "stefanica-fe-math", "problems.json");

if (!process.argv.includes("--legacy-clean")) {
  for (const [filePath, language] of [[englishPath, "en"], [chinesePath, "zh"]]) {
    rebuildSourceFromReviewedCatalog(filePath, language);
  }
  process.exit(0);
}

for (const [filePath, language] of [[englishPath, "en"], [chinesePath, "zh"]]) {
  let entries = readEntries(filePath);
  if (entries.length !== 35) {
    rebuildSourceFromTrackedCatalog(filePath, language);
    entries = readEntries(filePath);
  }
  let promptRepairs = 0;
  let solutionRepairs = 0;
  let titleRepairs = 0;

  entries.forEach((entry, index) => {
    const problemNumber = index + 1;
    const manual = stefanicaManualText().get(problemNumber);

    const prompt = manual?.[language]?.prompt || cleanStefanicaPrompt(entry.prompt, entry.title, language);
    const solution = manual?.[language]?.solution || cleanStefanicaSolution(entry.solution, language, problemNumber);
    const title = manual?.[language]?.title || stefanicaTitleFromPrompt(prompt, language);

    if (prompt && prompt !== entry.prompt) {
      entry.prompt = prompt;
      promptRepairs += 1;
    }
    if (solution && solution !== entry.solution) {
      entry.solution = solution;
      solutionRepairs += 1;
    }
    if (title && title !== entry.title) {
      entry.title = title;
      titleRepairs += 1;
    }
  });

  writeEntries(filePath, entries);
  console.log(`${path.relative(projectRoot, filePath)}: repaired ${promptRepairs} prompt(s), ${solutionRepairs} solution(s), ${titleRepairs} title(s).`);
}

function cleanStefanicaPrompt(prompt, title, language) {
  let value = normalizeStefanicaText(prompt);
  const heading = normalizeStefanicaText(title);
  const marker = lastExampleMarkerIndex(value);

  if (marker >= 0) {
    value = value.slice(marker);
  } else if (hasExampleMarker(heading) && !/^Example\s*$/i.test(heading.trim()) && !/^示例\s*[:：]?$/i.test(heading.trim())) {
    value = `${heading} ${value}`.trim();
  }

  value = normalizeStefanicaText(value);
  value = stripStefanicaPromptSpillover(value, language);
  if (language === "zh") value = normalizeChineseExamplePrefix(value);
  return value.trim();
}

function cleanStefanicaSolution(solution, language, problemNumber) {
  let value = normalizeStefanicaText(solution);
  value = stripStefanicaSolutionSpillover(value, language, problemNumber);
  if (language === "zh") value = translateShortEnglishAnswerIfNeeded(value, problemNumber);
  return value.trim();
}

function normalizeStefanicaText(text) {
  return String(text || "")
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
}

function lastExampleMarkerIndex(text) {
  const markers = ["Example:", "示例：", "示例:", "举例：", "举例:"];
  return markers.reduce((best, marker) => {
    const index = String(text || "").lastIndexOf(marker);
    return index > best ? index : best;
  }, -1);
}

function hasExampleMarker(text) {
  return lastExampleMarkerIndex(text) >= 0;
}

function stripStefanicaPromptSpillover(text, language) {
  let value = String(text || "");
  const replacements = [
    [/\s+CHAPTER\s+\d+\.[^.!?。？]*\.\s*/gi, " "],
    [/\s+\d+\s+CHAPTER\s+\d+\.[^.!?。？]*\.\s*/gi, " "],
    [/\s+MATHEMATICAL PRELIMINARIES\b[\s\S]*$/i, ""],
    [/\s+FINANCIAL APPLICATIONS\b[\s\S]*$/i, ""],
    [/\s+\d+\.\d+\.\s+[A-Z][A-Z .'-]+\b[\s\S]*$/g, ""],
    [/\s+2The same characteristic polynomial\b[\s\S]*$/i, ""],
    [/\s+fact that the point\b[\s\S]*$/i, ""],
    [/\s+第\s*\d+\s*章[^。？!?]*[。.]?\s*/g, " "],
    [/\s+数学预备知识\b[\s\S]*$/g, ""],
    [/\s+金融应用\b[\s\S]*$/g, ""]
  ];
  for (const [pattern, replacement] of replacements) {
    value = value.replace(pattern, replacement);
  }
  if (language === "zh") {
    value = value.replace(/\bExample:/g, "示例：");
  }
  return normalizeStefanicaText(value);
}

function stripStefanicaSolutionSpillover(text, language, problemNumber) {
  let value = String(text || "");
  const stopPatterns = [
    /\s+\d+\.\d+\.\s+[A-Z][A-Z .'-]+\b[\s\S]*$/g,
    /\s+CHAPTER\s+\d+\.[A-Z .'-]+\b[\s\S]*$/g,
    /\s+MATHEMATICAL PRELIMINARIES\b[\s\S]*$/i,
    /\s+FINANCIAL APPLICATIONS\b[\s\S]*$/i,
    /\s+Definition\s+\d+\.\d+\b[\s\S]*$/i,
    /\s+Lemma\s+\d+\.\d+\b[\s\S]*$/i,
    /\s+Theorem\s+\d+\.\d+\b[\s\S]*$/i,
    /\s+Exercises\s+\d*\b[\s\S]*$/i,
    /\s+References\b[\s\S]*$/i,
    /\s+第\s*\d+\s*章[\s\S]*$/g,
    /\s+数学预备知识\b[\s\S]*$/g,
    /\s+金融应用\b[\s\S]*$/g,
    /\s+定义\s*\d+\.\d+\b[\s\S]*$/g,
    /\s+引理\s*\d+\.\d+\b[\s\S]*$/g,
    /\s+定理\s*\d+\.\d+\b[\s\S]*$/g,
    /\s+练习\s*\d*\b[\s\S]*$/g,
    /\s+参考文献\b[\s\S]*$/g
  ];
  for (const pattern of stopPatterns) {
    value = value.replace(pattern, "");
  }

  const problemStops = {
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
  for (const pattern of problemStops) {
    value = value.replace(pattern, "");
  }

  if (/\bD\s*$/.test(value) || /。\s*D\s*$/.test(value)) return normalizeStefanicaText(value);
  return normalizeStefanicaText(value);
}

function translateShortEnglishAnswerIfNeeded(value, problemNumber) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (!mostlyEnglish(text)) return text;
  const manual = stefanicaManualText().get(problemNumber)?.zh?.solution;
  return manual || text;
}

function mostlyEnglish(text) {
  const value = String(text || "");
  const latin = (value.match(/[A-Za-z]/g) || []).length;
  const cjk = (value.match(/[\u3400-\u9fff]/g) || []).length;
  return latin > 120 && latin > cjk * 3;
}

function normalizeChineseExamplePrefix(value) {
  return String(value || "")
    .replace(/^示例:/, "示例：")
    .replace(/^举例:/, "示例：")
    .replace(/^举例：/, "示例：")
    .trim();
}

function stefanicaTitleFromPrompt(prompt, language) {
  const text = normalizeStefanicaText(prompt)
    .replace(/^(?:Example|示例|举例)\s*[:：]\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "";
  const sentence = text.match(/^(.{14,120}?[?？。.]|\S.{0,110})/)?.[1] || text.slice(0, 110);
  const title = sentence.replace(/[?？。.\s]+$/g, "").trim();
  return language === "zh" ? `示例：${title}` : `Example: ${title}`;
}

function stefanicaManualText() {
  return new Map([
    [7, {
      zh: {
        prompt: "示例：设 D = [1,3] x [2,5]，f(x, y) = 2y - 3x。计算二重积分 $\\int\\!\\int_D f(x,y)\\,dxdy$。",
        title: "示例：矩形区域上的二重积分"
      }
    }],
    [8, {
      zh: {
        prompt: "示例：设 D 为以 0 为圆心、半径为 2 的圆盘，f(x, y) = 1 - x^2 - y^2。计算二重积分 $\\int\\!\\int_D f(x,y)\\,dxdy$。",
        title: "示例：圆盘区域上的二重积分"
      }
    }],
    [10, {
      zh: {
        prompt: "示例：用 n = 8 个分割区间，分别用中点法、梯形法和 Simpson 法近似定积分 $I = \\int_1^3 (1/(x+1))^2 dx$，并记为 IM、IT 和 IS。计算 I 的精确值以及对应的近似误差。",
        solution: "令 f(x) = (1/(x+1))^2。对于 n = 8，步长 h = 1/4。由中点法、梯形法和 Simpson 法可得近似值分别约为 0.24943374、0.25113543 和 0.25000097。精确积分为 I = 1/4，因此误差约为 0.00056625、0.00113543 和 0.00000097。",
        title: "示例：中点、梯形和 Simpson 积分近似"
      }
    }],
    [11, {
      en: {
        prompt: "Example: Consider a semiannual coupon bond with coupon rate 6\\% and maturity 20 months. Assume that the face value of the bond is 100, and that interest is compounded continuously. (i) Compute the price of the bond if the zero rate is r(0,t)=0.0525+ln(1+2t)/200. (ii) Compute the price of the bond if the instantaneous interest rate curve is r(t)=0.0525+1/(100(1+e^{-t^2})). (iii) Compute the price of the bond if r(t)=0.0525+ln(1+2t)/(t+100(1+2t)).",
        title: "Example: Semiannual coupon bond price from rate curves"
      },
      zh: {
        prompt: "示例：考虑一只半年付息债券，票面利率为 6\\%，期限为 20 个月，面值为 100，利息连续复利。(i) 若零利率为 r(0,t)=0.0525+ln(1+2t)/200，计算债券价格。(ii) 若瞬时利率曲线为 r(t)=0.0525+1/(100(1+e^{-t^2}))，计算债券价格。(iii) 若 r(t)=0.0525+ln(1+2t)/(t+100(1+2t))，计算债券价格。",
        title: "示例：由利率曲线计算半年付息债券价格"
      }
    }],
    [12, {
      en: {
        prompt: "Example: Consider a semiannual coupon bond with face value 100, coupon rate 6\\%, and maturity 20 months. If the yield of the bond is 6.50\\%, compute the price, duration, and convexity of the bond.",
        title: "Example: Bond price, duration, and convexity"
      },
      zh: {
        prompt: "示例：考虑一只面值为 100、票面利率为 6\\%、期限为 20 个月的半年付息债券。若债券收益率为 6.50\\%，计算债券价格、久期和凸性。",
        title: "示例：债券价格、久期和凸性"
      }
    }],
    [17, {
      en: {
        prompt: "Example: Use the Black-Scholes formula to price a six months European call option with strike 40, on an underlying asset with spot price 42 and volatility 30\\%, which pays dividends continuously, with dividend rate 3\\%. Assume that interest rates are constant at 5\\%. Price a six months European put option with strike 40 on the same asset, using the Black-Scholes formula. Check whether the Put-Call parity is satisfied.",
        title: "Example: Black-Scholes call and put prices"
      },
      zh: {
        prompt: "示例：使用 Black-Scholes 公式为一份 6 个月欧式看涨期权定价。该期权行权价为 40，标的资产现价为 42、波动率为 30\\%，并以 3\\% 的股息率连续支付股息。假设利率恒定为 5\\%。再用 Black-Scholes 公式为同一标的、同一行权价的 6 个月欧式看跌期权定价，并检查看跌-看涨平价是否成立。",
        title: "示例：Black-Scholes 看涨和看跌期权定价"
      }
    }],
    [19, {
      en: {
        prompt: "Example: Estimate the relative errors given by the approximation formulas from section 5.5.1 for the value, the Greeks, and the implied volatility of a six months at-the-money call with strike 40 on a non-dividend-paying underlying asset with volatility 25\\%, assuming zero interest rates.",
        title: "Example: Taylor approximation errors for an ATM call"
      },
      zh: {
        prompt: "示例：对于一份 6 个月平值看涨期权，行权价为 40，标的资产不支付股息、波动率为 25\\%，且假设利率为 0。估计第 5.5.1 节近似公式在期权价值、Greeks 和隐含波动率上的相对误差。",
        solution: "在 S = K = 40、T = 0.5、sigma = 0.25 且 r = q = 0 时，Black-Scholes 看涨期权价值为 2.817284，而公式 (5.66) 的近似值为 2.820948，相对误差约为 0.13\\%。用第 3.6 节公式计算 Greeks，并与第 5.5.1 节近似公式比较，可得到各 Greek 的相对误差；由近似价格反推出的隐含波动率也与原波动率非常接近。",
        title: "示例：平值看涨期权的 Taylor 近似误差"
      }
    }],
    [21, {
      zh: {
        solution: "由链式法则，d/dt f(x,y) = (2x + y^3)·2e^{2t} + (1 + 3xy^2)·2t。代入 x = e^{2t}、y = t^2，得到 2(2e^{2t}+t^6)e^{2t}+2t(1+3e^{2t}t^4)。"
      }
    }],
    [23, {
      zh: {
        prompt: "示例：设 D = D(0,2) 为以 0 为圆心、半径为 2 的圆盘，f(x,y)=1-x^2-y^2。计算二重积分 $\\int\\!\\int_D f(x,y)\\,dxdy$。",
        title: "示例：用极坐标计算圆盘上的二重积分"
      }
    }],
    [31, {
      en: {
        prompt: "Example: Use Newton's method to solve F(x) = 0 for the nonlinear three-dimensional system displayed in the source text, using the initial guesses x0 = (1,1,1)^T and x0 = (2,2,2)^T.",
        title: "Example: Newton's method for a three-dimensional nonlinear system"
      },
      zh: {
        prompt: "示例：对原书中给出的三维非线性方程组 F(x)=0 使用牛顿法求解，分别使用初始猜测 x0=(1,1,1)^T 和 x0=(2,2,2)^T。",
        title: "示例：三维非线性方程组的牛顿法"
      }
    }],
    [32, {
      en: {
        prompt: "Example: Use the approximate Newton's method to solve F(x) = 0 for the same three-dimensional nonlinear system as the previous example.",
        title: "Example: Approximate Newton's method for a nonlinear system"
      },
      zh: {
        prompt: "示例：对上一题相同的三维非线性方程组 F(x)=0 使用近似牛顿法求解。",
        title: "示例：三维非线性方程组的近似牛顿法"
      }
    }],
    [33, {
      en: {
        prompt: "Example: Find a minimal variance portfolio with 11.5\\% expected rate of return if four assets can be traded to set up the portfolio, given the expected returns, volatilities, and correlations listed in the source text.",
        title: "Example: Minimal variance portfolio with target return"
      },
      zh: {
        prompt: "示例：给定原书中列出的 4 个资产的期望收益率、波动率和相关系数，求一个期望收益率为 11.5\\% 的最小方差投资组合。",
        title: "示例：给定目标收益率的最小方差投资组合"
      }
    }]
  ]);
}

function readEntries(filePath) {
  const tex = fs.readFileSync(filePath, "utf8").replace(/\0/g, "");
  const lines = tex.split(/\r?\n/);
  const firstEntryLine = lines.findIndex((line) => /^\s*\\subsection\{/.test(line));
  if (firstEntryLine < 0) throw new Error(`No problem entries found in ${filePath}`);
  const entries = [];

  let index = firstEntryLine;
  while (index < lines.length) {
    const line = lines[index];
    if (/^\s*\\end\{document\}/.test(line)) break;
    if (!/^\s*\\subsection\{/.test(line)) {
      index += 1;
      continue;
    }

    const title = readBracedLine(line, "\\subsection");
    const promptStart = findLine(lines, index + 1, (candidate) => /^\s*\\begin\{problembox\}/.test(candidate));
    if (promptStart < 0) break;
    const promptEnd = findLine(lines, promptStart + 1, (candidate) => /^\s*\\end\{problembox\}/.test(candidate));
    if (promptEnd < 0) break;
    const solutionStart = findLine(lines, promptEnd + 1, (candidate) => /^\s*\\solution\b/.test(candidate));
    if (solutionStart < 0) break;
    const nextEntry = findLine(lines, solutionStart + 1, (candidate) => /^\s*\\subsection\{/.test(candidate) || /^\s*\\end\{document\}/.test(candidate));
    const solutionEnd = nextEntry >= 0 ? nextEntry : lines.length;

    entries.push({
      title: title.trim(),
      prompt: lines.slice(promptStart + 1, promptEnd).join("\n").trim(),
      solution: lines.slice(solutionStart + 1, solutionEnd).join("\n").trim()
    });
    index = solutionEnd;
  }
  if (!entries.length) throw new Error(`No problem entries found in ${filePath}`);
  const prefix = lines.slice(0, firstEntryLine).join("\n").replace(/\s+$/, "");
  const endDocumentLine = lines.findIndex((line, lineIndex) => lineIndex > firstEntryLine && /^\s*\\end\{document\}/.test(line));
  const suffix = lines.slice(endDocumentLine >= 0 ? endDocumentLine : lines.length).join("\n").replace(/^\s+/, "");
  return Object.assign(entries, { prefix, suffix });
}

function rebuildSourceFromTrackedCatalog(filePath, language) {
  const relativeCatalogPath = "data/question-banks/stefanica-fe-math/problems.json";
  const result = spawnSync("git", ["show", `HEAD:${relativeCatalogPath}`], {
    cwd: projectRoot,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 20
  });
  if (result.status !== 0) {
    throw new Error(`Cannot rebuild ${filePath}; git show failed for ${relativeCatalogPath}: ${result.stderr}`);
  }

  const problems = JSON.parse(result.stdout).problems || [];
  if (problems.length !== 35) {
    throw new Error(`Expected 35 tracked Stefanica problems, found ${problems.length}`);
  }

  const current = fs.readFileSync(filePath, "utf8");
  const prefix = current.slice(0, current.search(/^\s*\\subsection\{/m)).replace(/\s+$/, "");
  const suffix = "\\end{document}";
  const body = problems.map((problem, index) => {
    const title = language === "zh"
      ? (problem.titleZh || problem.titleEn || `Stefanica 题目 ${index + 1}`)
      : (problem.titleEn || problem.titleZh || `Stefanica problem ${index + 1}`);
    const prompt = language === "zh"
      ? (problem.promptZh || problem.promptEn || problem.prompt || "")
      : (problem.promptEn || problem.promptZh || problem.prompt || "");
    const solution = language === "zh"
      ? (problem.explanationZh || problem.explanationEn || problem.explanation || "")
      : (problem.explanationEn || problem.explanationZh || problem.explanation || "");
    return [
      `\\subsection{${escapeLatexText(title)}}`,
      "",
      "\\begin{problembox}",
      escapeLatexText(prompt),
      "\\end{problembox}",
      "",
      "\\solution",
      escapeLatexText(solution)
    ].join("\n");
  }).join("\n\n");

  fs.writeFileSync(filePath, `${prefix}\n\n${body}\n\n${suffix}\n`);
  console.log(`${path.relative(projectRoot, filePath)}: rebuilt from tracked catalog because source had ${readEntries(filePath).length} entries.`);
}

function rebuildSourceFromReviewedCatalog(filePath, language) {
  if (!fs.existsSync(reviewedCatalogPath)) {
    throw new Error(`Missing reviewed Stefanica catalog: ${reviewedCatalogPath}`);
  }
  const problems = JSON.parse(fs.readFileSync(reviewedCatalogPath, "utf8")).problems || [];
  if (problems.length !== 35) {
    throw new Error(`Expected 35 reviewed Stefanica problems, found ${problems.length}`);
  }

  const current = fs.readFileSync(filePath, "utf8");
  const firstEntry = current.search(/^\s*\\subsection\{/m);
  const prefix = (firstEntry >= 0 ? current.slice(0, firstEntry) : current.replace(/\\end\{document\}[\s\S]*$/, "")).replace(/\s+$/, "");
  const body = problems.map((problem, index) => {
    const title = language === "zh"
      ? (problem.titleZh || problem.titleEn || `Stefanica 题目 ${index + 1}`)
      : (problem.titleEn || problem.titleZh || `Stefanica problem ${index + 1}`);
    const prompt = language === "zh"
      ? (problem.promptZh || problem.promptEn || "")
      : (problem.promptEn || problem.promptZh || "");
    const solution = language === "zh"
      ? (problem.explanationZh || problem.explanationEn || "")
      : (problem.explanationEn || problem.explanationZh || "");
    return [
      `\\subsection{${escapeLatexText(title)}}`,
      "",
      "\\begin{problembox}",
      escapeLatexText(prompt),
      "\\end{problembox}",
      "",
      "\\solution",
      escapeLatexText(solution)
    ].join("\n");
  }).join("\n\n");

  fs.writeFileSync(filePath, `${prefix}\n\n${body}\n\n\\end{document}\n`);
  console.log(`${path.relative(projectRoot, filePath)}: rebuilt from reviewed catalog (${problems.length} entries).`);
}

function escapeLatexText(value) {
  return String(value || "")
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/([%$&#_{}])/g, "\\$1")
    .replace(/~/g, "\\textasciitilde{}")
    .trim();
}

function readBracedLine(line, command) {
  const prefix = `${command}{`;
  const start = line.indexOf(prefix);
  if (start < 0) return "";
  const body = line.slice(start + prefix.length).trim();
  return body.endsWith("}") ? body.slice(0, -1) : body;
}

function findLine(lines, start, predicate) {
  for (let index = start; index < lines.length; index += 1) {
    if (predicate(lines[index], index)) return index;
  }
  return -1;
}

function writeEntries(filePath, entries) {
  const body = entries.map((entry) => [
    `\\subsection{${entry.title}}`,
    "",
    "\\begin{problembox}",
    entry.prompt.trim(),
    "\\end{problembox}",
    "",
    "\\solution",
    entry.solution.trim()
  ].join("\n")).join("\n\n");
  const next = `${entries.prefix}\n\n${body}\n\n${entries.suffix.trim()}\n`;
  const current = fs.readFileSync(filePath, "utf8");
  if (next !== current) fs.writeFileSync(filePath, next);
}
