import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const bookRoot = path.resolve(process.env.QUANTGYM_BOOK_ROOT || path.join(projectRoot, "量化书籍"));
const catalogPath = path.join(projectRoot, "data", "question-banks", "quantitative-primer", "problems.json");
const bookDir = path.join(bookRoot, "有题目的", "Quantitative Primer");
const englishPath = path.join(bookDir, "quant_qprimer_book.tex");
const chinesePath = path.join(bookDir, "quant_qprimer_book_zh.tex");

const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const problems = Array.isArray(catalog.problems) ? catalog.problems : [];

for (const [filePath, language] of [[englishPath, "en"], [chinesePath, "zh"]]) {
  rebuildSource(filePath, language);
}

function rebuildSource(filePath, language) {
  const title = language === "zh" ? "量化面试 primer" : "Quantitative Primer";
  const subtitle = language === "zh" ? "Quantitative Primer" : "Interview Primer for Quantitative Finance";
  const subsectionLabel = language === "zh" ? "问题" : "Question";
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
    "\\definecolor{boxgreen}{RGB}{222,242,222}",
    "\\definecolor{boxgreenborder}{RGB}{100,160,100}",
    "\\newtcolorbox{problembox}{enhanced,colback=boxgreen,colframe=boxgreenborder,",
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
    const number = index + 1;
    const prompt = language === "zh"
      ? (problem.promptZh || problem.promptEn || "")
      : (problem.promptEn || problem.promptZh || "");
    const explanation = language === "zh"
      ? (problem.explanationZh || problem.explanationEn || problem.explanation || "")
      : (problem.explanationEn || problem.explanationZh || problem.explanation || "");

    lines.push(`\\subsection{${subsectionLabel} ${number}}`);
    lines.push("");
    lines.push("\\begin{problembox}");
    lines.push(latexText(prompt));
    lines.push("");
    lines.push("\\end{problembox}");
    lines.push("");
    lines.push("\\solution");
    lines.push(latexText(explanation));
    const images = Array.isArray(problem.solutionImages) ? problem.solutionImages : [];
    images.forEach((imagePath) => {
      lines.push("");
      lines.push("\\begin{center}");
      lines.push(`\\includegraphics[width=0.82\\textwidth]{${imagePath}}`);
      lines.push("\\end{center}");
    });
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
