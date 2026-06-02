import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const raw = String.raw;
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const options = parseArgs(process.argv.slice(2));
const sourcePath = path.resolve(projectRoot, options.source || "data/question-banks/yellow-book/problems.json");
const reportPath = path.resolve(projectRoot, options.report || "artifacts/question-bank-quality-review/yellow-book-batch-004-reviewed-repairs-report.json");
const payload = readJson(sourcePath, { problems: [] });
const problems = Array.isArray(payload) ? payload : payload.problems || [];
const problemById = new Map(problems.map((problem) => [String(problem.id || ""), problem]));
const reviewSource = "llm-full-major-triage-reviewed-repair-yellow-book-batch-004-2026-06-02";

const stochasticTags = ["黄皮书 150 Most Frequently Asked Questions on Quant Interviews", "Chapter 3", "Probability and Stochastic Calculus", "stochastic calculus"];
const probabilityTags = ["黄皮书 150 Most Frequently Asked Questions on Quant Interviews", "Chapter 3", "Brainteasers", "probability"];
const brainteaserTags = ["黄皮书 150 Most Frequently Asked Questions on Quant Interviews", "Chapter 3", "Brainteasers", "mental math"];
const optionTags = ["黄皮书 150 Most Frequently Asked Questions on Quant Interviews", "Chapter 3", "Probability and Stochastic Calculus", "Option", "stochastic volatility"];

