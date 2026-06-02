import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const options = parseArgs(process.argv.slice(2));
const sourcePath = path.resolve(projectRoot, options.source || "data/question-banks/quantitative-primer/problems.json");
const reportPath = path.resolve(projectRoot, options.report || "artifacts/question-bank-quality-review/qprimer-reviewed-repairs-report.json");
const payload = readJson(sourcePath, { problems: [] });
const problems = Array.isArray(payload) ? payload : payload.problems || [];
const problemById = new Map(problems.map((problem) => [String(problem.id || ""), problem]));
const reviewSource = "llm-full-major-triage-reviewed-qprimer-repair-2026-06-02";

const repairs = [
  {
    id: "quantitative-primer-problem-025",
    reason: "Answer fields were empty and the existing explanation was verbose/machine-translated despite containing the core celebrity-graph idea.",
    fields: {
      tags: ["Quantitative Primer", "Interview 1.9", "Algorithms", "Graph Theory"],
      answer: "For one celebrity, use the standard candidate-elimination scan, then verify the candidate. For the David/Victoria variant, identify the two people whose only outgoing edge is to each other and verify that every other person knows both of them.",
      answerEn: "For one celebrity, use the standard candidate-elimination scan, then verify the candidate. For the David/Victoria variant, identify the two people whose only outgoing edge is to each other and verify that every other person knows both of them.",
      answerZh: "单个名人情形用标准候选人淘汰扫描，然后验证候选人。David/Victoria 变体中，找出两个只互相认识的人，并验证其他所有人都认识他们二人。",
      explanation: [
        "Model the party as a directed graph: knows(a,b) is an edge from a to b. In the first version, David Beckham is a celebrity vertex with out-degree 0 and in-degree N-1.",
        "A linear candidate scan finds the only possible celebrity. Start with candidate c=1. For each i=2,...,N, ask knows(c,i). If c knows i, then c cannot be Beckham, so set c=i. If c does not know i, then i cannot be Beckham, because everyone knows Beckham. After this scan, verify c by checking that c knows nobody and everybody else knows c. The scan uses N-1 calls and the verification uses O(N) more calls.",
        "In the David/Victoria version, the two special people each know exactly one person, namely each other; every other person knows both of them and at least one additional person. One direct method is to find the two rows of the adjacency matrix with exactly one outgoing 1 and check that these two rows point to each other. Then verify that every other person knows both candidates. This determines the pair, although the data may not distinguish which one is David and which one is Victoria unless the labels themselves are observable."
      ].join("\n\n"),
      explanationEn: [
        "Model the party as a directed graph: knows(a,b) is an edge from a to b. In the first version, David Beckham is a celebrity vertex with out-degree 0 and in-degree N-1.",
        "A linear candidate scan finds the only possible celebrity. Start with candidate c=1. For each i=2,...,N, ask knows(c,i). If c knows i, then c cannot be Beckham, so set c=i. If c does not know i, then i cannot be Beckham, because everyone knows Beckham. After this scan, verify c by checking that c knows nobody and everybody else knows c. The scan uses N-1 calls and the verification uses O(N) more calls.",
        "In the David/Victoria version, the two special people each know exactly one person, namely each other; every other person knows both of them and at least one additional person. One direct method is to find the two rows of the adjacency matrix with exactly one outgoing 1 and check that these two rows point to each other. Then verify that every other person knows both candidates. This determines the pair, although the data may not distinguish which one is David and which one is Victoria unless the labels themselves are observable."
      ].join("\n\n"),
      explanationZh: [
        "把聚会看成有向图：knows(a,b) 表示从 a 指向 b 的边。在第一种情形中，David Beckham 是一个出度为 0、入度为 N-1 的“名人”顶点。",
        "可以用线性候选人扫描找到唯一可能的名人。令候选人为 c=1。对 i=2,...,N 依次询问 knows(c,i)。如果 c 认识 i，那么 c 不可能是 Beckham，于是令 c=i；如果 c 不认识 i，那么 i 不可能是 Beckham，因为所有人都认识 Beckham。扫描结束后，再验证 c：c 不认识任何人，并且其他所有人都认识 c。扫描需要 N-1 次调用，验证还需要 O(N) 次调用。",
        "在 David/Victoria 版本中，这两个特殊人物各自只认识一个人，也就是彼此；其他每个人都认识他们二人，并且至少还认识一个其他人。一个直接方法是找出邻接矩阵中恰好只有一个出边为 1 的两行，并检查这两行是否互相指向对方；随后验证其他所有人都认识这两个候选人。这样可以确定这对人，但如果仅靠 knows() 关系本身，通常无法区分谁是 David、谁是 Victoria。"
      ].join("\n\n")
    }
  },
  {
    id: "quantitative-primer-problem-026",
    reason: "Answer fields were empty and the Python merge-sort snippet was truncated.",
    fields: {
      answer: "Without sorting, scan once with a hash set and return the first value already seen. With sorting, sort the array, then scan adjacent entries for equality. A good favorite sorting algorithm to discuss is mergesort: O(N log N) time, stable, divide-and-conquer, and easy to reason about.",
      answerEn: "Without sorting, scan once with a hash set and return the first value already seen. With sorting, sort the array, then scan adjacent entries for equality. A good favorite sorting algorithm to discuss is mergesort: O(N log N) time, stable, divide-and-conquer, and easy to reason about.",
      answerZh: "不排序时，用哈希集合扫描一遍，遇到已经出现过的值就返回。排序时，先排序再检查相邻元素是否相等。适合讨论的排序算法是归并排序：时间复杂度 O(N log N)，稳定，采用分治思想，也容易解释。",
      explanation: [
        "The no-sorting solution is to keep a set of values already seen. Iterate through the array. If x is already in the set, x is the duplicate; otherwise insert x and continue. This takes O(N) expected time and O(N) extra memory with a hash set, and it works because the integers are arbitrary, not necessarily 1 through N.",
        "With sorting, sort the array and scan adjacent pairs. The duplicate must appear in two neighboring positions after sorting, so the first index i with a[i] == a[i-1] reveals the duplicate. This takes O(N log N) time for comparison sorting and O(1) to O(N) auxiliary memory depending on the sorting algorithm.",
        "A strong sorting algorithm to discuss is mergesort. It recursively sorts the left and right halves, then merges the two sorted halves. The recurrence T(N)=2T(N/2)+O(N) gives O(N log N) time. It is stable and simple, though it typically uses O(N) extra memory.",
        "Pseudocode:",
        "function findDuplicateWithSet(a):\n  seen = new Set()\n  for x in a:\n    if x in seen:\n      return x\n    seen.add(x)",
        "function findDuplicateWithSort(a):\n  sort(a)\n  for i from 1 to length(a)-1:\n    if a[i] == a[i-1]:\n      return a[i]"
      ].join("\n\n"),
      explanationEn: [
        "The no-sorting solution is to keep a set of values already seen. Iterate through the array. If x is already in the set, x is the duplicate; otherwise insert x and continue. This takes O(N) expected time and O(N) extra memory with a hash set, and it works because the integers are arbitrary, not necessarily 1 through N.",
        "With sorting, sort the array and scan adjacent pairs. The duplicate must appear in two neighboring positions after sorting, so the first index i with a[i] == a[i-1] reveals the duplicate. This takes O(N log N) time for comparison sorting and O(1) to O(N) auxiliary memory depending on the sorting algorithm.",
        "A strong sorting algorithm to discuss is mergesort. It recursively sorts the left and right halves, then merges the two sorted halves. The recurrence T(N)=2T(N/2)+O(N) gives O(N log N) time. It is stable and simple, though it typically uses O(N) extra memory.",
        "Pseudocode:",
        "function findDuplicateWithSet(a):\n  seen = new Set()\n  for x in a:\n    if x in seen:\n      return x\n    seen.add(x)",
        "function findDuplicateWithSort(a):\n  sort(a)\n  for i from 1 to length(a)-1:\n    if a[i] == a[i-1]:\n      return a[i]"
      ].join("\n\n"),
      explanationZh: [
        "不排序的方法是维护一个已经见过的值集合。遍历数组：如果 x 已经在集合中，则 x 就是重复值；否则把 x 加入集合继续扫描。使用哈希集合时，该方法期望时间复杂度为 O(N)，额外空间为 O(N)。由于题目中的整数是任意整数、不一定是 1 到 N，这种方法比依赖求和或异或等特殊范围技巧更稳妥。",
        "使用排序的方法更直接：先对数组排序，然后扫描相邻元素。排序后重复值必然出现在相邻位置，因此第一个满足 a[i] == a[i-1] 的位置就给出重复值。比较排序通常需要 O(N log N) 时间，额外空间取决于具体排序算法。",
        "如果面试官追问喜欢的排序算法，可以讨论归并排序。它递归地排序左右两半，再把两个有序数组合并。递推式 T(N)=2T(N/2)+O(N)，因此时间复杂度为 O(N log N)。归并排序稳定、分治结构清晰、容易解释，但通常需要 O(N) 额外内存。",
        "伪代码：",
        "function findDuplicateWithSet(a):\n  seen = new Set()\n  for x in a:\n    if x in seen:\n      return x\n    seen.add(x)",
        "function findDuplicateWithSort(a):\n  sort(a)\n  for i from 1 to length(a)-1:\n    if a[i] == a[i-1]:\n      return a[i]"
      ].join("\n\n")
    }
  }
];

