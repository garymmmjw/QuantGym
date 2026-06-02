import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const options = parseArgs(process.argv.slice(2));
const sourcePath = path.resolve(projectRoot, options.source || "data/question-banks/quantguide/problems.json");
const reportPath = path.resolve(projectRoot, options.report || "artifacts/question-bank-quality-review/quantguide-reviewed-repairs-report.json");
const payload = readJson(sourcePath, { problems: [] });
const problems = Array.isArray(payload) ? payload : payload.problems || [];
const problemById = new Map(problems.map((problem) => [String(problem.id || ""), problem]));
const reviewSource = "llm-full-major-triage-reviewed-repair-2026-06-01";

const repairs = [
  {
    id: "quantguide-bond-practice-iii",
    reason: "Prompt displayed the market rate as a percent, while the solution and answer use the decimal rate 0.05, i.e. 5%.",
    fields: {
      promptEn: "Calculate the price of a bond with these characteristics. The coupon rate is 0.06, coupon payments are made every six months (twice per year), and the par value of the bond is 1,000. There are \\(5.0\\) years to maturity and an annual market interest rate of \\(0.05\\), i.e. 5%, converted to a semiannual rate for the calculation.",
      promptZh: "计算具有以下特征的债券价格。票息率为 0.06，票息每六个月支付一次，债券面值为 1,000。到期时间为 \\(5.0\\) 年，市场年利率为 \\(0.05\\)，即 5%，计算时折算为半年期利率。",
      explanationZh: "\\(n=2 \\times 5.0=10 ; r=\\frac{0.05}{2}=0.02500\\)；\\(C=\\frac{0.06 \\times 1,000}{2}=30\\)；\\(P=\\) 债券价格：\n\\[\n\\begin{gathered}\nP=\\left(\\frac{30}{0.02500}\\right)\\left(\\frac{(1+0.02500)^{10}-1}{(1+0.02500)^{10}}\\right)+\\frac{1,000}{(1+0.02500)^{10}} \\\\\nP=(1,200)\\left(\\frac{1.28008-1}{1.28008}\\right)+\\frac{1,000}{1.28008} \\\\\nP=262.5619+781.1984 \\\\\nP=1,043.76\n\\end{gathered}\n\\]"
    }
  },
  {
    id: "quantguide-bond-practice-iv",
    reason: "Prompt displayed the market rate as a percent, while the solution and answer use the decimal rate 0.03, i.e. 3%.",
    fields: {
      promptEn: "Calculate the price of a bond with these characteristics. The coupon rate is 0.06, coupon payments are made every six months (twice per year), and the par value of the bond is 1,000. There are \\(8.0\\) years to maturity and an annual market interest rate of \\(0.03\\), i.e. 3%, converted to a semiannual rate for the calculation.",
      promptZh: "计算具有以下特征的债券价格。票息率为 0.06，票息每六个月支付一次，债券面值为 1,000。到期时间为 \\(8.0\\) 年，市场年利率为 \\(0.03\\)，即 3%，计算时折算为半年期利率。",
      explanationZh: "共有 \\(n=2 \\times 8.0=16\\) 个半年期；市场年利率为 3%，所以半年期贴现率为 \\(r=\\frac{0.03}{2}=0.01500\\)；每半年票息为 \\(C=\\frac{0.06 \\times 1,000}{2}=30\\)。令 \\(P\\) 为债券价格：\n\n\\[\n\\begin{gathered}\nP=\\left(\\frac{30}{0.01500}\\right)\\left(\\frac{(1+0.01500)^{16}-1}{(1+0.01500)^{16}}\\right)+\\frac{1,000}{(1+0.01500)^{16}} \\\\\nP=(2,000)\\left(\\frac{1.26899-1}{1.26899}\\right)+\\frac{1,000}{1.26899} \\\\\nP=423.9379+788.0310 \\\\\nP=1,211.97\n\\end{gathered}\n\\]"
    }
  },
  {
    id: "quantguide-bond-practice-v",
    reason: "Prompt displayed the market rate as a percent, while the solution and answer use the decimal rate 0.06, i.e. 6%.",
    fields: {
      promptEn: "Calculate the price of a bond with these characteristics. The coupon rate is 0.06, coupon payments are made every six months (twice per year), and the par value of the bond is 1,000. There are \\(12.0\\) years to maturity and an annual market interest rate of \\(0.06\\), i.e. 6%, converted to a semiannual rate for the calculation.",
      promptZh: "计算具有以下特征的债券价格。票息率为 0.06，票息每六个月支付一次，债券面值为 1,000。到期时间为 \\(12.0\\) 年，市场年利率为 \\(0.06\\)，即 6%，计算时折算为半年期利率。",
      explanationZh: "\\(n=2 \\times 12.0=24 ; r=\\frac{0.06}{2}=0.03000\\)；\\(C=\\frac{0.06 \\times 1,000}{2}=30\\)；\\(P=\\) 债券价格：\\[\n\\begin{gathered}\nP=\\left(\\frac{30}{0.03000}\\right)\\left(\\frac{(1+0.03000)^{24}-1}{(1+0.03000)^{24}}\\right)+\\frac{1,000}{(1+0.03000)^{24}} \\\\\nP=(1,000)\\left(\\frac{2.03279-1}{2.03279}\\right)+\\frac{1,000}{2.03279} \\\\\nP=508.0663+491.9337 \\\\\nP=1,000.00\n\\end{gathered}\n\\]"
    }
  },
  {
    id: "quantguide-bond-practice-vi",
    reason: "Prompt displayed the market rate as a percent, while the solution and answer use the decimal rate 0.09, i.e. 9%.",
    fields: {
      promptEn: "Calculate the price of a bond with these characteristics. The coupon rate is 0.06, coupon payments are made every six months (twice per year), and the par value of the bond is 1,000. There are \\(20.0\\) years to maturity and an annual market interest rate of \\(0.09\\), i.e. 9%, converted to a semiannual rate for the calculation.",
      promptZh: "计算具有以下特征的债券价格。票息率为 0.06，票息每六个月支付一次，债券面值为 1,000。到期时间为 \\(20.0\\) 年，市场年利率为 \\(0.09\\)，即 9%，计算时折算为半年期利率。"
    }
  },
  {
    id: "quantguide-casted-shadow",
    reason: "The explanation stated the wrong evaluation point even though the derivative and final answer were correct.",
    fields: {
      titleZh: "投射的影子",
      explanation: [
        "Let $x$ be the distance of the person from the base and $s$ be the length of the shadow. We are given that $x' = 40$ is constant. Furthermore, we know that when $x=10$, $s=15$. We want to find $s'$ when $x=40$; at that point the relation below gives $s=60$.",
        "We can use similar triangles to first find the constant height of the pole, say $h$. The total distance from the base of the pole to the tip of the shadow is $x+s$. The smaller triangle has vertical side equal to the person's height and horizontal side equal to the shadow length. Therefore, by equating corresponding sides, we get $$\\dfrac{x+s}{h} = \\dfrac{s}{6}$$ Plugging in $x = 10$ and $s = 15$, we get $$\\dfrac{25}{h} = \\dfrac{5}{2} \\iff h = 10$$ Rewriting the original ratio with this constant, $$\\dfrac{x+s}{10} = \\dfrac{s}{6} \\iff x = \\dfrac{2}{3}s$$ Taking the derivative on both sides gives $x' = \\dfrac{2}{3}s'$. Since $x'=40$, we obtain $s'=\\dfrac{3}{2}\\cdot 40=60$ feet per minute."
      ].join("\n\n"),
      explanationZh: [
        "设 $x$ 为此人距离灯杆底座的距离，$s$ 为影子的长度。题目给出 $x' = 40$，且它是常数。另外，当 $x=10$ 时，$s=15$。我们要求的是当 $x=40$ 时的 $s'$；由下面的比例关系可知此时 $s=60$。",
        "先用相似三角形求灯杆的固定高度，记为 $h$。影子尖端到灯杆底座的总距离是 $x+s$。较小的三角形竖直边是人的身高，水平边是影长。因此对应边成比例，得到 $$\\dfrac{x+s}{h} = \\dfrac{s}{6}$$。代入 $x = 10$ 与 $s = 15$，得到 $$\\dfrac{25}{h} = \\dfrac{5}{2} \\iff h = 10$$。把这个常数代回原比例式，得到 $$\\dfrac{x+s}{10} = \\dfrac{s}{6} \\iff x = \\dfrac{2}{3}s$$。两边对时间求导，得 $x' = \\dfrac{2}{3}s'$。由于 $x'=40$，所以 $s'=\\dfrac{3}{2}\\cdot 40=60$ 英尺/分钟。"
      ].join("\n\n")
    }
  },
  {
    id: "quantguide-contract-arbitrage",
    reason: "The prompt asks for the full arbitrage vector, not the arithmetic sum of vector components.",
    fields: {
      answer: "-1 + 0 - 2 + 4",
      answerEn: "-1 + 0 - 2 + 4",
      answerZh: "-1 + 0 - 2 + 4",
      promptZh: "我们有一份合约 $V$，在到期时支付 $\\min{(2S_T, 4)}$，初始价格为 $V_0 = 3.4$；还有如下欧式看跌期权，以 $(\\text{Strike } K, \\text{Price } C_0)$ 的格式给出。$$\\begin{align*}\n(4, 2.4) \\\\\n(2, 0.8) \\\\\n\\end{align*}$$\n\n我们还可以交易标的 $S$，其初始价格为 $S_0 = 3$，以及在到期时支付 $1$、初始价格为 $Z_0 = 0.9$ 的债券。找出套利组合。请以如下格式给出答案：$\\text{\\# Contract (V) + \\# 看跌期权 (K = 4) + \\# 看跌期权 (K = 2) + \\# Bonds}$。",
      explanation: [
        "The contract payoff is the same as going long $4$ units of the bond and shorting $2$ units of the strike $K=2$ put.",
        "$$\\begin{align*}\nV &\\overset{?}{=} 4Z - 2P \\\\\n3.4 &\\overset{?}{=} 4(0.9) - 2(0.8) \\\\\n3.4 &\\overset{?}{=} 2\n\\end{align*}$$",
        "The replicating portfolio costs $2$, while $V$ costs $3.4$, so $V$ is overpriced relative to the replicating portfolio. Short one unit of $V$, short two $K=2$ puts, and buy four bonds. This gives positive cash upfront and zero payoff in every state at expiry, so it is an arbitrage. In the requested format, $$\\text{\\# Contract (V) + \\# Put (K = 4) + \\# Put (K = 2) + \\# Bonds} = -1 + 0 - 2 + 4.$$"
      ].join("\n\n"),
      explanationZh: [
        "该合约的到期支付等同于多头持有 $4$ 单位债券并空头 $2$ 单位行权价为 $K=2$ 的看跌期权。",
        "$$\\begin{align*}\nV &\\overset{?}{=} 4Z - 2P \\\\\n3.4 &\\overset{?}{=} 4(0.9) - 2(0.8) \\\\\n3.4 &\\overset{?}{=} 2\n\\end{align*}$$",
        "复制组合成本为 $2$，而 $V$ 的价格为 $3.4$，所以 $V$ 相对复制组合被高估。应空头 $1$ 单位 $V$，空头 $2$ 单位 $K=2$ 看跌期权，并买入 $4$ 单位债券。该组合会带来正的初始现金流，且到期各状态下支付为零，因此构成套利。按题目要求的格式，$$\\text{\\# Contract (V) + \\# Put (K = 4) + \\# Put (K = 2) + \\# Bonds} = -1 + 0 - 2 + 4.$$"
      ].join("\n\n")
    }
  },
  {
    id: "quantguide-contracts-and-pricing-iii",
    reason: "The answer 1.1 is correct; the old derivation incorrectly computed the option value and ended with beta approximately 1.5.",
    fields: {
      answer: "1.1",
      answerEn: "1.1",
      answerZh: "1.1",
      explanation: [
        "Strip away the story: Kevin pays $0.70$ thousand dollars for the right to buy a random payoff $X$ for $0.5$ thousand dollars, where $X\\sim\\operatorname{Exp}(\\beta)$ and $\\beta$ is the scale parameter.",
        "The contract payoff before the upfront price is $(X-0.5)^+$. Under fair pricing, its expected value equals $0.70$:",
        "$$\\mathbb{E}[(X-0.5)^+] = \\int_{0.5}^{\\infty} (x-0.5)\\frac{1}{\\beta}e^{-x/\\beta}\\,dx = \\beta e^{-0.5/\\beta} = 0.70.$$",
        "Solving $\\beta e^{-0.5/\\beta}=0.70$ gives $\\beta\\approx 1.102$, so to the nearest tenth, $\\beta=1.1$."
      ].join("\n\n"),
      explanationZh: [
        "去掉故事背景后，Kevin 支付 $0.70$ 千美元，购买一项以 $0.5$ 千美元买入随机退款 $X$ 的权利，其中 $X\\sim\\operatorname{Exp}(\\beta)$，且 $\\beta$ 是尺度参数。",
        "不计前期合约价格时，该合约的收益为 $(X-0.5)^+$。公平定价要求它的期望值等于 $0.70$：",
        "$$\\mathbb{E}[(X-0.5)^+] = \\int_{0.5}^{\\infty} (x-0.5)\\frac{1}{\\beta}e^{-x/\\beta}\\,dx = \\beta e^{-0.5/\\beta} = 0.70.$$",
        "解方程 $\\beta e^{-0.5/\\beta}=0.70$，得到 $\\beta\\approx 1.102$，四舍五入到十分位为 $1.1$。"
      ].join("\n\n")
    }
  },
  {
    id: "quantguide-diverse-distributions",
    reason: "The old explanation reversed X and Y relative to the prompt.",
    fields: {
      explanation: "Since $X \\sim \\text{Unif}(0,\\lambda)$, $\\mathbb{E}[X]=\\dfrac{\\lambda}{2}$. Since $Y\\sim\\text{Exp}(\\lambda)$ with rate parameter $\\lambda$, $\\mathbb{E}[Y]=\\dfrac{1}{\\lambda}$. Setting the means equal gives $$\\dfrac{\\lambda}{2}=\\dfrac{1}{\\lambda},$$ so $\\lambda^2=2$. Therefore the requested value is $2$.",
      explanationZh: "由于 $X \\sim \\text{Unif}(0,\\lambda)$，所以 $\\mathbb{E}[X]=\\dfrac{\\lambda}{2}$。由于 $Y\\sim\\text{Exp}(\\lambda)$ 且这里 $\\lambda$ 是 rate 参数，所以 $\\mathbb{E}[Y]=\\dfrac{1}{\\lambda}$。令两个均值相等，得到 $$\\dfrac{\\lambda}{2}=\\dfrac{1}{\\lambda},$$ 因此 $\\lambda^2=2$。题目要求的值就是 $2$。"
    }
  },
  {
    id: "quantguide-hatching-eggs-ii",
    reason: "The old explanation swapped the conditional mean and variance terms, though the final answer was correct.",
    fields: {
      explanation: [
        "Let $X$ be the number of eggs laid in the month. Then $X\\sim\\text{Pois}(6)$. Conditional on $X=x$, the number of hatched eggs $Y$ is binomial: $Y\\mid X=x\\sim\\text{Binom}(x,0.3)$.",
        "Therefore $$\\mathbb{E}[Y\\mid X]=0.3X,\\qquad \\operatorname{Var}(Y\\mid X)=0.3(0.7)X=0.21X.$$",
        "Using the law of total variance, $$\\operatorname{Var}(Y)=\\mathbb{E}[\\operatorname{Var}(Y\\mid X)]+\\operatorname{Var}(\\mathbb{E}[Y\\mid X])=0.21\\mathbb{E}[X]+0.3^2\\operatorname{Var}(X).$$",
        "For a Poisson random variable with parameter $6$, both the mean and variance are $6$. Thus $$\\operatorname{Var}(Y)=0.21\\cdot 6+0.09\\cdot 6=1.26+0.54=1.8=\\frac{9}{5}.$$"
      ].join("\n\n"),
      explanationZh: [
        "设 $X$ 为一个月内产蛋数，则 $X\\sim\\text{Pois}(6)$。在给定 $X=x$ 的条件下，孵化蛋数 $Y$ 服从二项分布：$Y\\mid X=x\\sim\\text{Binom}(x,0.3)$。",
        "因此 $$\\mathbb{E}[Y\\mid X]=0.3X,\\qquad \\operatorname{Var}(Y\\mid X)=0.3(0.7)X=0.21X.$$",
        "利用全方差公式，$$\\operatorname{Var}(Y)=\\mathbb{E}[\\operatorname{Var}(Y\\mid X)]+\\operatorname{Var}(\\mathbb{E}[Y\\mid X])=0.21\\mathbb{E}[X]+0.3^2\\operatorname{Var}(X).$$",
        "泊松随机变量参数为 $6$ 时，均值和方差都为 $6$。所以 $$\\operatorname{Var}(Y)=0.21\\cdot 6+0.09\\cdot 6=1.26+0.54=1.8=\\frac{9}{5}.$$"
      ].join("\n\n")
    }
  },
  {
    id: "quantguide-likely-target-ii",
    reason: "The prompt interval for target A contradicted the stated center x_A=-1.",
    fields: {
      promptEn: "Two linear targets, say $A$ and $B$, of respective radii $\\varepsilon$ and $2\\varepsilon$, where $\\varepsilon << 1$, are placed on an infinitely long line. The targets are centered at $x_A = -1$ and $x_B = 3$. In other words, target $A$ covers the interval $[-1-\\varepsilon, -1+\\varepsilon]$, while target $B$ covers the interval $[3-2\\varepsilon, 3+2\\varepsilon]$. You have one dart to shoot at the line. Your goal is to maximize your probability of hitting one of the targets. You can choose where to center your throw on the line. If you select to center your dart at $\\mu$, the actual position your dart lands at is $X \\sim N(\\mu,4)$. Find the value of $\\mu$ that maximizes your chances of hitting a target. If necessary, round your answer to the nearest hundredth.",
      promptZh: "两个线性目标，记为 $A$ 和 $B$，半径分别为 $\\varepsilon$ 和 $2\\varepsilon$，其中 $\\varepsilon << 1$，被放在一条无限长的直线上。目标中心分别位于 $x_A = -1$ 和 $x_B = 3$。换句话说，目标 $A$ 覆盖区间 $[-1-\\varepsilon, -1+\\varepsilon]$，而目标 $B$ 覆盖区间 $[3-2\\varepsilon, 3+2\\varepsilon]$。你有一支飞镖可以射向这条直线。你的目标是最大化击中任一目标的概率。你可以选择飞镖投掷在直线上的中心位置。如果你选择将飞镖中心设为 $\\mu$，飞镖实际落点为 $X \\sim N(\\mu,4)$。求使你击中目标概率最大的 $\\mu$ 值。如有必要，四舍五入到百分位。"
    }
  },
  {
    id: "quantguide-log-comparison",
    reason: "The interval for floor log2 equal to -2 was mistyped as [0.25, 5).",
    fields: {
      explanation: "Since $X,Y$ lie in $(0,1)$, $\\log_2 X$ and $\\log_2 Y$ are negative. For $\\lfloor \\log_2 X\\rfloor=\\lfloor \\log_2 Y\\rfloor=-1$, we need $X,Y\\in[0.5,1)$, which has probability $(1/2)^2=1/4$. For value $-2$, we need $X,Y\\in[0.25,0.5)$, which has probability $(1/4)^2=1/16$. In general, $\\lfloor \\log_2 X\\rfloor=-n$ exactly when $X\\in[2^{-n},2^{-(n-1)})$, whose interval length is $2^{-n}$. Thus the probability that both floors equal $-n$ is $(2^{-n})^2=2^{-2n}$. Summing the geometric series gives $$\\sum_{n=1}^{\\infty}\\frac{1}{2^{2n}}=\\frac{1/4}{1-1/4}=\\frac{1}{3}.$$",
      explanationZh: "由于 $X,Y$ 位于 $(0,1)$，所以 $\\log_2 X$ 和 $\\log_2 Y$ 都为负。若 $\\lfloor \\log_2 X\\rfloor=\\lfloor \\log_2 Y\\rfloor=-1$，则需要 $X,Y\\in[0.5,1)$，概率为 $(1/2)^2=1/4$。若取值为 $-2$，则需要 $X,Y\\in[0.25,0.5)$，概率为 $(1/4)^2=1/16$。一般地，$\\lfloor \\log_2 X\\rfloor=-n$ 当且仅当 $X\\in[2^{-n},2^{-(n-1)})$，该区间长度为 $2^{-n}$。因此两者 floor 都等于 $-n$ 的概率为 $(2^{-n})^2=2^{-2n}$。求和得到 $$\\sum_{n=1}^{\\infty}\\frac{1}{2^{2n}}=\\frac{1/4}{1-1/4}=\\frac{1}{3}.$$"
    }
  },
  {
    id: "quantguide-no-more-than-four",
    reason: "The old explanation mixed up sum <=4 with sum <=5 in prose, though the final answer used the correct probability.",
    fields: {
      explanation: [
        "Let $X$ denote the sum of the two dice. The outcomes with $X\\leq4$ are sums $2,3,4$, with counts $1,2,3$ respectively, so $$\\mathbb{P}(X\\leq4)=\\frac{1+2+3}{36}=\\frac{1}{6}.$$",
        "Thus the probability that a single two-dice toss does not have sum at most $4$ is $\\mathbb{P}(X>4)=5/6$. Across $n$ independent tosses, the probability that no toss has sum at most $4$ is $(5/6)^n$, so $$p=1-\\left(\\frac{5}{6}\\right)^n.$$",
        "We need $1-(5/6)^n<0.5$, equivalently $(5/6)^n>1/2$. Since $(5/6)^3>1/2$ but $(5/6)^4<1/2$, the maximum possible value is $n=3$."
      ].join("\n\n"),
      explanationZh: [
        "设 $X$ 为两枚骰子的点数和。满足 $X\\leq4$ 的结果是和为 $2,3,4$，对应组合数分别为 $1,2,3$，因此 $$\\mathbb{P}(X\\leq4)=\\frac{1+2+3}{36}=\\frac{1}{6}.$$",
        "所以单次掷两枚骰子没有出现点数和至多为 $4$ 的概率是 $\\mathbb{P}(X>4)=5/6$。在 $n$ 次独立掷骰中，没有任何一次点数和至多为 $4$ 的概率是 $(5/6)^n$，因此 $$p=1-\\left(\\frac{5}{6}\\right)^n.$$",
        "要求 $1-(5/6)^n<0.5$，等价于 $(5/6)^n>1/2$。由于 $(5/6)^3>1/2$ 但 $(5/6)^4<1/2$，最大可能值为 $n=3$。"
      ].join("\n\n")
    }
  },
  {
    id: "quantguide-nondisjoint-subsets",
    reason: "The old explanation used a placeholder token and described the 781 complement count as disjoint instead of not disjoint.",
    fields: {
      titleZh: "非不相交子集",
      promptZh: "令 $A$ 和 $B$ 为从 $\\{1,2,3,4,5\\}$ 的所有子集中均匀随机选择的两个子集。求 $A$ 和 $B$ 不是不相交的概率，也就是它们至少有一个公共元素的概率。",
      answer: "781/1024",
      answerEn: "781/1024",
      answerZh: "781/1024",
      explanation: "There are $2^5=32$ possible subsets for each of $A$ and $B$, so there are $2^5\\cdot2^5=4^5=1024$ ordered pairs of subsets. Count by complement. For any one element, if $A$ and $B$ are disjoint, that element has three possible statuses: in $A$ only, in $B$ only, or in neither set. Thus there are $3^5=243$ ordered pairs in which $A$ and $B$ are disjoint. Therefore the number of ordered pairs in which $A$ and $B$ are not disjoint is $4^5-3^5=1024-243=781$, and the probability is $\\dfrac{781}{1024}$.",
      explanationZh: "每个集合 $A$ 或 $B$ 都有 $2^5=32$ 种可能，因此有 $2^5\\cdot2^5=4^5=1024$ 个有序子集对。用补集计数。对任意一个元素而言，若 $A$ 和 $B$ 不相交，则该元素有三种状态：只在 $A$ 中、只在 $B$ 中，或两个集合都不在。因此不相交的有序子集对共有 $3^5=243$ 个。于是 $A$ 和 $B$ 不是不相交的有序子集对数量为 $4^5-3^5=1024-243=781$，概率为 $\\dfrac{781}{1024}$。"
    }
  },
  {
    id: "quantguide-put-arbitrage",
    reason: "The prompt asks for the full arbitrage vector; the old explanation also mistyped K=14 as K=13.",
    fields: {
      answer: "0 - 1 + 1 + 3",
      answerEn: "0 - 1 + 1 + 3",
      answerZh: "0 - 1 + 1 + 3",
      explanation: [
        "For puts on the same underlying with strikes $K_2>K_1$, no-arbitrage requires $$P(K_2)-P(K_1)\\leq (K_2-K_1)Z.$$",
        "Here $K_2=17$, $K_1=14$, and $Z=0.9$, so $$5.9-2.1\\leq(17-14)0.9$$ would require $3.8\\leq2.7$, which fails.",
        "The spread $P(17)-P(14)$ is overpriced relative to three bonds. Short the $K=17$ put, long the $K=14$ put, and long three bonds. In the requested format, $$\\text{\\# Stock + \\# Put (K = 17) + \\# Put (K = 14) + \\# Bonds} = 0 - 1 + 1 + 3.$$"
      ].join("\n\n"),
      explanationZh: [
        "对于同一标的、不同执行价且 $K_2>K_1$ 的看跌期权，无套利要求 $$P(K_2)-P(K_1)\\leq (K_2-K_1)Z.$$",
        "这里 $K_2=17$，$K_1=14$，且 $Z=0.9$，因此 $$5.9-2.1\\leq(17-14)0.9$$ 等价于要求 $3.8\\leq2.7$，显然不成立。",
        "价差 $P(17)-P(14)$ 相对于三单位债券被高估。因此应空头 $K=17$ 看跌期权，多头 $K=14$ 看跌期权，并买入三单位债券。按题目要求的格式，$$\\text{\\# Stock + \\# Put (K = 17) + \\# Put (K = 14) + \\# Bonds} = 0 - 1 + 1 + 3.$$"
      ].join("\n\n")
    }
  },
  {
    id: "quantguide-putcall-arbitrage",
    reason: "The prompt asks for the full arbitrage vector, not the arithmetic sum of vector components.",
    fields: {
      answer: "-1 + 1 - 1 + 4",
      answerEn: "-1 + 1 - 1 + 4",
      answerZh: "-1 + 1 - 1 + 4",
      explanation: [
        "Put-call parity requires $C-P=S-K$ when rates are zero. Here $C-P=4-3=1$, while $S-K=10-4=6$, so $C-P$ is underpriced relative to $S-K$.",
        "Long the underpriced side $C-P$: buy one call and short one put. Short the overpriced side $S-K$: short one stock and buy four bonds. In the requested format, $$\\text{\\# Stock + \\# Call + \\# Put + \\# Bonds} = -1 + 1 - 1 + 4.$$"
      ].join("\n\n"),
      explanationZh: [
        "利率为零时，看跌看涨平价要求 $C-P=S-K$。这里 $C-P=4-3=1$，而 $S-K=10-4=6$，所以 $C-P$ 相对 $S-K$ 被低估。",
        "做多被低估的一侧 $C-P$：买入一份看涨期权并卖空一份看跌期权。做空被高估的一侧 $S-K$：卖空一股股票并买入四单位债券。按题目要求的格式，$$\\text{\\# Stock + \\# Call + \\# Put + \\# Bonds} = -1 + 1 - 1 + 4.$$"
      ].join("\n\n")
    }
  },
  {
    id: "quantguide-rainbow-trains",
    reason: "The old explanation wrote 6! for the number of permutations of three train cars.",
    fields: {
      explanation: "Denote the desired rainbow order by $123$. Moving the back car to the front is a cyclic rotation, so the conductor can reach exactly the cyclic rotations of the initial order. There are $3!=6$ possible initial orders of the three cars. The three orders $123$, $231$, and $312$ are cyclic rotations of the desired rainbow order and can be rearranged into rainbow order. Therefore the probability is $$\\frac{3}{3!}=\\frac{3}{6}=\\frac{1}{2}.$$",
      explanationZh: "把目标彩虹顺序记为 $123$。把最后一节车厢移到最前面只会产生循环轮换，因此列车长能够到达的正是初始顺序的循环轮换。三节车厢共有 $3!=6$ 种初始排列。其中 $123$、$231$ 和 $312$ 是目标彩虹顺序的循环轮换，可以被调整为彩虹顺序。因此概率为 $$\\frac{3}{3!}=\\frac{3}{6}=\\frac{1}{2}.$$"
    }
  },
  {
    id: "quantguide-random-particles",
    reason: "The old explanation correctly reduced to the maximum but then called it the minimum.",
    fields: {
      explanation: "One key feature is the collision property. When two particles collide and reverse directions, this is equivalent to the particles passing through one another while exchanging labels. Since labels do not affect the set of exit times, collisions can be ignored. By symmetry, a single particle's time to fall off is uniformly distributed on $[0,1]$. Thus the time for all $1000$ particles to fall off is the maximum of $1000$ IID Uniform$(0,1)$ random variables. The expected maximum of $n$ IID Uniform$(0,1)$ variables is $\\dfrac{n}{n+1}$, so the answer is $\\dfrac{1000}{1001}$ seconds.",
      explanationZh: "关键是碰撞性质。两个粒子碰撞并反向运动，等价于两个粒子直接穿过彼此但交换标签。由于标签不影响所有粒子的离开时间集合，可以忽略碰撞。由对称性，单个粒子从线段掉落所需时间服从 $[0,1]$ 上的均匀分布。因此所有 $1000$ 个粒子都掉落所需时间是 $1000$ 个独立 Uniform$(0,1)$ 随机变量的最大值。$n$ 个独立 Uniform$(0,1)$ 随机变量的最大值期望为 $\\dfrac{n}{n+1}$，所以答案为 $\\dfrac{1000}{1001}$ 秒。"
    }
  },
  {
    id: "quantguide-splitwise",
    reason: "The old calculation was correct but unnecessarily opaque.",
    fields: {
      explanation: "The total after a 60% tip is $1.6\\times 182.30$. There are eight people splitting the bill, so your share is $$\\frac{1.6\\times 182.30}{8}=36.46.$$",
      explanationZh: "加上 60% 小费后的总额为 $1.6\\times 182.30$。共有八个人平分账单，所以你需要支付 $$\\frac{1.6\\times 182.30}{8}=36.46.$$"
    }
  },
  {
    id: "quantguide-threepeat-dice",
    reason: "The Chinese explanation omitted the final law-of-total-expectation calculation.",
    fields: {
      promptZh: "你面前有两个罐子。其中一个罐子里有 $8$ 张不同纸条，上面分别写着 $1-8$。另一个罐子里只有数值 $1$ 和 $2$，每个数值各写在 $4$ 张纸条上。你均匀随机选择一个罐子，然后从中均匀随机抽取一张纸条。你看到抽到的纸条上写着 $2$。然后你将纸条放回所选的罐子中。如果你从同一个罐子再进行 $40$ 次有放回抽取，求这 $40$ 次抽取中 $2$ 出现次数的期望值。",
      explanationZh: "第二个罐子中有 $4$ 张上面写着 $2$ 的纸条，第一个罐子中只有 $1$ 张上面写着 $2$ 的纸条。观察到第一次抽到 $2$ 后，根据贝叶斯定理，所选罐子是第二个罐子的概率为 $\\dfrac{4}{5}$，是第一个罐子的概率为 $\\dfrac{1}{5}$。若选中第二个罐子，之后每次抽到 $2$ 的概率为 $\\dfrac{1}{2}$，40 次中的期望次数为 $20$。若选中第一个罐子，之后每次抽到 $2$ 的概率为 $\\dfrac{1}{8}$，40 次中的期望次数为 $5$。根据全期望定律，期望出现次数为 $$\\dfrac{4}{5}\\cdot 20+\\dfrac{1}{5}\\cdot 5=17.$$"
    }
  },
  {
    id: "quantguide-variance-of-sum-of-bm",
    reason: "The old explanation wrote 4*1=1 instead of 4*1=4.",
    fields: {
      explanation: "Write $W_1+W_2=(W_2-W_1)+2W_1$. The increment $W_2-W_1$ is independent of $W_1$, so $$\\operatorname{Var}(W_1+W_2)=\\operatorname{Var}(W_2-W_1)+\\operatorname{Var}(2W_1).$$ Since $W_2-W_1\\sim N(0,1)$ and $W_1\\sim N(0,1)$, this equals $$1+4\\operatorname{Var}(W_1)=1+4=5.$$",
      explanationZh: "写成 $W_1+W_2=(W_2-W_1)+2W_1$。增量 $W_2-W_1$ 与 $W_1$ 独立，因此 $$\\operatorname{Var}(W_1+W_2)=\\operatorname{Var}(W_2-W_1)+\\operatorname{Var}(2W_1).$$ 由于 $W_2-W_1\\sim N(0,1)$ 且 $W_1\\sim N(0,1)$，所以该方差等于 $$1+4\\operatorname{Var}(W_1)=1+4=5.$$"
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
  if (repair.fields.explanation && !repair.fields.explanationEn) {
    problem.explanationEn = repair.fields.explanation;
    if (!changedFields.includes("explanationEn")) changedFields.push("explanationEn");
  }
  if (repair.fields.answer && !repair.fields.answerEn) {
    problem.answerEn = repair.fields.answer;
    if (!changedFields.includes("answerEn")) changedFields.push("answerEn");
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
  if (options.rebuild) {
    const result = spawnSync(process.execPath, [path.join(projectRoot, "scripts", "build-problem-catalog.mjs")], {
      cwd: projectRoot,
      stdio: "inherit"
    });
    if (result.status !== 0) process.exit(result.status || 1);
  }
}

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  dryRun: report.dryRun,
  changedProblemCount: report.changedProblemCount,
  missing: report.missing.length,
  report: relativePath(reportPath)
}, null, 2));

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    if (key === "apply" || key === "rebuild") {
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
