import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const options = parseArgs(process.argv.slice(2));
const apply = Boolean(options.apply);
const rebuild = Boolean(options.rebuild || apply);
const sourcePath = path.resolve(projectRoot, options.source || "data/question-banks/quantguide/problems.json");
const externalDir = path.resolve(projectRoot, options.externalDir || "artifacts/external-translation");
const reportPath = path.resolve(projectRoot, options.report || "artifacts/question-bank-audit/quantguide-zh-glossary-cleanup-report.json");

const replacements = [
  [/geometric Brownian Motion/gi, "几何布朗运动"],
  [/standard Brownian Motions?/gi, "标准布朗运动"],
  [/Brownian Motions?/g, "布朗运动"],
  [/Brownian motion/gi, "布朗运动"],
  [/Brownian Bridge/g, "布朗桥"],
  [/Poisson processes/gi, "泊松过程"],
  [/Poisson Process/gi, "泊松过程"],
  [/Poisson process/gi, "泊松过程"],
  [/Poisson/g, "泊松"],
  [/martingale/gi, "鞅"],
  [/Put-Call Parity/gi, "看跌-看涨平价"],
  [/Put Call Parity/gi, "看跌-看涨平价"],
  [/bull call spread/gi, "牛市看涨价差"],
  [/covered calls/gi, "备兑看涨期权"],
  [/covered call/gi, "备兑看涨期权"],
  [/put spread/gi, "看跌价差"],
  [/call spread/gi, "看涨价差"],
  [/put fly/gi, "看跌蝶式组合"],
  [/straddle/gi, "跨式组合"],
  [/at-the-money European call option/gi, "平值欧式看涨期权"],
  [/at-the-money call option/gi, "平值看涨期权"],
  [/at-the-money options/gi, "平值期权"],
  [/at-the-money/gi, "平值"],
  [/European vanilla put option/gi, "欧式普通看跌期权"],
  [/European vanilla call option/gi, "欧式普通看涨期权"],
  [/vanilla European call option/gi, "普通欧式看涨期权"],
  [/European call options/gi, "欧式看涨期权"],
  [/European call option/gi, "欧式看涨期权"],
  [/European put options/gi, "欧式看跌期权"],
  [/European put option/gi, "欧式看跌期权"],
  [/binary puts/gi, "二元看跌期权"],
  [/binary put/gi, "二元看跌期权"],
  [/binary call/gi, "二元看涨期权"],
  [/call options/gi, "看涨期权"],
  [/call option/gi, "看涨期权"],
  [/put options/gi, "看跌期权"],
  [/put option/gi, "看跌期权"],
  [/\bcalls\b/gi, "看涨期权"],
  [/\bputs\b/gi, "看跌期权"],
  [/\bcall\b/gi, "看涨期权"],
  [/\bput\b/gi, "看跌期权"],
  [/options chain/gi, "期权链"],
  [/option chain/gi, "期权链"],
  [/implied volatility/gi, "隐含波动率"],
  [/breakeven price/gi, "盈亏平衡价格"],
  [/delta-hedge/gi, "Delta 对冲"],
  [/delta hedge/gi, "Delta 对冲"],
  [/GBM dynamics/g, "GBM 动态"],
  [/Black-Scholes dynamics/g, "Black-Scholes 动态"],
  [/\bdynamics\b/gi, "动态"],
  [/joint pdf/gi, "联合概率密度函数"],
  [/\bpdf\b/g, "概率密度函数"],
  [/interarrival times/gi, "到达间隔时间"],
  [/\bpayoff\b/gi, "收益"],
  [/\bintrinsic\b/gi, "内在"],
  [/\bextrinsic\b/gi, "外在"],
  [/\bunderlying\b/gi, "标的"],
  [/\basset\b/gi, "资产"],
  [/\bgamma\b/g, "Gamma"],
  [/\bvega\b/g, "Vega"]
];

const reports = [];

if (fs.existsSync(sourcePath)) {
  const payload = readJson(sourcePath);
  const problems = Array.isArray(payload) ? payload : payload.problems || [];
  let changedProblems = 0;
  for (const problem of problems) {
    const changes = cleanupObject(problem, ["titleZh", "promptZh"]);
    if (changes.length) {
      changedProblems += 1;
      problem.updatedAt = new Date().toISOString();
      reports.push({
        target: relativePath(sourcePath),
        id: problem.id || "",
        fields: changes.map((change) => change.field).join("|")
      });
    }
  }
  if (apply && changedProblems) {
    writeJson(sourcePath, Array.isArray(payload) ? problems : { ...payload, problems });
  }
}

if (fs.existsSync(externalDir)) {
  const files = fs.readdirSync(externalDir)
    .filter((file) => /\.zh\.json$/i.test(file) || /^translated-\d+\.json$/i.test(file))
    .sort();
  for (const file of files) {
    const filePath = path.join(externalDir, file);
    const payload = readJson(filePath);
    const items = Array.isArray(payload) ? payload : payload.items || [];
    let changedItems = 0;
    for (const item of items) {
      const changes = cleanupObject(item, ["titleZh", "promptZh"]);
      if (changes.length) {
        changedItems += 1;
        reports.push({
          target: relativePath(filePath),
          id: item.id || "",
          fields: changes.map((change) => change.field).join("|")
        });
      }
    }
    if (apply && changedItems) {
      writeJson(filePath, Array.isArray(payload) ? items : { ...payload, items });
    }
  }
}

const summary = {
  generatedAt: new Date().toISOString(),
  apply,
  rebuild,
  replacementRuleCount: replacements.length,
  changedFieldGroups: reports.length,
  changedIds: [...new Set(reports.map((entry) => entry.id).filter(Boolean))].length,
  reports
};

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
writeJson(reportPath, summary);

if (apply && rebuild) {
  const result = spawnSync(process.execPath, [path.join(projectRoot, "scripts", "build-problem-catalog.mjs")], {
    cwd: projectRoot,
    stdio: "inherit"
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

console.log(JSON.stringify({
  apply,
  changedFieldGroups: summary.changedFieldGroups,
  changedIds: summary.changedIds,
  report: relativePath(reportPath)
}, null, 2));

function cleanupObject(object, fields) {
  const changes = [];
  for (const field of fields) {
    const before = object[field];
    if (typeof before !== "string" || !before) continue;
    const after = cleanupText(before);
    if (after !== before) {
      object[field] = after;
      changes.push({ field });
    }
  }
  return changes;
}

function cleanupText(text) {
  let value = text;
  for (const [pattern, replacement] of replacements) {
    value = value.replace(pattern, replacement);
  }
  return value
    .replace(/([，。！？；：、（])\s+/g, "$1")
    .replace(/\s+([，。！？；：、）])/g, "$1")
    .replace(/([\u3400-\u9fff])\s+([\u3400-\u9fff])/g, "$1$2")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = args[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
    } else {
      parsed[key] = next;
      index += 1;
    }
  }
  return parsed;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function relativePath(filePath) {
  return path.relative(projectRoot, filePath);
}
