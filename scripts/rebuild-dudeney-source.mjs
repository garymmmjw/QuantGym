import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const bookRoot = path.resolve(process.env.QUANTGYM_BOOK_ROOT || path.join(projectRoot, "量化书籍"));
const catalogPath = path.join(projectRoot, "data", "question-banks", "dudeney-puzzles", "problems.json");
const bookDir = path.join(bookRoot, "有题目的", "Dudeney挑战谜题 Challenging Puzzles");
const englishPath = path.join(bookDir, "quant_dudeney_book.tex");
const chinesePath = path.join(bookDir, "quant_dudeney_book_zh.tex");

const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const problems = Array.isArray(catalog.problems) ? catalog.problems : [];

for (const [filePath, language] of [[englishPath, "en"], [chinesePath, "zh"]]) {
  rebuildSource(filePath, language);
}

function rebuildSource(filePath, language) {
  const title = language === "zh" ? "Dudeney 挑战谜题" : "Dudeney Challenging Puzzles";
  const subtitle = language === "zh" ? "Good Old-Fashioned Challenging Puzzles" : "Reviewed QuantGym edition";
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
    const titleText = language === "zh"
      ? (problem.titleZh || problem.titleEn || `问题 ${index + 1}`)
      : (problem.titleEn || problem.titleZh || `Problem ${index + 1}`);
    const prompt = language === "zh"
      ? (problem.promptZh || problem.promptEn || "")
      : (problem.promptEn || problem.promptZh || "");
    const explanation = language === "zh"
      ? (problem.explanationZh || problem.explanationEn || problem.explanation || "")
      : (problem.explanationEn || problem.explanationZh || problem.explanation || "");

    lines.push(`\\subsection{${latexText(titleText)}}`);
    lines.push("");
    lines.push("\\begin{problembox}");
    lines.push(latexText(prompt));
    pushImages(lines, problem.promptImages);
    lines.push("\\end{problembox}");
    lines.push("");
    lines.push("\\solution");
    lines.push(latexText(explanation));
    pushImages(lines, problem.solutionImages);
    lines.push("");
  });

  lines.push("\\end{document}");
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
  console.log(`${path.relative(projectRoot, filePath)}: rebuilt from reviewed catalog (${problems.length} entries).`);
}

function pushImages(lines, images) {
  const values = Array.isArray(images) ? images : [];
  values.forEach((imagePath) => {
    lines.push("");
    lines.push("\\begin{center}");
    lines.push(`\\includegraphics[width=0.82\\textwidth]{${imagePath}}`);
    lines.push("\\end{center}");
  });
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