const changes = [];
const missing = [];
for (const repair of repairs) {
  const problem = problemById.get(repair.id);
  if (!problem) {
    missing.push(repair.id);
    continue;
  }

  const changedFields = [];
  for (const [field, value] of Object.entries(repair.fields)) {
    if (problem[field] !== value) {
      problem[field] = value;
      changedFields.push(field);
    }
  }
  problem.manualContentReviewed = true;
  problem.manualContentReviewSource = reviewSource;
  problem.manualContentReviewReason = repair.reason;
  problem.updatedAt = new Date().toISOString();
  changes.push({
    id: repair.id,
    titleEn: problem.titleEn,
    changedFields,
    reason: repair.reason
  });
}

const report = {
  generatedAt: new Date().toISOString(),
  dryRun: !options.apply,
  source: relativePath(sourcePath),
  changedProblemCount: changes.length,
  missing,
  changes
};

if (options.apply) {
  fs.writeFileSync(sourcePath, `${JSON.stringify(payload, null, 2)}\n`);
  if (options.syncSource) runNodeScript("scripts/rebuild-qprimer-source.mjs");
  if (options.rebuild) runNodeScript("scripts/build-problem-catalog.mjs");
}

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  dryRun: report.dryRun,
  changedProblemCount: report.changedProblemCount,
  missing: report.missing.length,
  report: relativePath(reportPath)
}, null, 2));

function runNodeScript(scriptPath) {
  const result = spawnSync(process.execPath, [path.join(projectRoot, scriptPath)], {
    cwd: projectRoot,
    stdio: "inherit"
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2).replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase());
    if (key === "apply" || key === "rebuild" || key === "syncSource") {
      parsed[key] = true;
      continue;
    }
    parsed[key] = args[index + 1];
    index += 1;
  }
  return parsed;
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function relativePath(filePath) {
  return path.relative(projectRoot, filePath) || ".";
}
