import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const raw = String.raw;
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const options = parseArgs(process.argv.slice(2));
const sourcePath = path.resolve(projectRoot, options.source || "data/question-banks/red-book/problems.json");
const reportPath = path.resolve(projectRoot, options.report || "artifacts/question-bank-quality-review/red-book-batch-002-reviewed-repairs-report.json");
const payload = readJson(sourcePath, { problems: [] });
const problems = Array.isArray(payload) ? payload : payload.problems || [];
const problemById = new Map(problems.map((problem) => [String(problem.id || ""), problem]));
const reviewSource = "llm-full-major-triage-reviewed-repair-red-book-batch-002-2026-06-02";

const probabilityTags = [
  "红宝书 Quant Job Interview Questions And Answers",
  "Chapter 3",
  "Probability",
  "Probability/Expectation",
  "probability"
];
const statisticsTags = [
  "红宝书 Quant Job Interview Questions And Answers",
  "Chapter 3",
  "Probability",
  "Statistics",
  "statistics",
  "probability"
];
const stochasticTags = [
  "红宝书 Quant Job Interview Questions And Answers",
  "Chapter 3",
  "Probability",
  "Probability/Expectation",
  "stochastic",
  "probability"
];
const interestRateTags = [
  "红宝书 Quant Job Interview Questions And Answers",
  "Chapter 4",
  "Interest Rates",
  "Option",
  "derivatives"
];

