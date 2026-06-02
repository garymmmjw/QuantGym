import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const raw = String.raw;
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const options = parseArgs(process.argv.slice(2));
const sourcePath = path.resolve(projectRoot, options.source || "data/question-banks/yellow-book/problems.json");
const reportPath = path.resolve(projectRoot, options.report || "artifacts/question-bank-quality-review/yellow-book-batch-001-reviewed-repairs-report.json");
const payload = readJson(sourcePath, { problems: [] });
const problems = Array.isArray(payload) ? payload : payload.problems || [];
const problemById = new Map(problems.map((problem) => [String(problem.id || ""), problem]));
const reviewSource = "llm-full-major-triage-reviewed-repair-yellow-book-batch-001-2026-06-02";

const mathTags = ["黄皮书 150 Most Frequently Asked Questions on Quant Interviews", "Chapter 3", "Mathematics", "calculus"];
const probabilityTags = ["黄皮书 150 Most Frequently Asked Questions on Quant Interviews", "Chapter 1", "Probability", "probability"];
const optionTags = ["黄皮书 150 Most Frequently Asked Questions on Quant Interviews", "Options", "Option", "derivatives"];

const repairs = [
  {
    id: "yellow-book-problem-001",
    reason: "Chinese explanation was mostly untranslated and the arbitrage answer was missing.",
    fields: {
      answer: raw`Yes. Buy 2 puts with strike 30 and sell 3 puts with strike 20. The initial cost is
$$2\cdot6-3\cdot4=0,$$
and the terminal payoff
$$2(30-S_T)^+-3(20-S_T)^+$$
is nonnegative for all $S_T\ge0$ and positive for many values of $S_T$.`,
      answerZh: raw`有套利。买入 2 份执行价为 30 的看跌期权，同时卖出 3 份执行价为 20 的看跌期权。初始成本为
$$2\cdot6-3\cdot4=0,$$
到期收益
$$2(30-S_T)^+-3(20-S_T)^+$$
对所有 $S_T\ge0$ 非负，并且在许多 $S_T$ 取值下为正。`,
      promptZh: "同一标的、同一到期日的看跌期权中，执行价 30 的看跌期权价格为 6，执行价 20 的看跌期权价格为 4。能否构造套利？",
      explanation: raw`Let $P(K)$ denote the price of a put with strike $K$. A zero-strike put is worthless, so $P(0)=0$. Consider the portfolio:

- long 2 puts with strike 30;
- short 3 puts with strike 20.

Its initial value is
$$2P(30)-3P(20)=2\cdot6-3\cdot4=0.$$
At maturity its payoff is
$$V_T=2(30-S_T)^+-3(20-S_T)^+.$$
Check by cases:

- if $S_T\ge30$, then $V_T=0$;
- if $20\le S_T<30$, then $V_T=2(30-S_T)>0$;
- if $0\le S_T<20$, then $V_T=2(30-S_T)-3(20-S_T)=S_T\ge0$.

Thus the payoff is never negative and is positive over a nontrivial range of terminal stock prices, with zero initial cost. This is a static arbitrage.`,
      explanationZh: raw`令 $P(K)$ 表示执行价为 $K$ 的看跌期权价格。执行价为 0 的看跌期权没有价值，因此 $P(0)=0$。考虑如下组合：

- 买入 2 份执行价为 30 的看跌期权；
- 卖出 3 份执行价为 20 的看跌期权。

初始价值为
$$2P(30)-3P(20)=2\cdot6-3\cdot4=0.$$
到期收益为
$$V_T=2(30-S_T)^+-3(20-S_T)^+.$$
分情况检查：

- 若 $S_T\ge30$，则 $V_T=0$；
- 若 $20\le S_T<30$，则 $V_T=2(30-S_T)>0$；
- 若 $0\le S_T<20$，则 $V_T=2(30-S_T)-3(20-S_T)=S_T\ge0$。

因此该组合初始成本为零，到期收益从不为负，并且在一段非平凡的终值范围内为正。这就是静态套利。`
    }
  },
  {
    id: "yellow-book-problem-003",
    reason: "Wiener-process integral prompt and distribution were OCR-corrupted.",
    fields: {
      titleEn: "Question 3 - Distribution of the time integral of Brownian motion",
      titleZh: "问题 3 - 布朗运动时间积分的分布",
      category: "probabilityExpectation",
      tags: probabilityTags,
      answer: raw`If
$$X_t=\int_0^t W_s\,ds,$$
then
$$X_t\sim N\left(0,\frac{t^3}{3}\right).$$
The process $X_t$ is not a martingale.`,
      answerZh: raw`若
$$X_t=\int_0^t W_s\,ds,$$
则
$$X_t\sim N\left(0,\frac{t^3}{3}\right).$$
过程 $X_t$ 不是鞅。`,
      promptEn: raw`Let $W_t$ be a Wiener process and define
$$X_t=\int_0^t W_s\,ds.$$
What is the distribution of $X_t$? Is $X_t$ a martingale?`,
      promptZh: raw`设 $W_t$ 为维纳过程，并定义
$$X_t=\int_0^t W_s\,ds.$$
$X_t$ 的分布是什么？$X_t$ 是鞅吗？`,
      explanation: raw`Integration by parts gives
$$\int_0^t W_s\,ds=tW_t-\int_0^t s\,dW_s
=\int_0^t (t-s)\,dW_s.$$
The last expression is a stochastic integral with deterministic integrand. Hence it is normal with mean zero and variance
$$\int_0^t(t-s)^2\,ds=\frac{t^3}{3}.$$
Therefore
$$X_t\sim N\left(0,\frac{t^3}{3}\right).$$
It is not a martingale. Indeed, for $s<t$,
$$E[X_t\mid\mathcal F_s]=X_s+(t-s)W_s,$$
which is not generally equal to $X_s$.`,
      explanationZh: raw`分部积分给出
$$\int_0^t W_s\,ds=tW_t-\int_0^t s\,dW_s
=\int_0^t (t-s)\,dW_s.$$
最后一个表达式是确定性被积函数的随机积分，因此服从均值为零的正态分布，方差为
$$\int_0^t(t-s)^2\,ds=\frac{t^3}{3}.$$
所以
$$X_t\sim N\left(0,\frac{t^3}{3}\right).$$
它不是鞅。事实上，对 $s<t$，
$$E[X_t\mid\mathcal F_s]=X_s+(t-s)W_s,$$
通常不等于 $X_s$。`
    }
  },
  {
    id: "yellow-book-problem-005",
    reason: "Correlation-matrix prompt was garbled and had no direct answer.",
    fields: {
      titleEn: "Question 5 - Values of p for a 3 by 3 correlation matrix",
      titleZh: "问题 5 - 使 3 阶矩阵成为相关矩阵的 p 值",
      category: "statistics",
      tags: ["黄皮书 150 Most Frequently Asked Questions on Quant Interviews", "Chapter 1", "Correlation Matrix", "statistics"],
      answer: raw`For
$$Q=\begin{pmatrix}1&0.6&-0.3\\0.6&1&p\\-0.3&p&1\end{pmatrix},$$
the matrix is a correlation matrix iff
$$\frac{-0.36-\sqrt{2.3296}}{2}\le p\le \frac{-0.36+\sqrt{2.3296}}{2},$$
approximately
$$-0.9432\le p\le0.5832.$$`,
      answerZh: raw`对
$$Q=\begin{pmatrix}1&0.6&-0.3\\0.6&1&p\\-0.3&p&1\end{pmatrix},$$
它是相关矩阵当且仅当
$$\frac{-0.36-\sqrt{2.3296}}{2}\le p\le \frac{-0.36+\sqrt{2.3296}}{2},$$
约为
$$-0.9432\le p\le0.5832.$$`,
      promptEn: raw`Find all values of $p$ such that
$$Q=\begin{pmatrix}1&0.6&-0.3\\0.6&1&p\\-0.3&p&1\end{pmatrix}$$
is a correlation matrix.`,
      promptZh: raw`求所有 $p$ 的取值，使得
$$Q=\begin{pmatrix}1&0.6&-0.3\\0.6&1&p\\-0.3&p&1\end{pmatrix}$$
是一个相关矩阵。`,
      explanation: raw`A correlation matrix must be symmetric positive semidefinite with diagonal entries equal to $1$. The diagonal condition is already satisfied. The $2$ by $2$ principal minors give $|p|\le1$ and the fixed correlations $0.6$ and $-0.3$ are already valid.

The determinant is
$$\det Q=1+2(0.6)(-0.3)p-0.6^2-(-0.3)^2-p^2
=0.55-0.36p-p^2.$$
Thus positive semidefiniteness requires
$$0.55-0.36p-p^2\ge0,$$
or
$$p^2+0.36p-0.55\le0.$$
The roots are
$$\frac{-0.36\pm\sqrt{0.36^2+4\cdot0.55}}{2}
=\frac{-0.36\pm\sqrt{2.3296}}{2}.$$
This interval is contained in $[-1,1]$, so it is the final answer.`,
      explanationZh: raw`相关矩阵必须是对称正半定矩阵，并且对角线元素为 $1$。这里对角线条件已经满足。$2$ 阶主子式给出 $|p|\le1$，而固定相关系数 $0.6$ 和 $-0.3$ 本身有效。

行列式为
$$\det Q=1+2(0.6)(-0.3)p-0.6^2-(-0.3)^2-p^2
=0.55-0.36p-p^2.$$
因此正半定要求
$$0.55-0.36p-p^2\ge0,$$
即
$$p^2+0.36p-0.55\le0.$$
对应二次方程的根为
$$\frac{-0.36\pm\sqrt{0.36^2+4\cdot0.55}}{2}
=\frac{-0.36\pm\sqrt{2.3296}}{2}.$$
该区间包含在 $[-1,1]$ 内，因此就是最终答案。`
    }
  },
  {
    id: "yellow-book-problem-006",
    reason: "Probability powers and final sample count were incomplete.",
    fields: {
      answer: "Generate at least 149 independent uniforms.",
      answerZh: "至少需要生成 149 个独立均匀随机变量。",
      promptZh: "你应该生成多少个服从 [0,1] 均匀分布的独立随机变量，才能使至少有一个落在 0.70 到 0.72 之间的概率达到 95%？",
      explanation: raw`A single uniform random variable lands in $[0.70,0.72]$ with probability $0.02$. The probability that it does not land in this interval is $0.98$.

For $N$ independent samples,
$$P(\text{at least one in the interval})=1-0.98^N.$$
We need
$$1-0.98^N\ge0.95,$$
or
$$0.98^N\le0.05.$$
Taking logarithms,
$$N\ge\frac{\log(0.05)}{\log(0.98)}\approx148.28.$$
Therefore the smallest integer is
$$N=149.$$`,
      explanationZh: raw`一个均匀随机变量落在 $[0.70,0.72]$ 内的概率为 $0.02$，不落在该区间内的概率为 $0.98$。

对 $N$ 个独立样本，
$$P(\text{至少一个落入该区间})=1-0.98^N.$$
要求
$$1-0.98^N\ge0.95,$$
即
$$0.98^N\le0.05.$$
取对数得
$$N\ge\frac{\log(0.05)}{\log(0.98)}\approx148.28.$$
所以最小整数为
$$N=149.$$`
    }
  },
  {
    id: "yellow-book-problem-010",
    reason: "Fibonacci recurrence and C++ examples were corrupted.",
    fields: {
      category: "cppProgramming",
      tags: ["黄皮书 150 Most Frequently Asked Questions on Quant Interviews", "Chapter 1", "C++ Programming", "cpp"],
      answer: raw`An iterative C++ implementation is:

    long long fib(int n) {
        if (n < 0) throw std::invalid_argument("negative n");
        if (n <= 1) return n;
        long long prev = 0;
        long long curr = 1;
        for (int i = 2; i <= n; ++i) {
            long long next = prev + curr;
            prev = curr;
            curr = next;
        }
        return curr;
    }`,
      answerZh: raw`一个迭代版 C++ 实现为：

    long long fib(int n) {
        if (n < 0) throw std::invalid_argument("negative n");
        if (n <= 1) return n;
        long long prev = 0;
        long long curr = 1;
        for (int i = 2; i <= n; ++i) {
            long long next = prev + curr;
            prev = curr;
            curr = next;
        }
        return curr;
    }`,
      explanation: raw`The Fibonacci numbers satisfy
$$F_0=0,\qquad F_1=1,\qquad F_n=F_{n-1}+F_{n-2}\quad(n\ge2).$$
The naive recursive implementation mirrors the recurrence but is exponential because it recomputes subproblems. The iterative version above runs in $O(n)$ time and uses $O(1)$ extra space. Use a wider integer type or big integers if $n$ can be large.`,
      explanationZh: raw`斐波那契数满足
$$F_0=0,\qquad F_1=1,\qquad F_n=F_{n-1}+F_{n-2}\quad(n\ge2).$$
朴素递归实现虽然直接对应递推式，但会重复计算子问题，因此是指数时间。上面的迭代版本时间复杂度为 $O(n)$，额外空间为 $O(1)$。如果 $n$ 可能很大，应使用更宽的整数类型或大整数。`
    }
  },
  {
    id: "yellow-book-problem-011",
    reason: "Complex-power answer was empty and explanation was garbled.",
    fields: {
      category: "complexNumbers",
      tags: ["黄皮书 150 Most Frequently Asked Questions on Quant Interviews", "Chapter 3", "Complex Numbers", "complex"],
      answer: raw`The principal value is
$$i^i=e^{-\pi/2}.$$
Because the complex logarithm is multivalued, all values are
$$e^{-(\pi/2+2\pi k)},\qquad k\in\mathbb Z.$$`,
      answerZh: raw`主值为
$$i^i=e^{-\pi/2}.$$
由于复对数是多值的，所有可能值为
$$e^{-(\pi/2+2\pi k)},\qquad k\in\mathbb Z.$$`,
      explanation: raw`Using Euler's formula,
$$i=e^{i(\pi/2+2\pi k)},\qquad k\in\mathbb Z.$$
Thus
$$i^i=\left(e^{i(\pi/2+2\pi k)}\right)^i
=e^{-(\pi/2+2\pi k)}.$$
The principal branch takes $k=0$, giving $e^{-\pi/2}$.`,
      explanationZh: raw`由欧拉公式，
$$i=e^{i(\pi/2+2\pi k)},\qquad k\in\mathbb Z.$$
所以
$$i^i=\left(e^{i(\pi/2+2\pi k)}\right)^i
=e^{-(\pi/2+2\pi k)}.$$
主值取 $k=0$，得到 $e^{-\pi/2}$。`
    }
  },
  {
    id: "yellow-book-problem-012",
    reason: "Comparison proof for pi^e and e^pi was garbled and misclassified.",
    fields: {
      category: "algebra",
      tags: ["黄皮书 150 Most Frequently Asked Questions on Quant Interviews", "Chapter 3", "Mathematics", "inequality"],
      answer: raw`$$e^\pi>\pi^e.$$`,
      answerZh: raw`$$e^\pi>\pi^e.$$`,
      explanation: raw`Taking logarithms, compare
$$\log(\pi^e)=e\log\pi$$
with
$$\log(e^\pi)=\pi.$$
Consider $f(x)=\log x/x$. Since
$$f'(x)=\frac{1-\log x}{x^2}<0\quad\text{for }x>e,$$
and $\pi>e$, we have
$$\frac{\log\pi}{\pi}<\frac{\log e}{e}=\frac1e.$$
Multiplying by $e\pi$ gives $e\log\pi<\pi$. Therefore $\pi^e<e^\pi$.`,
      explanationZh: raw`取对数后，比较
$$\log(\pi^e)=e\log\pi$$
和
$$\log(e^\pi)=\pi.$$
考虑 $f(x)=\log x/x$。由于
$$f'(x)=\frac{1-\log x}{x^2}<0\quad\text{当 }x>e,$$
且 $\pi>e$，所以
$$\frac{\log\pi}{\pi}<\frac{\log e}{e}=\frac1e.$$
两边乘以 $e\pi$ 得 $e\log\pi<\pi$。因此 $\pi^e<e^\pi$。`
    }
  },
  {
    id: "yellow-book-problem-013",
    reason: "AM-GM proof was OCR-corrupted and lacked a clear answer.",
    fields: {
      category: "algebra",
      tags: ["黄皮书 150 Most Frequently Asked Questions on Quant Interviews", "Chapter 3", "Mathematics", "inequality"],
      answer: "The inequality follows from AM-GM applied to the positive numbers e^x and e^y.",
      answerZh: "该不等式可由正数 e^x 和 e^y 的 AM-GM 不等式直接推出。",
      explanation: raw`Let $a=e^x$ and $b=e^y$. Then $a,b>0$, so by AM-GM,
$$\frac{a+b}{2}\ge\sqrt{ab}.$$
Substituting back,
$$\frac{e^x+e^y}{2}\ge\sqrt{e^x e^y}
=e^{(x+y)/2}.$$`,
      explanationZh: raw`令 $a=e^x$，$b=e^y$。则 $a,b>0$，由 AM-GM 不等式，
$$\frac{a+b}{2}\ge\sqrt{ab}.$$
代回得到
$$\frac{e^x+e^y}{2}\ge\sqrt{e^x e^y}
=e^{(x+y)/2}.$$`
    }
  },
  {
    id: "yellow-book-problem-014",
    reason: "Derivative of x^x had empty answer and unreadable explanation.",
    fields: {
      category: "calculus",
      tags: mathTags,
      answer: raw`For $x>0$,
$$\frac{d}{dx}x^x=x^x(\ln x+1).$$`,
      answerZh: raw`对 $x>0$，
$$\frac{d}{dx}x^x=x^x(\ln x+1).$$`,
      explanation: raw`Write
$$x^x=e^{x\ln x}.$$
Then by the chain rule,
$$\frac{d}{dx}x^x=e^{x\ln x}\frac{d}{dx}(x\ln x)
=x^x(\ln x+1).$$`,
      explanationZh: raw`写成
$$x^x=e^{x\ln x}.$$
由链式法则，
$$\frac{d}{dx}x^x=e^{x\ln x}\frac{d}{dx}(x\ln x)
=x^x(\ln x+1).$$`
    }
  },
  {
    id: "yellow-book-problem-016",
    reason: "Infinite power tower answer was missing and explanation was garbled.",
    fields: {
      category: "algebra",
      tags: ["黄皮书 150 Most Frequently Asked Questions on Quant Interviews", "Chapter 3", "Mathematics", "power tower"],
      answer: raw`$$x=\sqrt2.$$`,
      answerZh: raw`$$x=\sqrt2.$$`,
      explanation: raw`Let
$$y=x^{x^{x^\cdots}}.$$
If the tower converges and equals $2$, then the tail of the tower is again $2$, so
$$2=x^2.$$
For positive $x$, this gives
$$x=\sqrt2.$$
Indeed, the tower with base $\sqrt2$ satisfies
$$y=(\sqrt2)^y,$$
and $y=2$ solves this equation. The usual convergence condition for the infinite power tower is also satisfied by $\sqrt2$.`,
      explanationZh: raw`令
$$y=x^{x^{x^\cdots}}.$$
如果该幂塔收敛且等于 $2$，则幂塔的尾部仍等于 $2$，所以
$$2=x^2.$$
对正数 $x$，得到
$$x=\sqrt2.$$
事实上，以 $\sqrt2$ 为底的幂塔满足
$$y=(\sqrt2)^y,$$
而 $y=2$ 正是该方程的解。无限幂塔的常规收敛条件也被 $\sqrt2$ 满足。`
    }
  },
  {
    id: "yellow-book-problem-017",
    reason: "Series convergence results and proofs were unreadable.",
    fields: {
      category: "calculus",
      tags: mathTags,
      answer: raw`The harmonic series
$$\sum_{k=1}^{\infty}\frac1k$$
diverges. The p-series
$$\sum_{k=1}^{\infty}\frac1{k^2}$$
converges. The logarithmic harmonic series
$$\sum_{k=2}^{\infty}\frac1{k\ln k}$$
diverges.`,
      answerZh: raw`调和级数
$$\sum_{k=1}^{\infty}\frac1k$$
发散。p 级数
$$\sum_{k=1}^{\infty}\frac1{k^2}$$
收敛。对数调和级数
$$\sum_{k=2}^{\infty}\frac1{k\ln k}$$
发散。`,
      explanation: raw`The harmonic series diverges by the integral test or by grouping terms. The series $\sum 1/k^2$ converges because it is a p-series with $p=2>1$.

For the third series, use the integral test:
$$\int_2^n\frac{dx}{x\ln x}=\ln(\ln n)-\ln(\ln2),$$
which tends to infinity as $n\to\infty$. Therefore
$$\sum_{k=2}^{\infty}\frac1{k\ln k}$$
diverges.`,
      explanationZh: raw`调和级数可由积分判别法或分组法证明发散。级数 $\sum 1/k^2$ 是 $p=2>1$ 的 p 级数，因此收敛。

第三个级数使用积分判别法：
$$\int_2^n\frac{dx}{x\ln x}=\ln(\ln n)-\ln(\ln2),$$
当 $n\to\infty$ 时趋于无穷。因此
$$\sum_{k=2}^{\infty}\frac1{k\ln k}$$
发散。`
    }
  },
  {
    id: "yellow-book-problem-018",
    reason: "Arctangent integral explanation was corrupted and misclassified.",
    fields: {
      category: "calculus",
      tags: mathTags,
      answer: raw`$$\int\frac{1}{1+x^2}\,dx=\arctan x+C.$$`,
      answerZh: raw`$$\int\frac{1}{1+x^2}\,dx=\arctan x+C.$$`,
      explanation: raw`This is the standard derivative identity:
$$\frac{d}{dx}\arctan x=\frac{1}{1+x^2}.$$
Therefore
$$\int\frac{1}{1+x^2}\,dx=\arctan x+C.$$`,
      explanationZh: raw`这是标准导数恒等式：
$$\frac{d}{dx}\arctan x=\frac{1}{1+x^2}.$$
因此
$$\int\frac{1}{1+x^2}\,dx=\arctan x+C.$$`
    }
  },
  {
    id: "yellow-book-problem-019",
    reason: "Integration-by-parts formulas were unreadable.",
    fields: {
      category: "calculus",
      tags: mathTags,
      answer: raw`$$\int x\ln x\,dx=\frac{x^2}{2}\ln x-\frac{x^2}{4}+C,$$
and
$$\int xe^x\,dx=e^x(x-1)+C.$$`,
      answerZh: raw`$$\int x\ln x\,dx=\frac{x^2}{2}\ln x-\frac{x^2}{4}+C,$$
且
$$\int xe^x\,dx=e^x(x-1)+C.$$`,
      explanation: raw`For the first integral, use integration by parts with $u=\ln x$ and $dv=x\,dx$. Then $du=dx/x$ and $v=x^2/2$, so
$$\int x\ln x\,dx=\frac{x^2}{2}\ln x-\int\frac{x^2}{2}\frac{dx}{x}
=\frac{x^2}{2}\ln x-\frac{x^2}{4}+C.$$

For the second integral, use $u=x$ and $dv=e^x\,dx$. Then
$$\int xe^x\,dx=xe^x-\int e^x\,dx=e^x(x-1)+C.$$`,
      explanationZh: raw`第一个积分使用分部积分，取 $u=\ln x$，$dv=x\,dx$。则 $du=dx/x$，$v=x^2/2$，所以
$$\int x\ln x\,dx=\frac{x^2}{2}\ln x-\int\frac{x^2}{2}\frac{dx}{x}
=\frac{x^2}{2}\ln x-\frac{x^2}{4}+C.$$

第二个积分取 $u=x$，$dv=e^x\,dx$。于是
$$\int xe^x\,dx=xe^x-\int e^x\,dx=e^x(x-1)+C.$$`
    }
  },
  {
    id: "yellow-book-problem-020",
    reason: "ODE solution text had corrupted characteristic roots and constants.",
    fields: {
      category: "calculus",
      tags: mathTags,
      answer: raw`The general solution is
$$y(x)=(C_1+C_2x)e^{2x}+\frac14.$$`,
      answerZh: raw`通解为
$$y(x)=(C_1+C_2x)e^{2x}+\frac14.$$`,
      explanation: raw`The homogeneous equation is
$$y''-4y'+4y=0.$$
Its characteristic polynomial is
$$r^2-4r+4=(r-2)^2,$$
so the homogeneous solution is
$$y_h(x)=(C_1+C_2x)e^{2x}.$$
For a constant particular solution $y_p=A$, substituting into the ODE gives $4A=1$, so $A=1/4$. Therefore
$$y(x)=(C_1+C_2x)e^{2x}+\frac14.$$`,
      explanationZh: raw`对应齐次方程为
$$y''-4y'+4y=0.$$
其特征多项式为
$$r^2-4r+4=(r-2)^2,$$
所以齐次解为
$$y_h(x)=(C_1+C_2x)e^{2x}.$$
取常数特解 $y_p=A$，代入原方程得到 $4A=1$，所以 $A=1/4$。因此
$$y(x)=(C_1+C_2x)e^{2x}+\frac14.$$`
    }
  },
  {
    id: "yellow-book-problem-021",
    reason: "Logistic ODE solution was corrupted and answer was missing.",
    fields: {
      category: "calculus",
      tags: mathTags,
      answer: raw`Nonconstant solutions have the form
$$f(x)=\frac{Ce^x}{1+Ce^x}=\frac{1}{1+Ae^{-x}},$$
on intervals where the denominator is nonzero. The constant solutions $f\equiv0$ and $f\equiv1$ also solve the ODE.`,
      answerZh: raw`非常数解可写为
$$f(x)=\frac{Ce^x}{1+Ce^x}=\frac{1}{1+Ae^{-x}},$$
其中分母不为零。常数解 $f\equiv0$ 和 $f\equiv1$ 也满足该 ODE。`,
      explanation: raw`Let $y=f(x)$. For $y\ne0,1$, separate variables:
$$\frac{dy}{y(1-y)}=dx.$$
Since
$$\frac{1}{y(1-y)}=\frac1y+\frac{1}{1-y},$$
integration gives
$$\ln|y|-\ln|1-y|=x+C.$$
Thus
$$\frac{y}{1-y}=Ce^x,$$
and solving for $y$ gives
$$y=\frac{Ce^x}{1+Ce^x}.$$`,
      explanationZh: raw`令 $y=f(x)$。当 $y\ne0,1$ 时，分离变量：
$$\frac{dy}{y(1-y)}=dx.$$
由于
$$\frac{1}{y(1-y)}=\frac1y+\frac{1}{1-y},$$
积分得到
$$\ln|y|-\ln|1-y|=x+C.$$
因此
$$\frac{y}{1-y}=Ce^x,$$
解出
$$y=\frac{Ce^x}{1+Ce^x}.$$`
    }
  },
  {
    id: "yellow-book-problem-022",
    reason: "Black-Scholes PDE derivation had heavily corrupted notation and empty answer fields.",
    fields: {
      answer: raw`For an underlying with continuous dividend yield $q$, the Black-Scholes PDE is
$$V_t+\frac12\sigma^2S^2V_{SS}+(r-q)SV_S-rV=0.$$`,
      answerZh: raw`对连续股息率为 $q$ 的标的，Black-Scholes PDE 为
$$V_t+\frac12\sigma^2S^2V_{SS}+(r-q)SV_S-rV=0.$$`,
      explanation: raw`Assume
$$dS=(\mu-q)S\,dt+\sigma S\,dW.$$
For a derivative value $V(S,t)$, Ito's lemma gives
$$dV=\left(V_t+(\mu-q)S V_S+\frac12\sigma^2S^2V_{SS}\right)dt+\sigma S V_S\,dW.$$
Hold one derivative and short $\Delta=V_S$ shares. The stochastic term is eliminated. Because the short stock position must pay dividends at rate $q$, the hedged portfolio change is
$$d\Pi=dV-\Delta\,dS-\Delta qS\,dt.$$
Substituting $\Delta=V_S$ leaves
$$d\Pi=\left(V_t+\frac12\sigma^2S^2V_{SS}-qS V_S\right)dt.$$
The portfolio value is
$$\Pi=V-SV_S.$$
No arbitrage requires $d\Pi=r\Pi\,dt$, hence
$$V_t+\frac12\sigma^2S^2V_{SS}-qS V_S=r(V-SV_S).$$
Rearranging,
$$V_t+\frac12\sigma^2S^2V_{SS}+(r-q)SV_S-rV=0.$$`,
      explanationZh: raw`假设
$$dS=(\mu-q)S\,dt+\sigma S\,dW.$$
对衍生品价值 $V(S,t)$ 使用 Ito 引理：
$$dV=\left(V_t+(\mu-q)S V_S+\frac12\sigma^2S^2V_{SS}\right)dt+\sigma S V_S\,dW.$$
持有一份衍生品并卖空 $\Delta=V_S$ 股标的，可消去随机项。由于卖空股票需要支付股息率为 $q$ 的股息，对冲组合变化为
$$d\Pi=dV-\Delta\,dS-\Delta qS\,dt.$$
代入 $\Delta=V_S$ 后得到
$$d\Pi=\left(V_t+\frac12\sigma^2S^2V_{SS}-qS V_S\right)dt.$$
组合价值为
$$\Pi=V-SV_S.$$
无套利要求 $d\Pi=r\Pi\,dt$，因此
$$V_t+\frac12\sigma^2S^2V_{SS}-qS V_S=r(V-SV_S).$$
整理得
$$V_t+\frac12\sigma^2S^2V_{SS}+(r-q)SV_S-rV=0.$$`
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