const repairs = [
  {
    id: "yellow-book-problem-114",
    reason: "Integrated Brownian motion prompt and conclusion were garbled.",
    fields: {
      titleEn: "Question 20 - Distribution of integrated Brownian motion",
      titleZh: "问题 20 - 积分布朗运动的分布",
      category: "probabilityExpectation",
      tags: stochasticTags,
      promptEn: raw`Let $W_t$ be a Wiener process, and let
$$X_t=\int_0^t W_s\,ds.$$
What is the distribution of $X_t$? Is $X_t$ a martingale?`,
      promptZh: raw`令 $W_t$ 为维纳过程，并令
$$X_t=\int_0^t W_s\,ds.$$
$X_t$ 的分布是什么？$X_t$ 是鞅吗？`,
      answer: raw`$X_t$ is normally distributed with
$$X_t\sim N\left(0,\frac{t^3}{3}\right).$$
It is not a martingale.`,
      answerZh: raw`$X_t$ 服从正态分布：
$$X_t\sim N\left(0,\frac{t^3}{3}\right).$$
它不是鞅。`,
      explanation: raw`The integral is a linear functional of a Gaussian process, so $X_t$ is Gaussian. Its mean is
$$E[X_t]=\int_0^t E[W_s]\,ds=0.$$
Using $E[W_sW_u]=\min(s,u)$,
$$\operatorname{Var}(X_t)
=\int_0^t\int_0^t \min(s,u)\,ds\,du
=2\int_0^t\int_0^u s\,ds\,du
=\frac{t^3}{3}.$$
Also, in differential form $dX_t=W_t\,dt$, so the process has a random drift term and no $dW_t$ term. It is not a martingale.`,
      explanationZh: raw`该积分是高斯过程的线性泛函，所以 $X_t$ 为高斯随机变量。其均值为
$$E[X_t]=\int_0^t E[W_s]\,ds=0.$$
利用 $E[W_sW_u]=\min(s,u)$，
$$\operatorname{Var}(X_t)
=\int_0^t\int_0^t \min(s,u)\,ds\,du
=2\int_0^t\int_0^u s\,ds\,du
=\frac{t^3}{3}.$$
此外，微分形式为 $dX_t=W_t\,dt$，该过程有随机漂移项而没有 $dW_t$ 项，因此不是鞅。`
    }
  },
  {
    id: "yellow-book-problem-119",
    reason: "SDE prompt and solution were OCR-corrupted.",
    fields: {
      titleEn: "Question 27 - Solve dY_t = Y_t dW_t",
      titleZh: "问题 27 - 求解 dY_t = Y_t dW_t",
      category: "probabilityExpectation",
      tags: stochasticTags,
      promptEn: raw`Solve
$$dY_t=Y_t\,dW_t,$$
where $W_t$ is a Wiener process.`,
      promptZh: raw`求解随机微分方程
$$dY_t=Y_t\,dW_t,$$
其中 $W_t$ 为维纳过程。`,
      answer: raw`The solution is
$$Y_t=Y_0\exp\left(W_t-\frac12t\right).$$
Equivalently, if $Z\sim N(0,1)$, then
$$Y_t\stackrel{d}=Y_0\exp\left(\sqrt t\,Z-\frac12t\right).$$`,
      answerZh: raw`解为
$$Y_t=Y_0\exp\left(W_t-\frac12t\right).$$
等价地，若 $Z\sim N(0,1)$，则
$$Y_t\stackrel{d}=Y_0\exp\left(\sqrt t\,Z-\frac12t\right).$$`,
      explanation: raw`Apply Ito's formula to $f(y)=\log y$. Since $dY_t=Y_t\,dW_t$ and $(dY_t)^2=Y_t^2\,dt$,
$$d\log Y_t=\frac1{Y_t}dY_t-\frac12\frac1{Y_t^2}(dY_t)^2
=dW_t-\frac12dt.$$
Integrating from $0$ to $t$ gives
$$\log Y_t-\log Y_0=W_t-\frac12t,$$
which yields the stated solution.`,
      explanationZh: raw`对 $f(y)=\log y$ 使用 Ito 公式。由于 $dY_t=Y_t\,dW_t$ 且 $(dY_t)^2=Y_t^2\,dt$，
$$d\log Y_t=\frac1{Y_t}dY_t-\frac12\frac1{Y_t^2}(dY_t)^2
=dW_t-\frac12dt.$$
从 $0$ 到 $t$ 积分得
$$\log Y_t-\log Y_0=W_t-\frac12t,$$
因此得到上述解。`
    }
  },
  {
    id: "yellow-book-problem-120",
    reason: "Two SDEs were unreadable and lacked answer fields.",
    fields: {
      titleEn: "Question 28 - Solve two stochastic differential equations",
      titleZh: "问题 28 - 求解两个随机微分方程",
      category: "probabilityExpectation",
      tags: stochasticTags,
      promptEn: raw`Solve the following SDEs:
(i) $$dY_t=\mu Y_t\,dt+\sigma Y_t\,dW_t.$$
(ii) $$dX_t=\mu\,dt+(aX_t+b)\,dW_t.$$`,
      promptZh: raw`求解以下随机微分方程：
(i) $$dY_t=\mu Y_t\,dt+\sigma Y_t\,dW_t.$$
(ii) $$dX_t=\mu\,dt+(aX_t+b)\,dW_t.$$`,
      answer: raw`For (i),
$$Y_t=Y_0\exp\left((\mu-\tfrac12\sigma^2)t+\sigma W_t\right).$$

For (ii), let
$$U_t=\exp\left(aW_t-\tfrac12a^2t\right).$$
Then
$$X_t=U_t\left[
X_0+\int_0^t(\mu-ab)U_s^{-1}\,ds+\int_0^t bU_s^{-1}\,dW_s
\right].$$`,
      answerZh: raw`对 (i)，
$$Y_t=Y_0\exp\left((\mu-\tfrac12\sigma^2)t+\sigma W_t\right).$$

对 (ii)，令
$$U_t=\exp\left(aW_t-\tfrac12a^2t\right).$$
则
$$X_t=U_t\left[
X_0+\int_0^t(\mu-ab)U_s^{-1}\,ds+\int_0^t bU_s^{-1}\,dW_s
\right].$$`,
      explanation: raw`Part (i) is geometric Brownian motion. Applying Ito's formula to $\log Y_t$ gives
$$d\log Y_t=(\mu-\tfrac12\sigma^2)dt+\sigma dW_t,$$
which integrates to the stated expression.

For part (ii), write $X_t=U_tV_t$ with $dU_t=aU_t\,dW_t$ and $U_0=1$. Then $U_t=\exp(aW_t-\tfrac12a^2t)$. If $dV_t=\alpha_tdt+\beta_t dW_t$, Ito's product rule gives
$$dX_t=U_t(\alpha_t+a\beta_t)dt+U_t(\beta_t+aV_t)dW_t.$$
Matching coefficients with $dX_t=\mu dt+(aX_t+b)dW_t$ gives
$$\beta_t=bU_t^{-1},\qquad \alpha_t=(\mu-ab)U_t^{-1}.$$
Integrating $dV_t$ and multiplying by $U_t$ yields the answer.`,
      explanationZh: raw`第 (i) 问是几何布朗运动。对 $\log Y_t$ 使用 Ito 公式得
$$d\log Y_t=(\mu-\tfrac12\sigma^2)dt+\sigma dW_t,$$
积分即可得到上述表达式。

第 (ii) 问令 $X_t=U_tV_t$，其中 $dU_t=aU_t\,dW_t$ 且 $U_0=1$。于是 $U_t=\exp(aW_t-\tfrac12a^2t)$。若 $dV_t=\alpha_tdt+\beta_t dW_t$，Ito 乘积法则给出
$$dX_t=U_t(\alpha_t+a\beta_t)dt+U_t(\beta_t+aV_t)dW_t.$$
与 $dX_t=\mu dt+(aX_t+b)dW_t$ 对比系数，可得
$$\beta_t=bU_t^{-1},\qquad \alpha_t=(\mu-ab)U_t^{-1}.$$
对 $dV_t$ 积分并乘以 $U_t$ 即得答案。`
    }
  },
  {
    id: "yellow-book-problem-121",
    reason: "Heston model equations and answer summary were corrupted.",
    fields: {
      category: "option",
      tags: optionTags,
      answer: "The Heston model is a stochastic-volatility model in which the asset price has diffusion coefficient driven by a separate mean-reverting variance process.",
      answerZh: "Heston 模型是一种随机波动率模型，其中资产价格的扩散系数由一个单独的均值回复方差过程驱动。",
      explanation: raw`A common form is
$$dS_t=\mu S_t\,dt+\sqrt{v_t}\,S_t\,dW_t,$$
$$dv_t=\kappa(\theta-v_t)\,dt+\xi\sqrt{v_t}\,dZ_t,$$
with
$$\operatorname{corr}(dW_t,dZ_t)=\rho\,dt.$$
Here $v_t$ is instantaneous variance, $\kappa$ is the mean-reversion speed, $\theta$ is the long-run variance level, $\xi$ is volatility of variance, and $\rho$ captures the leverage effect. The variance process is a CIR-type square-root process. Heston is widely used because it captures stochastic volatility and has semi-closed-form European option pricing formulas via Fourier methods.`,
      explanationZh: raw`常见形式为
$$dS_t=\mu S_t\,dt+\sqrt{v_t}\,S_t\,dW_t,$$
$$dv_t=\kappa(\theta-v_t)\,dt+\xi\sqrt{v_t}\,dZ_t,$$
并且
$$\operatorname{corr}(dW_t,dZ_t)=\rho\,dt.$$
其中 $v_t$ 为瞬时方差，$\kappa$ 为均值回复速度，$\theta$ 为长期方差水平，$\xi$ 为方差过程的波动率，$\rho$ 刻画杠杆效应。方差过程是 CIR 型平方根过程。Heston 模型常用于衍生品定价，因为它能刻画随机波动率，并且欧式期权价格可通过 Fourier 方法得到半闭式解。`
    }
  },
  {
    id: "yellow-book-problem-122",
    reason: "Fibonacci path count had truncated prompt and corrupted closed form.",
    fields: {
      titleEn: "Question 1 - Flea jumping one or two inches",
      titleZh: "问题 1 - 跳蚤沿同一方向每次跳一英寸或两英寸",
      category: "mentalMath",
      tags: brainteaserTags,
      promptZh: "跳蚤在相距 100 英寸的两点之间跳跃，并且总是朝同一方向前进。每次跳跃可以是一英寸或两英寸。跳蚤共有多少条不同路径？",
      answer: raw`Let $F_1=F_2=1$. The path count satisfies $a_n=F_{n+1}$, so the number of paths is $F_{101}$. Numerically,
$$F_{101}=573147844013817084101.$$`,
      answerZh: raw`令 $F_1=F_2=1$。路径数满足 $a_n=F_{n+1}$，所以总路径数为 $F_{101}$。数值为
$$F_{101}=573147844013817084101.$$`,
      explanation: raw`Let $a_n$ be the number of ways to cover $n$ inches. The last jump is either a 1-inch jump from $n-1$ or a 2-inch jump from $n-2$, so
$$a_n=a_{n-1}+a_{n-2},\qquad n\ge3.$$
With $a_1=1$ and $a_2=2$, this is the Fibonacci sequence shifted by one index:
$$a_n=F_{n+1}.$$
Here $F_1=F_2=1$, so $F_3=2$ matches $a_2=2$.
Thus the answer for 100 inches is $a_{100}=F_{101}$.`,
      explanationZh: raw`设 $a_n$ 为走完 $n$ 英寸的路径数。最后一步要么是从 $n-1$ 处跳 1 英寸，要么是从 $n-2$ 处跳 2 英寸，因此
$$a_n=a_{n-1}+a_{n-2},\qquad n\ge3.$$
又 $a_1=1$、$a_2=2$，所以这是斐波那契数列的平移：
$$a_n=F_{n+1}.$$
这里 $F_1=F_2=1$，所以 $F_3=2$ 与 $a_2=2$ 一致。
因此 100 英寸对应的答案为 $a_{100}=F_{101}$。`
    }
  },
  {
    id: "yellow-book-problem-126",
    reason: "Geometric waiting-time probabilities were corrupted.",
    fields: {
      category: "probabilityExpectation",
      tags: probabilityTags,
      titleZh: "问题 5 - 抛公平硬币直到第一次出现正面的期望次数",
      promptZh: "抛掷一枚公平硬币，直到第一次出现正面，期望需要抛多少次？如果硬币有偏，且正面概率为 $p$，答案是多少？",
      answer: raw`For a fair coin, the expected number of flips is $2$. If the probability of heads is $p$, the expected number is
$$\frac1p.$$`,
      answerZh: raw`公平硬币的期望抛掷次数为 $2$。若正面概率为 $p$，期望次数为
$$\frac1p.$$`,
      explanation: raw`Let $E$ be the expected number of flips until the first head. For a coin with head probability $p$,
$$E=p\cdot1+(1-p)(1+E).$$
Solving gives
$$E=\frac1p.$$
For a fair coin, $p=1/2$, so $E=2$.`,
      explanationZh: raw`令 $E$ 为第一次出现正面所需抛掷次数的期望。若正面概率为 $p$，
$$E=p\cdot1+(1-p)(1+E).$$
解得
$$E=\frac1p.$$
公平硬币有 $p=1/2$，所以 $E=2$。`
    }
  },
  {
    id: "yellow-book-problem-127",
    reason: "Two-heads waiting-time formulas were corrupted.",
    fields: {
      category: "probabilityExpectation",
      tags: probabilityTags,
      answer: raw`For a fair coin, the expected number is $6$. For head probability $p$, the expected waiting time for two heads in a row is
$$\frac{1+p}{p^2}.$$
For $p=1/4$, this equals $20$.`,
      answerZh: raw`公平硬币的期望次数为 $6$。若正面概率为 $p$，等待连续两个正面的期望次数为
$$\frac{1+p}{p^2}.$$
当 $p=1/4$ 时，该值为 $20$。`,
      explanation: raw`Let $E_0$ be the expected waiting time with no current consecutive head, and $E_1$ the expected waiting time after seeing one head. Then
$$E_0=1+pE_1+(1-p)E_0,$$
and
$$E_1=1+(1-p)E_0,$$
because a head from state $E_1$ ends the game, while a tail resets the process. Solving gives
$$E_0=\frac{1+p}{p^2}.$$`,
      explanationZh: raw`设 $E_0$ 为当前没有连续正面时的期望等待时间，$E_1$ 为已经出现一个正面后的期望等待时间。则
$$E_0=1+pE_1+(1-p)E_0,$$
并且
$$E_1=1+(1-p)E_0,$$
因为在 $E_1$ 状态下再出现正面就结束，出现反面则重置。解得
$$E_0=\frac{1+p}{p^2}.$$`
    }
  },
  {
    id: "yellow-book-problem-128",
    reason: "No-consecutive-heads explanation was cut off.",
    fields: {
      category: "probabilityExpectation",
      tags: probabilityTags,
      promptZh: "一枚公平硬币被抛掷 n 次。没有出现两个连续正面的概率是多少？",
      answer: raw`The probability is
$$\frac{F_{n+2}}{2^n},$$
where $F_1=F_2=1$.`,
      answerZh: raw`概率为
$$\frac{F_{n+2}}{2^n},$$
其中 $F_1=F_2=1$。`,
      explanation: raw`Let $a_n$ be the number of length-$n$ head-tail sequences with no consecutive heads. Such a sequence either starts with $T$ followed by any valid sequence of length $n-1$, or starts with $HT$ followed by any valid sequence of length $n-2$. Hence
$$a_n=a_{n-1}+a_{n-2},$$
with $a_1=2$ and $a_2=3$. Therefore $a_n=F_{n+2}$. Since there are $2^n$ equally likely sequences, the probability is $F_{n+2}/2^n$.`,
      explanationZh: raw`设 $a_n$ 为长度为 $n$、且没有连续两个正面的正反序列数。这样的序列要么以 $T$ 开头，后接任意长度为 $n-1$ 的合法序列；要么以 $HT$ 开头，后接任意长度为 $n-2$ 的合法序列。因此
$$a_n=a_{n-1}+a_{n-2},$$
且 $a_1=2$、$a_2=3$。所以 $a_n=F_{n+2}$。总序列数为 $2^n$，故概率为 $F_{n+2}/2^n$。`
    }
  },
  {
    id: "yellow-book-problem-130",
    reason: "Ant shortest-path answer had corrupted final expression.",
    fields: {
      category: "mentalMath",
      tags: brainteaserTags,
      titleZh: "问题 9 - 蚂蚁从立方体房间一角走到对角",
      promptZh: "一只蚂蚁在一个 $10\times10\times10$ 房间的角落里，想沿房间表面走到对角的角落。蚂蚁能走的最短路径长度是多少？",
      answer: raw`The shortest path has length
$$\sqrt{10^2+20^2}=10\sqrt5\approx22.36$$
length units along the room surfaces.`,
      answerZh: raw`最短路径长度为
$$\sqrt{10^2+20^2}=10\sqrt5\approx22.36$$
个长度单位，这是沿房间表面的最短路径。`,
      explanation: "Unfold two adjacent faces of the room into a single rectangle. The ant's path across the surfaces becomes a straight line from one corner of a 10 by 20 rectangle to the opposite corner. The shortest surface path is therefore the diagonal of that rectangle.",
      explanationZh: "将房间的两个相邻面展开到同一平面上，蚂蚁沿表面的路径就变成一个 10 by 20 矩形两对角之间的直线。因此最短表面路径就是该矩形的对角线。"
    }
  },
  {
    id: "yellow-book-problem-131",
    reason: "Visible-cubes answer was empty and explanation had exponent typo.",
    fields: {
      category: "mentalMath",
      tags: brainteaserTags,
      answer: "488 unit cubes are visible on the outside.",
      answerZh: "从外面可见的单位立方体有 488 个。",
      explanation: raw`The only cubes not visible are the interior cubes. Removing the outside layer from a $10\times10\times10$ cube leaves an $8\times8\times8$ interior cube, containing
$$8^3=512$$
unit cubes. Therefore the number visible from the outside is
$$10^3-8^3=1000-512=488.$$`,
      explanationZh: raw`不可见的只有内部单位立方体。从 $10\times10\times10$ 立方体去掉外层后，内部剩下一个 $8\times8\times8$ 立方体，包含
$$8^3=512$$
个单位立方体。因此外部可见数量为
$$10^3-8^3=1000-512=488.$$`
    }
  },
  {
    id: "yellow-book-problem-132",
    reason: "Mulder escape strategy explanation was unreadable.",
    fields: {
      category: "mentalMath",
      tags: brainteaserTags,
      answer: "Yes. Mulder can escape by first moving to a suitable smaller concentric circle, staying diametrically opposite the alien, and then sprinting to the fence point opposite the alien.",
      answerZh: "可以。Mulder 可以先移动到合适的小同心圆上，始终与外星人关于圆心相对，然后冲向栅栏上与外星人直径相对的点。",
      explanation: raw`Let the field radius be $R$, Mulder's speed be $v$, and the alien's speed be $4v$. Suppose Mulder is at distance $xR$ from the center, opposite the alien. If he runs straight to the diametrically opposite fence point, his time is
$$\frac{(1-x)R}{v}.$$
The alien must run along a semicircle of length $\pi R$, taking time
$$\frac{\pi R}{4v}.$$
Mulder wins this sprint when
$$1-x<\frac{\pi}{4},\qquad\text{or}\qquad x>1-\frac{\pi}{4}.$$
Before sprinting, Mulder must be able to keep opposite the alien while circling at radius $xR$. His angular speed is $v/(xR)$, so he can do this if
$$\frac{v}{xR}>\frac{4v}{R},\qquad\text{or}\qquad x<\frac14.$$
Since $1-\pi/4<1/4$, choose any $x$ between these two numbers. Then the alignment and final sprint are both possible.`,
      explanationZh: raw`设圆形场地半径为 $R$，Mulder 速度为 $v$，外星人速度为 $4v$。假设 Mulder 位于离圆心 $xR$ 的位置，且与外星人关于圆心相对。若他直线冲向外星人直径相对的栅栏点，用时为
$$\frac{(1-x)R}{v}.$$
外星人沿半圆跑到该点，路程为 $\pi R$，用时为
$$\frac{\pi R}{4v}.$$
Mulder 在最后冲刺中获胜当且仅当
$$1-x<\frac{\pi}{4},\qquad\text{即}\qquad x>1-\frac{\pi}{4}.$$
冲刺前，Mulder 还必须能在半径 $xR$ 的圆上绕行并保持与外星人相对。他的角速度为 $v/(xR)$，所以需要
$$\frac{v}{xR}>\frac{4v}{R},\qquad\text{即}\qquad x<\frac14.$$
由于 $1-\pi/4<1/4$，可在这两个数之间选取 $x$。于是对齐和最后冲刺都可行。`
    }
  },
  {
    id: "yellow-book-problem-134",
    reason: "Amoeba extinction probability derivation was corrupted.",
    fields: {
      category: "probabilityExpectation",
      tags: probabilityTags,
      titleZh: "问题 13 - 阿米巴原虫最终灭绝的概率",
      promptZh: "你从一只阿米巴原虫开始。每分钟，每只阿米巴原虫会等概率地死亡、保持不变、分裂成两只，或分裂成三只。所有阿米巴原虫彼此独立并遵循相同规则。阿米巴原虫族群最终灭绝的概率是多少？",
      answer: raw`The extinction probability is
$$\sqrt2-1.$$`,
      answerZh: raw`最终灭绝概率为
$$\sqrt2-1.$$`,
      explanation: raw`Let $q$ be the probability that the descendants of one amoeba eventually die out. After one minute, the amoeba becomes $0,1,2,$ or $3$ amoebas with equal probability. Independence gives
$$q=\frac14(1+q+q^2+q^3).$$
Equivalently,
$$q^3+q^2-3q+1=0=(q-1)(q^2+2q-1).$$
The roots in $[0,1]$ are $1$ and $\sqrt2-1$. Since the mean number of offspring is $(0+1+2+3)/4=3/2>1$, the extinction probability is the smaller root:
$$q=\sqrt2-1.$$`,
      explanationZh: raw`设 $q$ 为从一只阿米巴原虫开始最终灭绝的概率。一分钟后，它等概率变成 $0,1,2,3$ 只阿米巴。由独立性，
$$q=\frac14(1+q+q^2+q^3).$$
等价地，
$$q^3+q^2-3q+1=0=(q-1)(q^2+2q-1).$$
位于 $[0,1]$ 的根为 $1$ 和 $\sqrt2-1$。由于平均后代数为 $(0+1+2+3)/4=3/2>1$，最终灭绝概率是较小的根：
$$q=\sqrt2-1.$$`
    }
  },
  {
    id: "yellow-book-problem-137",
    reason: "Digit-count problem had corrupted exponent and proof.",
    fields: {
      titleEn: "Question 16 - Number of digits of 125^100",
      titleZh: "问题 16 - 125^100 有多少位数字",
      category: "mentalMath",
      tags: brainteaserTags,
      promptEn: "How many digits does the number 125^100 have? You are not allowed to use values of log10 2 or log10 5.",
      promptZh: "数字 125^100 有多少位？不允许使用 log10 2 或 log10 5 的数值。",
      answer: "It has 210 digits.",
      answerZh: "它有 210 位数字。",
      explanation: raw`Write
$$125^{100}=\left(\frac{1000}{8}\right)^{100}
=\frac{10^{300}}{2^{300}}.$$
Since $2^{10}=1024=1.024\cdot10^3$,
$$2^{300}=(2^{10})^{30}=(1.024)^{30}10^{90}.$$
Thus
$$125^{100}=\frac{10^{210}}{(1.024)^{30}}.$$
Clearly $(1.024)^{30}>1$, so $125^{100}<10^{210}$. Also $(1.024)^{30}<10$: in the binomial expansion, the ratio of consecutive terms is at most $30\cdot0.024=0.72$, so
$$1.024^{30}<1+0.72+0.72^2+\cdots<4<10.$$
Therefore $125^{100}>10^{209}$, and the number lies between $10^{209}$ and $10^{210}$, so it has 210 digits.`,
      explanationZh: raw`写成
$$125^{100}=\left(\frac{1000}{8}\right)^{100}
=\frac{10^{300}}{2^{300}}.$$
由于 $2^{10}=1024=1.024\cdot10^3$，
$$2^{300}=(2^{10})^{30}=(1.024)^{30}10^{90}.$$
因此
$$125^{100}=\frac{10^{210}}{(1.024)^{30}}.$$
显然 $(1.024)^{30}>1$，所以 $125^{100}<10^{210}$。另一方面，$(1.024)^{30}<10$：在二项式展开中，相邻项之比至多为 $30\cdot0.024=0.72$，所以
$$1.024^{30}<1+0.72+0.72^2+\cdots<4<10.$$
因此 $125^{100}>10^{209}$，该数位于 $10^{209}$ 与 $10^{210}$ 之间，所以共有 210 位数字。`
    }
  },
  {
    id: "yellow-book-problem-138",
    reason: "Alternating subset-weight explanation was truncated.",
    fields: {
      category: "mentalMath",
      tags: brainteaserTags,
      answer: raw`The sum is
$$2^{2012}.$$`,
      answerZh: raw`总和为
$$2^{2012}.$$`,
      explanation: raw`Pair every subset $S$ not containing $1$ with the subset $S\cup\{1\}$. There are $2^{2012}$ such pairs. If the elements of $S$ are listed increasingly and its alternating-sum weight is $w(S)$, then adding $1$ at the front reverses all later signs and adds $1$. Hence
$$w(S)+w(S\cup\{1\})=1.$$
Each pair contributes $1$, so the total sum of all weights is $2^{2012}$.`,
      explanationZh: raw`把每个不含 $1$ 的子集 $S$ 与 $S\cup\{1\}$ 配对。这样的配对共有 $2^{2012}$ 对。若将 $S$ 的元素升序排列并按交替符号求和得到权重 $w(S)$，则加入 $1$ 后，$1$ 位于最前面，后续所有符号反转，并额外贡献 $1$。因此
$$w(S)+w(S\cup\{1\})=1.$$
每一对贡献 $1$，所以所有子集权重总和为 $2^{2012}$。`
    }
  },
  {
    id: "yellow-book-problem-139",
    reason: "Tic-tac-toe strategy mapping explanation was corrupted.",
    fields: {
      category: "mentalMath",
      tags: brainteaserTags,
      answer: "Alice should use the optimal tic-tac-toe strategy after mapping the nine numbers to a 3 by 3 magic square. She cannot force a win against perfect play, but she can force at least a draw.",
      answerZh: "Alice 应将九个数映射到一个 3 by 3 魔方阵后按最优井字棋策略行动。面对完美对手，她不能保证获胜，但可以保证至少不输。",
      explanation: raw`Write each number as $2^k$, with exponents $-4,-3,\ldots,4$. Three chosen numbers multiply to $1$ exactly when their exponents sum to $0$. Arrange the exponents in a $3\times3$ magic square:
$$\begin{pmatrix}
3&-4&1\\
-2&0&2\\
-1&4&-3
\end{pmatrix}.$$
Every row, column, and diagonal sums to $0$, and the zero-sum triples correspond to winning lines. The game is therefore tic-tac-toe in disguise. Optimal tic-tac-toe play by both sides is a draw, so Alice cannot always win, although she can avoid losing.`,
      explanationZh: raw`把每个数写成 $2^k$，指数为 $-4,-3,\ldots,4$。三个数乘积为 $1$ 当且仅当三个指数之和为 $0$。将指数排成一个 $3\times3$ 魔方阵：
$$\begin{pmatrix}
3&-4&1\\
-2&0&2\\
-1&4&-3
\end{pmatrix}.$$
每一行、每一列和两条对角线的指数和都为 $0$，这些零和三元组对应获胜线。因此该游戏本质上是井字棋。双方都采用最优策略时，井字棋结果为平局，所以 Alice 不能保证获胜，但可以保证不输。`
    }
  },
  {
    id: "yellow-book-problem-140",
    reason: "Handshake puzzle lacked concise answer.",
    fields: {
      category: "mentalMath",
      tags: brainteaserTags,
      answer: "Mrs. Jones shook hands with 4 people.",
      answerZh: "琼斯夫人与 4 个人握了手。",
      explanation: "The nine answers Mr. Jones hears must be 0 through 8. The person with 8 handshakes must be married to the person with 0 handshakes. Removing that couple, the person with 7 handshakes among the remaining people pairs with the person with 1 handshake. Continuing this pairing gives couples (8,0), (7,1), (6,2), and (5,3). The only remaining person is the one with 4 handshakes, who must be Mrs. Jones.",
      explanationZh: "琼斯先生听到的九个不同答案必然是 0 到 8。握手 8 次的人一定与握手 0 次的人是夫妻。去掉这对夫妻后，在剩余的人中，握手 7 次的人与握手 1 次的人配对。如此继续，得到配对 (8,0)、(7,1)、(6,2)、(5,3)。唯一剩下的是握手 4 次的人，也就是琼斯夫人。"
    }
  },
  {
    id: "yellow-book-problem-141",
    reason: "World Series betting dynamic-programming answer was truncated.",
    fields: {
      category: "statistics",
      tags: ["黄皮书 150 Most Frequently Asked Questions on Quant Interviews", "Chapter 3", "Brainteasers", "dynamic programming", "betting"],
      answer: "Bet 31.25 dollars on the Yankees in the first game.",
      answerZh: "第一场应在洋基队上下注 31.25 美元。",
      explanation: raw`Think of a target position that pays $+100$ if the Yankees win the series and $-100$ if they lose. At the start its fair value is $0$ by symmetry. After the Yankees win the first game, their probability of winning the best-of-seven series is
$$\frac{\binom63+\binom64+\binom65+\binom66}{2^6}
=\frac{42}{64}=0.65625.$$
So the fair net value of the target position after a first-game win is
$$100(2\cdot0.65625-1)=31.25.$$
After a first-game loss, by symmetry the value is $-31.25$. A first-game even-odds bet of $31.25$ exactly matches these two continuation values, so the first bet should be $31.25$.`,
      explanationZh: raw`把目标头寸理解为：若洋基队赢得系列赛，净收益为 $+100$；若输掉系列赛，净收益为 $-100$。开始时由于对称性，公允价值为 $0$。若洋基队赢下第一场，则他们赢得七战四胜系列赛的概率为
$$\frac{\binom63+\binom64+\binom65+\binom66}{2^6}
=\frac{42}{64}=0.65625.$$
因此第一场获胜后的目标头寸公允净值为
$$100(2\cdot0.65625-1)=31.25.$$
若第一场输掉，根据对称性该价值为 $-31.25$。在第一场以均等赔率下注 $31.25$，正好复制这两个后续价值，所以第一场应下注 $31.25$。`
    }
  },
  {
    id: "yellow-book-problem-142",
    reason: "Ball-weighing explanation used inconsistent OCR labels.",
    fields: {
      category: "probabilityExpectation",
      tags: brainteaserTags,
      answer: "Two weighings are sufficient and one weighing is not.",
      answerZh: "两次称重足够，一次称重不够。",
      explanation: raw`Label the balls $R_1,R_2,G_1,G_2,Y_1,Y_2$, one heavy and one light in each color. First weigh
$$R_1+G_1\quad\text{against}\quad R_2+Y_1.$$
If the scale balances, then exactly one of $G_1,Y_1$ is heavy. Weigh $G_1$ against $Y_1$: if $G_1$ is heavier, the heavy balls are $R_2,G_1,Y_2$; if $Y_1$ is heavier, they are $R_1,G_2,Y_1$.

If $R_1+G_1$ is heavier, weigh $G_1+Y_1$ against $G_2+Y_2$. If this second weighing balances, the heavy balls are $R_1,G_1,Y_2$; if the left side is heavier, they are $R_1,G_1,Y_1$; if the right side is heavier, they are $R_1,G_2,Y_2$.

If $R_2+Y_1$ is heavier in the first weighing, use the same second weighing $G_1+Y_1$ against $G_2+Y_2$. If it balances, the heavy balls are $R_2,G_2,Y_1$; if the left side is heavier, they are $R_2,G_1,Y_1$; if the right side is heavier, they are $R_2,G_2,Y_2$.`,
      explanationZh: raw`将球标记为 $R_1,R_2,G_1,G_2,Y_1,Y_2$，每种颜色一重一轻。第一次称
$$R_1+G_1\quad\text{对}\quad R_2+Y_1.$$
若天平平衡，则 $G_1,Y_1$ 中恰有一个为重球。第二次称 $G_1$ 对 $Y_1$：若 $G_1$ 较重，重球为 $R_2,G_1,Y_2$；若 $Y_1$ 较重，重球为 $R_1,G_2,Y_1$。

若第一次 $R_1+G_1$ 较重，则第二次称 $G_1+Y_1$ 对 $G_2+Y_2$。若平衡，重球为 $R_1,G_1,Y_2$；若左边较重，重球为 $R_1,G_1,Y_1$；若右边较重，重球为 $R_1,G_2,Y_2$。

若第一次 $R_2+Y_1$ 较重，同样第二次称 $G_1+Y_1$ 对 $G_2+Y_2$。若平衡，重球为 $R_2,G_2,Y_1$；若左边较重，重球为 $R_2,G_1,Y_1$；若右边较重，重球为 $R_2,G_2,Y_2$。`
    }
  },
  {
    id: "yellow-book-problem-144",
    reason: "Comparison-count explanation had corrupted formulas and category.",
    fields: {
      category: "leetcode",
      tags: ["黄皮书 150 Most Frequently Asked Questions on Quant Interviews", "Chapter 3", "Brainteasers", "comparisons", "algorithms"],
      titleZh: "问题 23 - 在 n 个不同数字中寻找最大值需要多少次比较",
      promptEn: "How many comparisons do you need to find the maximum in a set of n distinct numbers? How many comparisons do you need to find both the maximum and minimum in a set of n distinct numbers?",
      promptZh: "在一组 $n$ 个不同数字中，寻找最大值需要多少次比较？同时寻找最大值和最小值又需要多少次比较？",
      answer: raw`Finding only the maximum requires $n-1$ comparisons. Finding both the maximum and minimum optimally requires
$$\left\lceil\frac{3n}{2}\right\rceil-2$$
comparisons.`,
      answerZh: raw`只找最大值需要 $n-1$ 次比较。同时找最大值和最小值的最优比较次数为
$$\left\lceil\frac{3n}{2}\right\rceil-2.$$`,
      explanation: raw`For the maximum, every element except the maximum must lose at least once, so $n-1$ comparisons are necessary and sufficient.

For both minimum and maximum, compare the numbers in pairs. The smaller member of each pair can only be a candidate for the minimum, and the larger member can only be a candidate for the maximum. The initial pairwise comparisons take $\lfloor n/2\rfloor$ comparisons. Then find the minimum among the smaller elements and the maximum among the larger elements. This gives
$$\left\lceil\frac{3n}{2}\right\rceil-2$$
comparisons in total.`,
      explanationZh: raw`只找最大值时，除最大值外每个元素都至少要输一次，因此 $n-1$ 次比较是必要且充分的。

同时找最小值和最大值时，先将数字两两配对比较。每对中较小者只可能成为最小值候选，较大者只可能成为最大值候选。初始配对比较需要 $\lfloor n/2\rfloor$ 次。然后在较小者集合中找最小值，在较大者集合中找最大值。总比较次数为
$$\left\lceil\frac{3n}{2}\right\rceil-2.$$`
    }
  },
  {
    id: "yellow-book-problem-146",
    reason: "Decreasing-uniform selection math was garbled.",
    fields: {
      category: "probabilityExpectation",
      tags: probabilityTags,
      titleZh: "问题 25 - 递减均匀随机数序列的长度与最小值",
      promptZh: "依次选择 (0,1) 上的均匀随机数，只要序列保持递减就继续；也就是说，当新选到的数大于前一个数时停止。(i) 平均会选到多少个数？(ii) 所选数中最小值的平均值是多少？",
      answer: raw`The average number selected is $e$. The average value of the smallest selected number is
$$3-e.$$`,
      answerZh: raw`平均选到的数为 $e$ 个。所选数中最小值的平均值为
$$3-e.$$`,
      explanation: raw`Let $E(x)$ be the expected number of additional selections after the current value is $x$. Conditioning on the next uniform draw $y$ gives
$$E(x)=1+\int_0^x E(y)\,dy.$$
Thus $E'(x)=E(x)$ and $E(0)=1$, so $E(x)=e^x$. Starting from the implicit value $1$, the expected total number selected is $E(1)=e$.

For the smallest value $s$ in the decreasing run, the density is $e^{1-x}(1-x)$ on $0<x<1$. Hence
$$E[s]=\int_0^1 x e^{1-x}(1-x)\,dx=3-e.$$`,
      explanationZh: raw`设 $E(x)$ 为当前值为 $x$ 后还会继续选择的期望数量。对下一个均匀随机数 $y$ 条件化，得到
$$E(x)=1+\int_0^x E(y)\,dy.$$
因此 $E'(x)=E(x)$ 且 $E(0)=1$，所以 $E(x)=e^x$。从隐含初始值 $1$ 开始，平均总选择数为 $E(1)=e$。

对递减段中的最小值 $s$，其密度为 $e^{1-x}(1-x)$，$0<x<1$。因此
$$E[s]=\int_0^1 x e^{1-x}(1-x)\,dx=3-e.$$`
    }
  },
  {
    id: "yellow-book-problem-147",
    reason: "Charity donor prompt translation and Poisson distribution result were truncated.",
    fields: {
      category: "probabilityExpectation",
      tags: probabilityTags,
      titleZh: "问题 26 - 组织一场费用为 100K 美元的慈善活动",
      promptZh: "为了组织一场花费 100K 美元的慈善活动，某组织开始筹款。捐赠者彼此独立，依次捐出一笔金额；每笔捐款服从均值为 20K 美元的指数分布。当累计捐款达到或超过 100K 美元时停止。求达到至少 100K 美元所需捐赠者人数的分布、均值和方差。",
      answer: raw`Let $N$ be the number of donors. Then
$$N=1+M,\qquad M\sim\operatorname{Poisson}(5).$$
Equivalently,
$$P(N=n)=e^{-5}\frac{5^{n-1}}{(n-1)!},\qquad n=1,2,\ldots.$$
Thus $E[N]=6$ and $\operatorname{Var}(N)=5$.`,
      answerZh: raw`设 $N$ 为所需捐赠者人数。则
$$N=1+M,\qquad M\sim\operatorname{Poisson}(5).$$
等价地，
$$P(N=n)=e^{-5}\frac{5^{n-1}}{(n-1)!},\qquad n=1,2,\ldots.$$
因此 $E[N]=6$，$\operatorname{Var}(N)=5$。`,
      explanation: raw`Exponential interarrival amounts have the same counting structure as a Poisson process. If donations have exponential mean $1/\lambda$ and the threshold is $a$, then the number of completed donations before crossing $a$ has Poisson mean $\lambda a$, and the crossing donor adds one more:
$$N=1+\operatorname{Poisson}(\lambda a).$$
Here $1/\lambda=20K$ and $a=100K$, so $\lambda a=5$.`,
      explanationZh: raw`指数分布的“到达间隔”与 Poisson 过程有相同的计数结构。若每笔捐款服从均值 $1/\lambda$ 的指数分布，阈值为 $a$，则跨过阈值前已完成的捐款数服从均值 $\lambda a$ 的 Poisson 分布，而跨过阈值的那位捐赠者再加 1：
$$N=1+\operatorname{Poisson}(\lambda a).$$
这里 $1/\lambda=20K$，$a=100K$，所以 $\lambda a=5$。`
    }
  },
  {
    id: "yellow-book-problem-149",
    reason: "Broken-stick expected smaller length calculation was corrupted.",
    fields: {
      category: "probabilityExpectation",
      tags: probabilityTags,
      answer: raw`The expected length of the smaller part is
$$\frac14.$$`,
      answerZh: raw`较小部分的期望长度为
$$\frac14.$$`,
      explanation: raw`Let $X\sim U(0,1)$ be the break point. The smaller piece has length
$$L=\min(X,1-X).$$
Therefore
$$E[L]=\int_0^1 \min(x,1-x)\,dx
=2\int_0^{1/2}x\,dx
=\frac14.$$`,
      explanationZh: raw`令 $X\sim U(0,1)$ 为断点位置。较小一段长度为
$$L=\min(X,1-X).$$
因此
$$E[L]=\int_0^1 \min(x,1-x)\,dx
=2\int_0^{1/2}x\,dx
=\frac14.$$`
    }
  },
  {
    id: "yellow-book-problem-152",
    reason: "Clock-hands answer was empty and equation formatting was corrupted.",
    fields: {
      category: "mentalMath",
      tags: brainteaserTags,
      promptEn: "When is the first time after 12 o'clock that the hour and minute hands of a clock meet again?",
      promptZh: "12 点以后，时针和分针第一次再次重合是什么时候？",
      answer: "They meet again 12/11 hours after 12 o'clock, i.e., at about 1:05:27.",
      answerZh: "它们会在 12 点后的 12/11 小时再次重合，也就是约 1:05:27。",
      explanation: raw`The minute hand moves at $360$ degrees per hour and the hour hand at $30$ degrees per hour. The minute hand gains on the hour hand at
$$360-30=330$$
degrees per hour. To meet again, it must gain one full circle, so
$$330t=360.$$
Thus
$$t=\frac{360}{330}=\frac{12}{11}\text{ hours},$$
which is $1$ hour, $5$ minutes, and about $27$ seconds after 12.`,
      explanationZh: raw`分针每小时走 $360$ 度，时针每小时走 $30$ 度。分针相对时针的追赶速度为
$$360-30=330$$
度/小时。再次重合时，分针需要比时针多走一整圈，因此
$$330t=360.$$
所以
$$t=\frac{360}{330}=\frac{12}{11}\text{ 小时},$$
也就是 12 点后 1 小时 5 分约 27 秒。`
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
  const parsed = { apply: false, rebuild: false };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--apply") {
      parsed.apply = true;
    } else if (arg === "--rebuild") {
      parsed.rebuild = true;
    } else if (arg === "--source") {
      parsed.source = args[++i];
    } else if (arg === "--report") {
      parsed.report = args[++i];
    }
  }
  return parsed;
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    if (fallback !== undefined) return fallback;
    throw error;
  }
}

function relativePath(filePath) {
  return path.relative(projectRoot, filePath);
}
