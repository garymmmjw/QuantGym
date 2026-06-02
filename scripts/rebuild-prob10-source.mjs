import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const bookRoot = path.resolve(process.env.QUANTGYM_BOOK_ROOT || path.join(projectRoot, "量化书籍"));
const catalogPath = path.join(projectRoot, "data", "question-banks", "probability-stochastic-10", "problems.json");
const bookDir = path.join(bookRoot, "有题目的", "概率随机分析10题 First 10 Questions - Probability Stochastic Calc IQs");
const englishPath = path.join(bookDir, "quant_prob10_book.tex");
const chinesePath = path.join(bookDir, "quant_prob10_book_zh.tex");

const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const problems = Array.isArray(catalog.problems) ? catalog.problems : [];

for (const [filePath, language] of [[englishPath, "en"], [chinesePath, "zh"]]) {
  rebuildSource(filePath, language);
}

function rebuildSource(filePath, language) {
  const title = language === "zh"
    ? "概率与随机分析面试题 10 题"
    : "Probability & Stochastic Calc IQs (First 10 Questions)";
  const subtitle = language === "zh" ? "Reviewed QuantGym problem cards" : "Reviewed QuantGym problem cards";
  const solutionLabel = language === "zh" ? "解答" : "Solution";
  const lines = [
    "% !TEX program = xelatex",
    "\\documentclass[11pt,a4paper,oneside]{ctexbook}",
    "\\usepackage{amsmath,amssymb,mathtools}",
    "\\usepackage{xcolor}",
    "\\usepackage{graphicx}",
    "\\usepackage[most]{tcolorbox}",
    "\\tcbuselibrary{breakable}",
    "\\usepackage[a4paper,margin=2.4cm,headheight=14pt]{geometry}",
    "\\usepackage{hyperref}",
    "\\usepackage{fancyhdr}",
    "\\pagestyle{fancy}",
    "\\fancyhf{}",
    "\\fancyfoot[C]{\\thepage}",
    "\\IfFontExistsTF{Noto Serif CJK SC}{",
    "  \\setCJKmainfont[BoldFont={Noto Serif CJK SC Bold}]{Noto Serif CJK SC}",
    "}{",
    "  \\setCJKmainfont[BoldFont={PingFang SC Semibold}]{PingFang SC}",
    "}",
    "\\definecolor{boxblue}{RGB}{240,245,255}",
    "\\definecolor{boxblueborder}{RGB}{80,120,200}",
    "\\newtcolorbox{problembox}{enhanced,colback=boxblue,colframe=boxblueborder,",
    "  boxrule=0.6pt,arc=2pt,left=8pt,right=8pt,top=6pt,bottom=6pt,breakable}",
    `\\newcommand{\\solution}{\\par\\noindent\\textbf{${solutionLabel}.}\\quad}`,
    "\\begin{document}",
    "\\begin{titlepage}",
    "\\centering\\vspace*{2cm}",
    "{\\Huge\\bfseries " + latexText(title) + "\\par}",
    "\\vspace{0.5cm}",
    "{\\Large " + latexText(subtitle) + "\\par}",
    "\\vfill",
    "{\\small \\textcolor{gray}{Reviewed QuantGym source}}",
    "\\end{titlepage}",
    "\\tableofcontents",
    ""
  ];

  problems.forEach((problem, index) => {
    const titleText = language === "zh"
      ? (problem.titleZh || problem.titleEn || `问题 ${index + 1}`)
      : (problem.titleEn || problem.titleZh || `Problem ${index + 1}`);
    const prompt = language === "zh"
      ? (problem.promptZh || problem.promptEn || "")
      : (problem.promptEn || problem.promptZh || "");
    const explanation = language === "zh"
      ? (problem.explanationZh || problem.answerZh || problem.explanationEn || problem.explanation || "")
      : (problem.explanationEn || problem.answerEn || problem.explanationZh || problem.explanation || "");

    lines.push(`\\subsection{${latexText(titleText)}}`);
    lines.push("");
    lines.push("\\begin{problembox}");
    lines.push(latexText(prompt));
    lines.push("\\end{problembox}");
    lines.push("");
    lines.push("\\solution");
    lines.push(latexText(explanation));
    lines.push("");
  });

  lines.push("\\end{document}");
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
  console.log(`${path.relative(projectRoot, filePath)}: rebuilt from reviewed catalog (${problems.length} entries).`);
}

function latexText(value) {
  return String(value || "")
    .replace(/(?<!\\)&/g, "\\&")
    .replace(/(?<!\\)%/g, "\\%")
    .replace(/(?<!\\)#/g, "\\#")
    .replace(/(?<!\\)_/g, "\\_")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
