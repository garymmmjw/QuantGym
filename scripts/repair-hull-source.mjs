import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const bookRoot = path.resolve(process.env.QUANTGYM_BOOK_ROOT || path.join(projectRoot, "量化书籍"));
const bookDir = path.join(bookRoot, "纯textbook", "Hull期权期货及其他衍生品 Options Futures and Other Derivatives");
const englishPath = path.join(bookDir, "quant_hull_book.tex");
const chinesePath = path.join(bookDir, "quant_hull_book_zh.tex");

const spilloverMarkers = [
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

for (const filePath of [englishPath, chinesePath]) {
  const entries = readEntries(filePath);
  let trimmed = 0;
  for (const entry of entries) {
    const nextPrompt = trimChapterSpillover(entry.prompt);
    if (nextPrompt !== entry.prompt) {
      entry.prompt = nextPrompt;
      trimmed += 1;
    }
  }
  if (filePath === chinesePath) repairChinesePrompts(entries);
  writeEntries(filePath, entries);
  console.log(`${path.relative(projectRoot, filePath)}: trimmed ${trimmed} prompt spillover block(s).`);
}

function repairChinesePrompts(entries) {
  entries[205].prompt = "当无风险利率为每年 3% 时，一家公司的平均融资成本为每年 5%。该公司目前正在进行价值 900 万美元的项目，并计划再进行 100 万美元的无风险项目来扩大规模。你预计它的平均融资成本会怎样变化？";
  entries[539].prompt = "仔细解释现实世界违约概率与风险中性违约概率之间的区别。哪一个更高？一家银行进入一份信用衍生品合约：如果某公司的信用评级在一年内从 A 降至 BBB 或更低，银行将在一年末支付 100 美元。1 年期无风险利率为 5%。使用表 24.4 估计该衍生品的价值。你作出了哪些假设？这些假设倾向于高估还是低估该衍生品的价值？";
  entries[692].prompt = "以时间间隔 ∆t 对短期利率进行观测。第 i 个观测值为 ri（1 <= i <= m）。证明 Vasicek 模型中 a、b* 和 s 的最大似然估计，可以通过最大化下列表达式得到：a m i=1 a-ln1s2∆t2 - 3ri - ri-1 - a1b* - ri-12∆t42 s2∆t b。";
  entries[85].prompt = "现在是 7 月 16 日。一家公司持有价值 1 亿美元的股票投资组合，组合 beta 为 1.2。公司希望使用 12 月到期的股指期货，在 7 月 16 日至 11 月 16 日期间把组合 beta 调整为 0.5。当前股指期货价格为 2,000，每份合约价值为 250 美元乘以指数。(a) 公司应该持有多少期货头寸？(b) 如果公司改变主意，希望把组合 beta 从 1.2 提高到 1.5，它应持有多少期货头寸？";
  entries[111].prompt = "验证 DerivaGem 是否与第 4.6 节中的债券价格一致。测试 DV01 对所有利率上升 1 个基点的影响预测得有多好。根据 DV01 估计债券久期。使用 DV01 和 Gamma 预测所有利率上升 200 个基点的影响。使用 Gamma 估计债券凸性。（提示：在 DerivaGem 中，DV01 是 dB/dy，其中 B 为债券价格，y 为以基点计量的收益率；Gamma 是 d2B/dy2，其中 y 以百分比计量。）";
  entries[125].prompt = "设 F1 和 F2 是同一商品的两份期货合约，到期时间分别为 t1 和 t2，其中 t2 > t1。证明在利率 r 为常数且不存在储存成本时，F2 <= F1 e^{r(t2-t1)}。本题中可把期货合约视为远期合约。";
  entries[169].prompt = "一家银行通过双边清算与一个非金融交易对手签订利率互换，银行支付 3% 的固定利率并收取浮动利率。没有提交抵押品，银行与交易对手之间也没有其他未平仓交易。银行承担什么信用风险？讨论收益率曲线向上倾斜或向下倾斜时，哪种情况下信用风险更大。";
  entries[227].prompt = "2004 年 7 月 20 日，微软宣布派发 3 美元股息，令市场意外。除息日为 2004 年 11 月 17 日，支付日为 2004 年 12 月 2 日。当时股价约为 28 美元。微软还调整了员工股票期权条款：每个行权价下调为“除息前行权价 × (收盘价 - 3.00 美元) / 收盘价”；每份未行权股票期权覆盖的股票数上调为“除息前股票数 × 收盘价 / (收盘价 - 3.00 美元)”。其中“收盘价”指除息日前最后一个交易日微软普通股的 NASDAQ 官方收盘价。评价这种调整。";
  entries[295].prompt = "本章脚注 1 说明，对于图 13.1 中的看涨期权，用于现实世界期望收益的正确贴现率为 55.96%。证明如果该期权是看跌期权而不是看涨期权，则贴现率为 -70.4%。解释为什么两个现实世界贴现率差别如此大。";
  entries[310].prompt = "分别考虑以下两种情况中的市场是否有效：(a) 股票价格服从分数布朗运动；(b) 股票价格波动率服从分数布朗运动。";
  entries[335].prompt = "当前股价为 50 美元。假设股票的期望收益率为 18%，波动率为 30%。两年后股票价格服从什么概率分布？计算该分布的均值和标准差，并确定 95% 置信区间。";
  entries[337].prompt = "附录推导了关键结果 E[max(V - K, 0)] = E(V)N(d1) - KN(d2)。证明 E[max(K - V, 0)] = KN(-d2) - E(V)N(-d1)，并用它推导不支付股息股票的欧式看跌期权的 Black-Scholes-Merton 定价公式。";
  entries[497].prompt = "某资产日波动率的最新估计为 1.5%，昨天收盘价为 30.00 美元。EWMA 模型中的参数 lambda 为 0.94。假设今天收盘价为 30.50 美元，这会如何更新 EWMA 模型中的波动率？";
  entries[600].prompt = "DerivaGem Application Builder 软件中的 Sample Application F 考察第 26.17 节的静态期权复制示例。它展示了如何用 4 个期权构造对冲（如第 26.17 节），以及如何用两种方法通过 16 个期权构造对冲。(a) 解释两种 16 期权对冲方法的差异，并直观说明为什么第二种方法效果更好。(b) 通过改变第 3 个和第 4 个期权的 Tmat 改进 4 期权对冲。(c) 检查 16 期权组合与障碍期权的 delta、gamma 和 vega 匹配程度。";
  entries[475].prompt = "在 Example 21.4 中，9 个月时最低节点处提前行权可以获得多少收益？";
  entries[679].prompt = "时间 T 的债券价格以其收益率表示为 G(y_T)。假设远期债券收益率 y 在以 T 到期债券为计价单位的世界中服从几何布朗运动。设远期债券收益率的增长率为 a，波动率为 sigma_y。(a) 用 Itô 引理计算远期债券价格关于 a、sigma_y、y 和 G(y) 的过程。(b) 在该世界中远期债券价格应为鞅；利用这一事实求 a 的表达式。(c) 说明 a 的表达式在一阶近似下与方程 (30.1) 一致。";
  entries[701].prompt = "对于 CIR 模型，与问题 31.7 中给出的 Vasicek 模型结果相对应的结果是什么？使用与第 31.4 节中 Vasicek 模型相同的数据，用最大似然法估计 CIR 模型的 a、b 和 sigma 参数（参见 www-2.rotman.utoronto.ca/~hull/VasicekCIR）。令风险市场价格等于 k sqrt(r)，使用表 31.1 中的市场数据估计最佳拟合的 k。";
}

function trimChapterSpillover(prompt) {
  const text = cleanHullPageHeaders(String(prompt || "").trim());
  const candidates = [];
  for (const marker of spilloverMarkers) {
    const index = text.indexOf(marker);
    if (index > 40) candidates.push(index);
  }
  const spacedChapter = text.search(/\bC\s+H\s+A\s+P\s+T\s+E\s+R\b/);
  if (spacedChapter > 40) candidates.push(spacedChapter);
  if (!candidates.length) return text;
  return text.slice(0, Math.min(...candidates)).trim();
}

function cleanHullPageHeaders(prompt) {
  return String(prompt || "")
    .replace(/\x08/g, " ")
    .replace(/\s*\d{2,4}\s*C\s*H\s*A\s*P\s*T\s*E\s*R\s*\d+\s*/gi, " ")
    .replace(/\s*\d{2,4}\s*CHAPTER\s*\d+\s*/gi, " ")
    .replace(/\s*第\s*\d{2,4}\s*章\s*第\s*\d+\s*章\s*/g, " ")
    .replace(/\s*\d{2,4}\s*第\s*\d+\s*章\s*/g, " ")
    .replace(/\s+\d{2,4}$/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function readEntries(filePath) {
  const tex = fs.readFileSync(filePath, "utf8").replace(/\0/g, "");
  const regex = /\\subsection\{([^}]*)\}\s*\n\s*\\begin\{problembox\}\s*([\s\S]*?)\\end\{problembox\}\s*\n\s*\\solution\s*([\s\S]*?)(?=\n\\subsection\{|\n\\end\{document\}|$)/g;
  const entries = [];
  let match;
  while ((match = regex.exec(tex))) {
    entries.push({
      matchStart: match.index,
      matchEnd: regex.lastIndex,
      title: match[1].trim(),
      prompt: match[2].trim(),
      solution: match[3].trim()
    });
  }
  if (!entries.length) throw new Error(`No problem entries found in ${filePath}`);
  const prefix = tex.slice(0, entries[0].matchStart).replace(/\s+$/, "");
  const suffix = tex.slice(entries.at(-1).matchEnd).replace(/^\s+/, "");
  return Object.assign(entries, { prefix, suffix });
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