const repairs = [
  {
    id: "red-book-problem-081",
    reason: "Broken-stick triangle answer and geometric conditions were OCR-corrupted and answer fields were empty.",
    fields: {
      titleEn: "Question 3.27 - Randomly cut a unit interval into three pieces",
      titleZh: "问题 3.27 - 随机把单位线段切成三段",
      category: "probabilityExpectation",
      tags: probabilityTags,
      answer: raw`The probability is
$$\frac14.$$`,
      answerZh: raw`概率为
$$\frac14.$$`,
      promptEn: "Choose two points independently and uniformly on the interval [0,1], and use them to cut the interval into three pieces. What is the probability that the three pieces can form a triangle?",
      promptZh: "在区间 [0,1] 上独立均匀地选两个切点，并把单位线段切成三段。这三段能组成三角形的概率是多少？",
      explanation: raw`Let the two cut points be $X$ and $Y$. The three pieces can form a triangle exactly when the longest piece is shorter than the sum of the other two pieces. Since the total length is $1$, this is equivalent to saying that every piece has length less than $1/2$.

In the unit square for $(X,Y)$, the invalid cases are:
$$X<\frac12,\;Y<\frac12,$$
which leaves a right-side piece longer than $1/2$;
$$X>\frac12,\;Y>\frac12,$$
which leaves a left-side piece longer than $1/2$; and
$$|X-Y|>\frac12,$$
which makes the middle piece longer than $1/2$.

The valid region consists of two right triangles, each with leg length $1/2$. Its total area is
$$2\cdot\frac12\cdot\frac12\cdot\frac12=\frac14.$$
Because $(X,Y)$ is uniform on the unit square, the required probability is $1/4$.`,
      explanationZh: raw`设两个切点为 $X$ 和 $Y$。三段能组成三角形，当且仅当最长的一段短于另外两段之和。由于总长度为 $1$，这等价于每一段长度都小于 $1/2$。

在 $(X,Y)$ 的单位正方形中，无效情形包括：
$$X<\frac12,\;Y<\frac12,$$
此时右端剩余段超过 $1/2$；
$$X>\frac12,\;Y>\frac12,$$
此时左端剩余段超过 $1/2$；以及
$$|X-Y|>\frac12,$$
此时中间段超过 $1/2$。

剩下的有效区域由两个直角三角形组成，每个三角形的直角边长都是 $1/2$。总面积为
$$2\cdot\frac12\cdot\frac12\cdot\frac12=\frac14.$$
由于 $(X,Y)$ 在单位正方形上均匀分布，所求概率为 $1/4$。`
    }
  },
  {
    id: "red-book-problem-083",
    reason: "Maximum/minimum uniform-order-statistic formulas were garbled.",
    fields: {
      titleEn: "Question 3.29 - Expected maximum and range of uniform samples",
      titleZh: "问题 3.29 - 均匀样本最大值和极差的期望",
      category: "statistics",
      tags: statisticsTags,
      answer: raw`For $X_1,\ldots,X_n$ iid $U(0,1)$,
$$E[\max_i X_i]=\frac{n}{n+1},\qquad
E[\max_i X_i-\min_i X_i]=\frac{n-1}{n+1}.$$`,
      answerZh: raw`若 $X_1,\ldots,X_n$ 独立同分布且服从 $U(0,1)$，则
$$E[\max_i X_i]=\frac{n}{n+1},\qquad
E[\max_i X_i-\min_i X_i]=\frac{n-1}{n+1}.$$`,
      promptEn: "Let X1,...,Xn be independent uniform random variables on [0,1]. Find the expected maximum, and then find the expected value of max Xi minus min Xi.",
      promptZh: "设 X1,...,Xn 是 [0,1] 上的独立均匀随机变量。求最大值的期望，以及 max Xi 减 min Xi 的期望。",
      explanation: raw`Let
$$M=\max_{1\le i\le n}X_i.$$
For $0\le x\le1$,
$$P(M\le x)=P(X_1\le x,\ldots,X_n\le x)=x^n.$$
Thus the density of $M$ is
$$f_M(x)=nx^{n-1},\qquad 0\le x\le1.$$
Therefore
$$E[M]=\int_0^1 x\,nx^{n-1}\,dx=\frac{n}{n+1}.$$

By symmetry, the minimum $m=\min_i X_i$ satisfies
$$E[m]=\frac{1}{n+1}.$$
Using linearity of expectation,
$$E[M-m]=E[M]-E[m]=\frac{n}{n+1}-\frac{1}{n+1}
=\frac{n-1}{n+1}.$$`,
      explanationZh: raw`令
$$M=\max_{1\le i\le n}X_i.$$
对 $0\le x\le1$，
$$P(M\le x)=P(X_1\le x,\ldots,X_n\le x)=x^n.$$
所以 $M$ 的密度为
$$f_M(x)=nx^{n-1},\qquad 0\le x\le1.$$
于是
$$E[M]=\int_0^1 x\,nx^{n-1}\,dx=\frac{n}{n+1}.$$

由对称性，最小值 $m=\min_i X_i$ 满足
$$E[m]=\frac{1}{n+1}.$$
再由期望线性性，
$$E[M-m]=E[M]-E[m]=\frac{n}{n+1}-\frac{1}{n+1}
=\frac{n-1}{n+1}.$$`
    }
  },
  {
    id: "red-book-problem-085",
    reason: "Density transformation derivation was unreadable and answer fields were empty.",
    fields: {
      titleEn: "Question 3.31 - Density of a transformed random variable",
      titleZh: "问题 3.31 - 随机变量变换后的密度",
      category: "probabilityExpectation",
      tags: probabilityTags,
      answer: raw`If $Y=g(X)$ and $g$ is one-to-one, differentiable, and has differentiable inverse, then
$$f_Y(y)=f_X(g^{-1}(y))\left|\frac{d}{dy}g^{-1}(y)\right|
=\frac{f_X(g^{-1}(y))}{|g'(g^{-1}(y))|}.$$
If several preimages satisfy $g(x_i)=y$, sum this quantity over all such $x_i$.`,
      answerZh: raw`若 $Y=g(X)$，且 $g$ 一一、可微并有可微反函数，则
$$f_Y(y)=f_X(g^{-1}(y))\left|\frac{d}{dy}g^{-1}(y)\right|
=\frac{f_X(g^{-1}(y))}{|g'(g^{-1}(y))|}.$$
若有多个原像 $x_i$ 满足 $g(x_i)=y$，则对所有这些 $x_i$ 求和。`,
      promptEn: "If X has density fX and Y = g(X), how do you find the density of Y?",
      promptZh: "若随机变量 X 的密度为 fX，且 Y = g(X)，如何求 Y 的密度？",
      explanation: raw`For a monotone differentiable transformation $Y=g(X)$,
$$F_Y(y)=P(Y\le y)=P(g(X)\le y).$$
If $g$ is increasing, this becomes
$$F_Y(y)=P(X\le g^{-1}(y))=F_X(g^{-1}(y)).$$
Differentiating gives
$$f_Y(y)=f_X(g^{-1}(y))\frac{d}{dy}g^{-1}(y).$$
If $g$ is decreasing, the same calculation introduces a minus sign, so the absolute value is needed:
$$f_Y(y)=f_X(g^{-1}(y))\left|\frac{d}{dy}g^{-1}(y)\right|.$$

More generally, if a value $y$ has multiple preimages $x_i$, then probability mass near $y$ can arrive from each branch:
$$f_Y(y)=\sum_{x_i:g(x_i)=y}\frac{f_X(x_i)}{|g'(x_i)|}.$$`,
      explanationZh: raw`对单调可微变换 $Y=g(X)$，
$$F_Y(y)=P(Y\le y)=P(g(X)\le y).$$
如果 $g$ 递增，则
$$F_Y(y)=P(X\le g^{-1}(y))=F_X(g^{-1}(y)).$$
求导得到
$$f_Y(y)=f_X(g^{-1}(y))\frac{d}{dy}g^{-1}(y).$$
如果 $g$ 递减，同样计算会多出负号，因此需要取绝对值：
$$f_Y(y)=f_X(g^{-1}(y))\left|\frac{d}{dy}g^{-1}(y)\right|.$$

更一般地，若某个 $y$ 有多个原像 $x_i$，则 $y$ 附近的概率质量可能来自每个分支：
$$f_Y(y)=\sum_{x_i:g(x_i)=y}\frac{f_X(x_i)}{|g'(x_i)|}.$$`
    }
  },
  {
    id: "red-book-problem-086",
    reason: "Order-statistic CDF and density formulas were heavily OCR-corrupted.",
    fields: {
      titleEn: "Question 3.32 - Distribution of the kth order statistic",
      titleZh: "问题 3.32 - 第 k 个次序统计量的分布",
      category: "statistics",
      tags: statisticsTags,
      answer: raw`For iid samples with CDF $F$ and density $f$, the kth smallest value $X_{(k)}$ has
$$P(X_{(k)}\le x)=\sum_{j=k}^{n}\binom{n}{j}F(x)^j(1-F(x))^{n-j},$$
and density
$$f_{X_{(k)}}(x)=\frac{n!}{(k-1)!(n-k)!}F(x)^{k-1}(1-F(x))^{n-k}f(x).$$`,
      answerZh: raw`对 CDF 为 $F$、密度为 $f$ 的独立同分布样本，第 k 小的值 $X_{(k)}$ 满足
$$P(X_{(k)}\le x)=\sum_{j=k}^{n}\binom{n}{j}F(x)^j(1-F(x))^{n-j},$$
其密度为
$$f_{X_{(k)}}(x)=\frac{n!}{(k-1)!(n-k)!}F(x)^{k-1}(1-F(x))^{n-k}f(x).$$`,
      promptEn: "Let X1,...,Xn be iid with distribution function F and density f. What is the distribution and density of the kth order statistic?",
      promptZh: "设 X1,...,Xn 独立同分布，分布函数为 F、密度为 f。第 k 个次序统计量的分布和密度是什么？",
      explanation: raw`The event $X_{(k)}\le x$ means that at least $k$ of the $n$ observations are less than or equal to $x$. Each observation is at most $x$ with probability $F(x)$, independently of the others. Therefore the count of observations at most $x$ is binomial with parameters $n$ and $F(x)$:
$$P(X_{(k)}\le x)=\sum_{j=k}^{n}\binom{n}{j}F(x)^j(1-F(x))^{n-j}.$$

For the density, place one observation in a small interval around $x$, choose $k-1$ observations below it and $n-k$ above it. This gives
$$f_{X_{(k)}}(x)
=\frac{n!}{(k-1)!(n-k)!}F(x)^{k-1}(1-F(x))^{n-k}f(x).$$`,
      explanationZh: raw`事件 $X_{(k)}\le x$ 表示 $n$ 个样本中至少有 $k$ 个不超过 $x$。每个样本不超过 $x$ 的概率为 $F(x)$，且彼此独立。因此不超过 $x$ 的样本个数服从参数为 $n$ 和 $F(x)$ 的二项分布：
$$P(X_{(k)}\le x)=\sum_{j=k}^{n}\binom{n}{j}F(x)^j(1-F(x))^{n-j}.$$

密度也可直接理解为：一个样本落在 $x$ 附近，另外 $k-1$ 个样本在它下方，$n-k$ 个样本在它上方。组合计数给出
$$f_{X_{(k)}}(x)
=\frac{n!}{(k-1)!(n-k)!}F(x)^{k-1}(1-F(x))^{n-k}f(x).$$`
    }
  },
  {
    id: "red-book-problem-088",
    reason: "Central Limit Theorem answer lacked a clean normalized statement.",
    fields: {
      titleEn: "Question 3.34 - State the Central Limit Theorem",
      titleZh: "问题 3.34 - 陈述中心极限定理",
      category: "statistics",
      tags: statisticsTags,
      answer: raw`If $X_1,X_2,\ldots$ are iid with mean $\mu$ and finite variance $\sigma^2$, then
$$\frac{\sum_{i=1}^n X_i-n\mu}{\sigma\sqrt n}
\xrightarrow{d}N(0,1).$$
Equivalently,
$$\sqrt n\,\frac{\bar X_n-\mu}{\sigma}\xrightarrow{d}N(0,1).$$`,
      answerZh: raw`若 $X_1,X_2,\ldots$ 独立同分布，均值为 $\mu$，方差为有限的 $\sigma^2$，则
$$\frac{\sum_{i=1}^n X_i-n\mu}{\sigma\sqrt n}
\xrightarrow{d}N(0,1).$$
等价地，
$$\sqrt n\,\frac{\bar X_n-\mu}{\sigma}\xrightarrow{d}N(0,1).$$`,
      promptEn: "State the Central Limit Theorem.",
      promptZh: "陈述中心极限定理。",
      explanation: raw`The Central Limit Theorem says that sums or averages of many iid random variables become approximately normal after the correct centering and scaling. If $S_n=\sum_{i=1}^nX_i$, then
$$\frac{S_n-n\mu}{\sigma\sqrt n}\xrightarrow{d}N(0,1).$$
This is a convergence-in-distribution statement. It does not require the original $X_i$ to be normally distributed, but it does require the usual iid and finite-variance assumptions in this classical form.`,
      explanationZh: raw`中心极限定理说明：大量独立同分布随机变量的和或平均值，在正确中心化和标准化后会近似服从正态分布。若 $S_n=\sum_{i=1}^nX_i$，则
$$\frac{S_n-n\mu}{\sigma\sqrt n}\xrightarrow{d}N(0,1).$$
这是依分布收敛的陈述。经典形式不要求原始 $X_i$ 正态分布，但要求独立同分布且方差有限。`
    }
  },
  {
    id: "red-book-problem-091",
    reason: "Normal second moment and moment-generating-function formulas had corrupted exponents and missing squares.",
    fields: {
      titleEn: "Question 3.37 - Moments and exponential moments of a normal variable",
      titleZh: "问题 3.37 - 正态随机变量的矩和指数矩",
      category: "probabilityExpectation",
      tags: probabilityTags,
      answer: raw`If $X\sim N(\mu,\sigma^2)$, then
$$E[X^2]=\mu^2+\sigma^2,$$
and for any real $\lambda$,
$$E[e^{\lambda X}]=\exp\left(\lambda\mu+\frac12\lambda^2\sigma^2\right).$$`,
      answerZh: raw`若 $X\sim N(\mu,\sigma^2)$，则
$$E[X^2]=\mu^2+\sigma^2,$$
且对任意实数 $\lambda$，
$$E[e^{\lambda X}]=\exp\left(\lambda\mu+\frac12\lambda^2\sigma^2\right).$$`,
      promptEn: "If X is normally distributed with mean mu and variance sigma squared, compute E[X^2] and E[exp(lambda X)].",
      promptZh: "若 X 服从均值为 mu、方差为 sigma 平方的正态分布，计算 E[X^2] 和 E[exp(lambda X)]。",
      explanation: raw`The variance identity gives
$$\operatorname{Var}(X)=E[X^2]-(E[X])^2.$$
Since $E[X]=\mu$ and $\operatorname{Var}(X)=\sigma^2$,
$$E[X^2]=\mu^2+\sigma^2.$$

For the exponential moment, write $X=\mu+\sigma Z$ with $Z\sim N(0,1)$. Then
$$E[e^{\lambda X}]
=e^{\lambda\mu}E[e^{\lambda\sigma Z}]
=e^{\lambda\mu}\exp\left(\frac12\lambda^2\sigma^2\right)
=\exp\left(\lambda\mu+\frac12\lambda^2\sigma^2\right).$$`,
      explanationZh: raw`由方差恒等式，
$$\operatorname{Var}(X)=E[X^2]-(E[X])^2.$$
由于 $E[X]=\mu$ 且 $\operatorname{Var}(X)=\sigma^2$，
$$E[X^2]=\mu^2+\sigma^2.$$

对指数矩，写成 $X=\mu+\sigma Z$，其中 $Z\sim N(0,1)$。于是
$$E[e^{\lambda X}]
=e^{\lambda\mu}E[e^{\lambda\sigma Z}]
=e^{\lambda\mu}\exp\left(\frac12\lambda^2\sigma^2\right)
=\exp\left(\lambda\mu+\frac12\lambda^2\sigma^2\right).$$`
    }
  },
  {
    id: "red-book-problem-095",
    reason: "GBM square SDE was missing the clean starting SDE and Ito correction.",
    fields: {
      titleEn: "Question 3.41 - SDE for the square of a lognormal Brownian motion",
      titleZh: "问题 3.41 - 对数正态布朗运动平方的 SDE",
      category: "probabilityExpectation",
      tags: stochasticTags,
      answer: raw`If
$$dS_t=\mu S_t\,dt+\sigma S_t\,dW_t,$$
and $Y_t=S_t^2$, then
$$dY_t=(2\mu+\sigma^2)Y_t\,dt+2\sigma Y_t\,dW_t.$$`,
      answerZh: raw`若
$$dS_t=\mu S_t\,dt+\sigma S_t\,dW_t,$$
且 $Y_t=S_t^2$，则
$$dY_t=(2\mu+\sigma^2)Y_t\,dt+2\sigma Y_t\,dW_t.$$`,
      promptEn: "Suppose S follows a lognormal Brownian motion dS_t = mu S_t dt + sigma S_t dW_t. What process does S_t squared follow?",
      promptZh: "假设 S 遵循对数正态布朗运动 dS_t = mu S_t dt + sigma S_t dW_t。S_t 的平方遵循什么过程？",
      explanation: raw`Set $Y_t=f(S_t)$ with $f(s)=s^2$. Then $f'(s)=2s$ and $f''(s)=2$. Ito's lemma gives
$$dY_t=2S_t\,dS_t+\frac12\cdot2\,(dS_t)^2.$$
Because
$$dS_t=\mu S_t\,dt+\sigma S_t\,dW_t,$$
we have
$$2S_t\,dS_t=2\mu S_t^2\,dt+2\sigma S_t^2\,dW_t,$$
and
$$(dS_t)^2=\sigma^2S_t^2\,dt.$$
Therefore
$$dY_t=(2\mu+\sigma^2)S_t^2\,dt+2\sigma S_t^2\,dW_t
=(2\mu+\sigma^2)Y_t\,dt+2\sigma Y_t\,dW_t.$$`,
      explanationZh: raw`令 $Y_t=f(S_t)$，其中 $f(s)=s^2$。则 $f'(s)=2s$，$f''(s)=2$。Ito 引理给出
$$dY_t=2S_t\,dS_t+\frac12\cdot2\,(dS_t)^2.$$
由于
$$dS_t=\mu S_t\,dt+\sigma S_t\,dW_t,$$
有
$$2S_t\,dS_t=2\mu S_t^2\,dt+2\sigma S_t^2\,dW_t,$$
且
$$(dS_t)^2=\sigma^2S_t^2\,dt.$$
因此
$$dY_t=(2\mu+\sigma^2)S_t^2\,dt+2\sigma S_t^2\,dW_t
=(2\mu+\sigma^2)Y_t\,dt+2\sigma Y_t\,dW_t.$$`
    }
  },
  {
    id: "red-book-problem-098",
    reason: "Ito formula for log S had corrupted symbols and drift.",
    fields: {
      titleEn: "Question 3.44 - SDE for log S",
      titleZh: "问题 3.44 - log S 的 SDE",
      category: "probabilityExpectation",
      tags: stochasticTags,
      answer: raw`If
$$dS_t=\mu S_t\,dt+\sigma S_t\,dW_t,$$
then
$$d\log S_t=\left(\mu-\frac12\sigma^2\right)dt+\sigma\,dW_t.$$
For the special case $\mu=1$, the drift is $1-\frac12\sigma^2$.`,
      answerZh: raw`若
$$dS_t=\mu S_t\,dt+\sigma S_t\,dW_t,$$
则
$$d\log S_t=\left(\mu-\frac12\sigma^2\right)dt+\sigma\,dW_t.$$
若题中取 $\mu=1$，漂移项为 $1-\frac12\sigma^2$。`,
      promptEn: "Given dS_t = mu S_t dt + sigma S_t dW_t, find the stochastic differential equation for log S_t.",
      promptZh: "给定 dS_t = mu S_t dt + sigma S_t dW_t，求 log S_t 的随机微分方程。",
      explanation: raw`Let $X_t=\log S_t$ and $f(s)=\log s$. Then
$$f'(s)=\frac1s,\qquad f''(s)=-\frac1{s^2}.$$
Ito's lemma gives
$$dX_t=\frac1{S_t}dS_t-\frac12\frac1{S_t^2}(dS_t)^2.$$
Since
$$(dS_t)^2=\sigma^2S_t^2\,dt,$$
we get
$$dX_t=\mu\,dt+\sigma\,dW_t-\frac12\sigma^2\,dt
=\left(\mu-\frac12\sigma^2\right)dt+\sigma\,dW_t.$$`,
      explanationZh: raw`令 $X_t=\log S_t$，$f(s)=\log s$。则
$$f'(s)=\frac1s,\qquad f''(s)=-\frac1{s^2}.$$
由 Ito 引理，
$$dX_t=\frac1{S_t}dS_t-\frac12\frac1{S_t^2}(dS_t)^2.$$
由于
$$(dS_t)^2=\sigma^2S_t^2\,dt,$$
得到
$$dX_t=\mu\,dt+\sigma\,dW_t-\frac12\sigma^2\,dt
=\left(\mu-\frac12\sigma^2\right)dt+\sigma\,dW_t.$$`
    }
  },
  {
    id: "red-book-problem-101",
    reason: "Ito calculation for 2 to the Brownian motion had broken exponent notation and martingale conclusion.",
    fields: {
      titleEn: "Question 3.47 - Apply Ito's lemma to 2 to the Brownian motion",
      titleZh: "问题 3.47 - 对 2 的布朗运动次方应用 Ito 引理",
      category: "probabilityExpectation",
      tags: stochasticTags,
      answer: raw`For $Y_t=2^{W_t}$,
$$dY_t=(\log 2)Y_t\,dW_t+\frac12(\log 2)^2Y_t\,dt.$$
It is not a martingale because it has positive drift. The martingale version is
$$\exp\left((\log2)W_t-\frac12(\log2)^2t\right).$$`,
      answerZh: raw`对 $Y_t=2^{W_t}$，
$$dY_t=(\log 2)Y_t\,dW_t+\frac12(\log 2)^2Y_t\,dt.$$
它不是鞅，因为有正漂移项。对应的鞅形式是
$$\exp\left((\log2)W_t-\frac12(\log2)^2t\right).$$`,
      promptEn: "Apply Ito's lemma to Y_t = 2^{W_t}. Is this process a martingale?",
      promptZh: "对 Y_t = 2^{W_t} 应用 Ito 引理。这个过程是鞅吗？",
      explanation: raw`Write
$$2^{W_t}=\exp((\log2)W_t).$$
For $f(x)=2^x$, we have
$$f'(x)=(\log2)2^x,\qquad f''(x)=(\log2)^2 2^x.$$
Ito's lemma gives
$$dY_t=f'(W_t)dW_t+\frac12f''(W_t)dt
=(\log2)Y_t\,dW_t+\frac12(\log2)^2Y_t\,dt.$$
The drift is positive, so $Y_t$ is not a martingale. Multiplying by the compensator gives the exponential martingale
$$\exp\left((\log2)W_t-\frac12(\log2)^2t\right).$$`,
      explanationZh: raw`写成
$$2^{W_t}=\exp((\log2)W_t).$$
对 $f(x)=2^x$，
$$f'(x)=(\log2)2^x,\qquad f''(x)=(\log2)^2 2^x.$$
Ito 引理给出
$$dY_t=f'(W_t)dW_t+\frac12f''(W_t)dt
=(\log2)Y_t\,dW_t+\frac12(\log2)^2Y_t\,dt.$$
漂移项为正，因此 $Y_t$ 不是鞅。乘上补偿因子得到指数鞅
$$\exp\left((\log2)W_t-\frac12(\log2)^2t\right).$$`
    }
  },
  {
    id: "red-book-problem-106",
    reason: "Brownian-bridge conditional density missed the variance denominator and had corrupted notation.",
    fields: {
      titleEn: "Question 3.52 - Conditional distribution of Brownian motion given its endpoint",
      titleZh: "问题 3.52 - 给定终点时布朗运动的条件分布",
      category: "probabilityExpectation",
      tags: stochasticTags,
      answer: raw`For Brownian motion with $W_0=0$, conditional on $W_t=x$, the intermediate value $W_s$ for $0<s<t$ is normal:
$$W_s\mid W_t=x\sim N\left(\frac{s}{t}x,\frac{s(t-s)}{t}\right).$$`,
      answerZh: raw`对满足 $W_0=0$ 的布朗运动，在给定 $W_t=x$ 时，对 $0<s<t$，
$$W_s\mid W_t=x\sim N\left(\frac{s}{t}x,\frac{s(t-s)}{t}\right).$$`,
      promptEn: "For Brownian motion with W0 = 0, find the density of W_s conditional on W_t = x, where 0 < s < t.",
      promptZh: "对满足 W0 = 0 的布朗运动，求 0 < s < t 时 W_s 在条件 W_t = x 下的密度。",
      explanation: raw`The vector $(W_s,W_t)$ is jointly normal with
$$E[W_s]=E[W_t]=0,\qquad \operatorname{Var}(W_s)=s,\qquad \operatorname{Var}(W_t)=t,\qquad \operatorname{Cov}(W_s,W_t)=s.$$
The conditional normal formula gives
$$E[W_s\mid W_t=x]=\frac{\operatorname{Cov}(W_s,W_t)}{\operatorname{Var}(W_t)}x=\frac{s}{t}x,$$
and
$$\operatorname{Var}(W_s\mid W_t=x)
=s-\frac{s^2}{t}
=\frac{s(t-s)}{t}.$$
Thus
$$W_s\mid W_t=x\sim N\left(\frac{s}{t}x,\frac{s(t-s)}{t}\right).$$`,
      explanationZh: raw`向量 $(W_s,W_t)$ 是联合正态，且
$$E[W_s]=E[W_t]=0,\qquad \operatorname{Var}(W_s)=s,\qquad \operatorname{Var}(W_t)=t,\qquad \operatorname{Cov}(W_s,W_t)=s.$$
由条件正态公式，
$$E[W_s\mid W_t=x]=\frac{\operatorname{Cov}(W_s,W_t)}{\operatorname{Var}(W_t)}x=\frac{s}{t}x,$$
并且
$$\operatorname{Var}(W_s\mid W_t=x)
=s-\frac{s^2}{t}
=\frac{s(t-s)}{t}.$$
因此
$$W_s\mid W_t=x\sim N\left(\frac{s}{t}x,\frac{s(t-s)}{t}\right).$$`
    }
  },
  {
    id: "red-book-problem-107",
    reason: "Explanation of the stochastic rule (dW)^2=dt had OCR errors and an incorrect moment statement.",
    fields: {
      titleEn: "Question 3.53 - Meaning of (dW_t)^2 = dt",
      titleZh: "问题 3.53 - (dW_t)^2 = dt 的含义",
      category: "probabilityExpectation",
      tags: stochasticTags,
      answer: raw`The rule $(dW_t)^2=dt$ is shorthand for Brownian quadratic variation:
$$[W,W]_t=t.$$
Brownian increments are of size $\sqrt{dt}$, so their squares are of order $dt$ and survive in Ito expansions, while $dt\,dW_t$ and $(dt)^2$ vanish.`,
      answerZh: raw`规则 $(dW_t)^2=dt$ 是布朗运动二次变差的简写：
$$[W,W]_t=t.$$
布朗增量量级为 $\sqrt{dt}$，所以平方量级为 $dt$，会在 Ito 展开中保留下来；而 $dt\,dW_t$ 和 $(dt)^2$ 会消失。`,
      promptEn: "In stochastic calculus, what does the informal rule (dW_t)^2 = dt mean?",
      promptZh: "在随机微积分中，非正式规则 (dW_t)^2 = dt 是什么意思？",
      explanation: raw`Over a small interval $\Delta t$, Brownian motion has increment
$$\Delta W\sim N(0,\Delta t).$$
Therefore $\Delta W$ is typically of size $\sqrt{\Delta t}$, and
$$(\Delta W)^2$$
is typically of size $\Delta t$. This is why the second-order term in Taylor's expansion does not disappear in Ito's lemma.

More precisely, along refining partitions,
$$\sum_j (W_{t_{j+1}}-W_{t_j})^2\to t$$
in probability, under the usual quadratic-variation statement. This is recorded informally as
$$(dW_t)^2=dt.$$
By comparison,
$$dt\,dW_t=0,\qquad (dt)^2=0$$
in the same differential bookkeeping.`,
      explanationZh: raw`在一个很小的时间区间 $\Delta t$ 上，布朗运动增量满足
$$\Delta W\sim N(0,\Delta t).$$
因此 $\Delta W$ 的典型量级是 $\sqrt{\Delta t}$，而
$$(\Delta W)^2$$
的量级是 $\Delta t$。这就是为什么 Taylor 展开中的二阶项在 Ito 引理中不会消失。

更严格地说，在不断细化的分割下，
$$\sum_j (W_{t_{j+1}}-W_{t_j})^2\to t$$
按通常的二次变差意义收敛。这被非正式地记作
$$(dW_t)^2=dt.$$
相比之下，在同一套微分记账规则中，
$$dt\,dW_t=0,\qquad (dt)^2=0.$$`
    }
  },
  {
    id: "red-book-problem-108",
    reason: "Ito lemma proof sketch was OCR-corrupted and answer field was empty.",
    fields: {
      titleEn: "Question 3.54 - Why Ito's lemma is true",
      titleZh: "问题 3.54 - 为什么 Ito 引理成立",
      category: "probabilityExpectation",
      tags: stochasticTags,
      answer: raw`Ito's lemma is Taylor's formula with Brownian scaling. If
$$dX_t=\mu(t,X_t)\,dt+\sigma(t,X_t)\,dW_t,$$
then the second-order Taylor term matters because $(dW_t)^2=dt$. Hence
$$df(t,X_t)=\left(f_t+\mu f_x+\frac12\sigma^2f_{xx}\right)dt+\sigma f_x\,dW_t.$$`,
      answerZh: raw`Ito 引理可以理解为带有布朗运动尺度的 Taylor 公式。若
$$dX_t=\mu(t,X_t)\,dt+\sigma(t,X_t)\,dW_t,$$
则由于 $(dW_t)^2=dt$，二阶 Taylor 项不能丢掉。因此
$$df(t,X_t)=\left(f_t+\mu f_x+\frac12\sigma^2f_{xx}\right)dt+\sigma f_x\,dW_t.$$`,
      promptEn: "Why is Ito's lemma true? Give the interview-level intuition or derivation.",
      promptZh: "为什么 Ito 引理成立？给出面试层面的直觉或推导。",
      explanation: raw`Apply Taylor's formula to $f(t+\Delta t,X_t+\Delta X)$:
$$\Delta f\approx f_t\Delta t+f_x\Delta X+\frac12f_{xx}(\Delta X)^2.$$
For an Ito process,
$$\Delta X\approx \mu\,\Delta t+\sigma\,\Delta W.$$
The term $(\Delta X)^2$ has leading contribution
$$\sigma^2(\Delta W)^2\approx \sigma^2\Delta t.$$
Terms such as $(\Delta t)^2$ and $\Delta t\,\Delta W$ are of smaller order and vanish.

Substituting these orders into Taylor's formula gives
$$df(t,X_t)=\left(f_t+\mu f_x+\frac12\sigma^2f_{xx}\right)dt+\sigma f_x\,dW_t.$$
The extra $\frac12\sigma^2f_{xx}$ term is the distinctive Ito correction.`,
      explanationZh: raw`对 $f(t+\Delta t,X_t+\Delta X)$ 使用 Taylor 公式：
$$\Delta f\approx f_t\Delta t+f_x\Delta X+\frac12f_{xx}(\Delta X)^2.$$
对 Ito 过程，
$$\Delta X\approx \mu\,\Delta t+\sigma\,\Delta W.$$
其中 $(\Delta X)^2$ 的主导贡献为
$$\sigma^2(\Delta W)^2\approx \sigma^2\Delta t.$$
而 $(\Delta t)^2$ 和 $\Delta t\,\Delta W$ 等项阶数更小，会消失。

把这些量级代入 Taylor 公式，得到
$$df(t,X_t)=\left(f_t+\mu f_x+\frac12\sigma^2f_{xx}\right)dt+\sigma f_x\,dW_t.$$
额外的 $\frac12\sigma^2f_{xx}$ 项就是 Ito 修正项。`
    }
  },
  {
    id: "red-book-problem-109",
    reason: "Forward-rate formula and zero-coupon prices were garbled.",
    fields: {
      titleEn: "Question 4.1 - Forward rate from six months to one year",
      titleZh: "问题 4.1 - 六个月到一年期的远期利率",
      category: "option",
      tags: interestRateTags,
      answer: raw`Using simple annual rates, the six-month discount factor is
$$P(0,0.5)=\frac{1}{1+0.05\cdot0.5},$$
and the one-year discount factor is
$$P(0,1)=\frac{1}{1+0.10}.$$
The simple forward rate for the period $[0.5,1]$ is
$$f=\frac{P(0,0.5)/P(0,1)-1}{0.5}\approx14.6\%.$$`,
      answerZh: raw`使用简单年化利率，六个月贴现因子为
$$P(0,0.5)=\frac{1}{1+0.05\cdot0.5},$$
一年贴现因子为
$$P(0,1)=\frac{1}{1+0.10}.$$
区间 $[0.5,1]$ 的简单远期利率为
$$f=\frac{P(0,0.5)/P(0,1)-1}{0.5}\approx14.6\%.$$`,
      promptEn: "The six-month spot rate is 5% and the one-year spot rate is 10%, quoted as simple annual rates. What is the forward rate from six months to one year?",
      promptZh: "六个月即期利率为 5%，一年即期利率为 10%，均按简单年化利率报价。六个月到一年之间的远期利率是多少？",
      explanation: raw`No arbitrage links discount factors and forward rates:
$$1+f(0.5,1)(1-0.5)=\frac{P(0,0.5)}{P(0,1)}.$$
With simple annual rates,
$$P(0,0.5)=\frac{1}{1+0.05\cdot0.5}\approx0.9756,$$
and
$$P(0,1)=\frac{1}{1+0.10}\approx0.9091.$$
Therefore
$$f(0.5,1)=\frac{0.9756/0.9091-1}{0.5}\approx0.1463,$$
or about $14.6\%$.`,
      explanationZh: raw`无套利关系把贴现因子和远期利率连接起来：
$$1+f(0.5,1)(1-0.5)=\frac{P(0,0.5)}{P(0,1)}.$$
使用简单年化利率，
$$P(0,0.5)=\frac{1}{1+0.05\cdot0.5}\approx0.9756,$$
且
$$P(0,1)=\frac{1}{1+0.10}\approx0.9091.$$
因此
$$f(0.5,1)=\frac{0.9756/0.9091-1}{0.5}\approx0.1463,$$
即约 $14.6\%$。`
    }
  },
  {
    id: "red-book-problem-111",
    reason: "Interest-rate-swap valuation formula was garbled and lacked the par-swap-rate expression.",
    fields: {
      titleEn: "Question 4.3 - Price an interest rate swap",
      titleZh: "问题 4.3 - 利率互换定价",
      category: "option",
      tags: interestRateTags,
      answer: raw`A fixed-for-floating swap is priced by present valuing the two legs. For payment dates $T_1,\ldots,T_n$ and accruals $\delta_i$, the par fixed rate is
$$R_{\text{swap}}=\frac{P(0,T_0)-P(0,T_n)}{\sum_{i=1}^n\delta_iP(0,T_i)}.$$
If the swap starts today, $P(0,T_0)=1$.`,
      answerZh: raw`固定换浮动利率互换可通过分别贴现两条现金流腿来定价。若支付日为 $T_1,\ldots,T_n$，计息年限为 $\delta_i$，则平价固定利率为
$$R_{\text{swap}}=\frac{P(0,T_0)-P(0,T_n)}{\sum_{i=1}^n\delta_iP(0,T_i)}.$$
若互换今天开始，则 $P(0,T_0)=1$。`,
      promptEn: "How do you price an interest rate swap? Derive the par swap rate in terms of discount factors.",
      promptZh: "如何为利率互换定价？用贴现因子推导平价互换利率。",
      explanation: raw`Consider a payer swap that pays fixed rate $R$ and receives floating over dates $T_1,\ldots,T_n$, with accrual periods $\delta_i=T_i-T_{i-1}$. The present value of the fixed leg is
$$R\sum_{i=1}^n\delta_iP(0,T_i).$$
The present value of the floating leg, immediately after reset, is
$$P(0,T_0)-P(0,T_n).$$
At inception, a par swap has zero value, so the two legs are equal:
$$R\sum_{i=1}^n\delta_iP(0,T_i)=P(0,T_0)-P(0,T_n).$$
Thus
$$R_{\text{swap}}=\frac{P(0,T_0)-P(0,T_n)}{\sum_{i=1}^n\delta_iP(0,T_i)}.$$
Equivalently, it is a discount-factor-weighted average of forward rates.`,
      explanationZh: raw`考虑一个支付固定利率 $R$、收取浮动利率的互换，支付日为 $T_1,\ldots,T_n$，计息年限为 $\delta_i=T_i-T_{i-1}$。固定腿现值为
$$R\sum_{i=1}^n\delta_iP(0,T_i).$$
在重置后，浮动腿现值为
$$P(0,T_0)-P(0,T_n).$$
互换初始平价时价值为零，因此两条腿现值相等：
$$R\sum_{i=1}^n\delta_iP(0,T_i)=P(0,T_0)-P(0,T_n).$$
所以
$$R_{\text{swap}}=\frac{P(0,T_0)-P(0,T_n)}{\sum_{i=1}^n\delta_iP(0,T_i)}.$$
等价地，它也是远期利率按贴现因子加权后的平均值。`
    }
  },
  {
    id: "red-book-problem-112",
    reason: "Mean-reverting interest-rate answer needed a concise pricing-relevant explanation.",
    fields: {
      titleEn: "Question 4.4 - Why mean reversion matters for interest-rate models",
      titleZh: "问题 4.4 - 为什么利率模型需要均值回复",
      category: "option",
      tags: interestRateTags,
      answer: "Mean reversion matters because interest rates are not tradable assets and their drift affects the distribution of future rates, long-maturity bond prices, and interest-rate derivatives. A model without mean reversion can imply unrealistic long-run rates and volatility.",
      answerZh: "均值回复重要，是因为利率本身不是可交易资产，其漂移会影响未来利率分布、长期债券价格和利率衍生品价格。没有均值回复的模型可能给出不现实的长期利率和波动。",
      promptEn: "Why is mean reversion important in interest-rate modeling?",
      promptZh: "为什么均值回复在利率建模中很重要？",
      explanation: raw`Interest rates tend to move within an economically plausible range. Very high rates slow borrowing and economic activity, which tends to push rates down; very low rates stimulate activity and can push rates up. This makes mean reversion a natural modeling feature.

For equities, real-world drift usually drops out of vanilla option pricing after risk-neutral valuation. Short rates are different because the short rate itself is not a traded asset. Its drift under the pricing measure influences discount factors and the future rate distribution. As a result, mean reversion can materially affect bond prices, caps, swaptions, and long-dated interest-rate derivatives.

Mean reversion also prevents a model from producing implausibly explosive long-run rates or volatility term structures.`,
      explanationZh: raw`利率通常会在经济上合理的区间内波动。利率很高时，借贷和经济活动会放缓，从而倾向于压低利率；利率很低时，经济活动会被刺激，从而可能推高利率。因此均值回复是自然的建模特征。

对股票而言，真实世界漂移通常会在风险中性定价中被消去。但短期利率不同，因为短期利率本身不是可交易资产。其在定价测度下的漂移会影响贴现因子和未来利率分布。因此，均值回复会实质影响债券、cap、swaption 和长期利率衍生品的价格。

均值回复还可以避免模型给出不合理爆炸的长期利率或波动率期限结构。`
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
  problem.classificationReviewed = true;
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
