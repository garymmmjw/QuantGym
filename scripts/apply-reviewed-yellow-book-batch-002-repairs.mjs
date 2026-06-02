import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const raw = String.raw;
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const options = parseArgs(process.argv.slice(2));
const sourcePath = path.resolve(projectRoot, options.source || "data/question-banks/yellow-book/problems.json");
const reportPath = path.resolve(projectRoot, options.report || "artifacts/question-bank-quality-review/yellow-book-batch-002-reviewed-repairs-report.json");
const payload = readJson(sourcePath, { problems: [] });
const problems = Array.isArray(payload) ? payload : payload.problems || [];
const problemById = new Map(problems.map((problem) => [String(problem.id || ""), problem]));
const reviewSource = "llm-full-major-triage-reviewed-repair-yellow-book-batch-002-2026-06-02";

const linearTags = ["黄皮书 150 Most Frequently Asked Questions on Quant Interviews", "Chapter 3", "Linear Algebra", "matrix"];
const optionTags = ["黄皮书 150 Most Frequently Asked Questions on Quant Interviews", "Chapter 3", "Financial Instruments", "Option", "derivatives"];
const cppTags = ["黄皮书 150 Most Frequently Asked Questions on Quant Interviews", "Chapter 3", "C++ Data Structures", "C++ Programming", "cpp"];

const repairs = [
  {
    id: "yellow-book-problem-023",
    reason: "Covariance/correlation PSD proof contained gibberish formulas.",
    fields: {
      category: "statistics",
      tags: ["黄皮书 150 Most Frequently Asked Questions on Quant Interviews", "Chapter 3", "Covariance", "statistics"],
      answer: "Every covariance matrix is symmetric positive semidefinite. Every correlation matrix is also symmetric positive semidefinite because it is a covariance matrix after standardizing the variables.",
      answerZh: "任何协方差矩阵都是对称正半定矩阵。任何相关矩阵也都是对称正半定矩阵，因为它是将随机变量标准化后的协方差矩阵。",
      explanation: raw`Let $\Sigma$ be the covariance matrix of $X_1,\ldots,X_n$. Symmetry follows from
$$\Sigma_{ij}=\operatorname{Cov}(X_i,X_j)=\operatorname{Cov}(X_j,X_i)=\Sigma_{ji}.$$
For any vector $c\in\mathbb R^n$,
$$c^T\Sigma c
=\operatorname{Var}\left(\sum_{i=1}^n c_iX_i\right)\ge0.$$
Therefore $\Sigma$ is positive semidefinite.

For a correlation matrix, define standardized variables
$$Y_i=\frac{X_i-E[X_i]}{\sigma_i}$$
when $\sigma_i>0$. The correlation matrix of the $X_i$ is the covariance matrix of the $Y_i$, so the same argument shows it is symmetric positive semidefinite.`,
      explanationZh: raw`设 $\Sigma$ 为 $X_1,\ldots,X_n$ 的协方差矩阵。对称性来自
$$\Sigma_{ij}=\operatorname{Cov}(X_i,X_j)=\operatorname{Cov}(X_j,X_i)=\Sigma_{ji}.$$
对任意向量 $c\in\mathbb R^n$，
$$c^T\Sigma c
=\operatorname{Var}\left(\sum_{i=1}^n c_iX_i\right)\ge0.$$
因此 $\Sigma$ 为正半定矩阵。

对相关矩阵，当 $\sigma_i>0$ 时令标准化变量
$$Y_i=\frac{X_i-E[X_i]}{\sigma_i}.$$
$X_i$ 的相关矩阵就是 $Y_i$ 的协方差矩阵，所以同样是对称正半定矩阵。`
    }
  },
  {
    id: "yellow-book-problem-024",
    reason: "Covariance matrix and correlation conversion were OCR-corrupted.",
    fields: {
      titleEn: "Question 2 - Correlation matrix from a covariance matrix",
      titleZh: "问题 2 - 由协方差矩阵求相关矩阵",
      category: "statistics",
      tags: ["黄皮书 150 Most Frequently Asked Questions on Quant Interviews", "Chapter 3", "Correlation Matrix", "statistics"],
      answer: raw`For
$$\Sigma=\begin{pmatrix}1&0.36&-1.44\\0.36&4&0.80\\-1.44&0.80&9\end{pmatrix},$$
the standard deviations are $1,2,3$, so the correlation matrix is
$$R=\begin{pmatrix}
1&0.18&-0.48\\
0.18&1&0.1333\\
-0.48&0.1333&1
\end{pmatrix}.$$`,
      answerZh: raw`对
$$\Sigma=\begin{pmatrix}1&0.36&-1.44\\0.36&4&0.80\\-1.44&0.80&9\end{pmatrix},$$
标准差为 $1,2,3$，因此相关矩阵为
$$R=\begin{pmatrix}
1&0.18&-0.48\\
0.18&1&0.1333\\
-0.48&0.1333&1
\end{pmatrix}.$$`,
      promptEn: raw`Find the correlation matrix of three random variables with covariance matrix
$$\Sigma=\begin{pmatrix}1&0.36&-1.44\\0.36&4&0.80\\-1.44&0.80&9\end{pmatrix}.$$`,
      promptZh: raw`已知三个随机变量的协方差矩阵为
$$\Sigma=\begin{pmatrix}1&0.36&-1.44\\0.36&4&0.80\\-1.44&0.80&9\end{pmatrix},$$
求它们的相关矩阵。`,
      explanation: raw`The correlation between variables $i$ and $j$ is
$$\rho_{ij}=\frac{\Sigma_{ij}}{\sigma_i\sigma_j}.$$
The diagonal entries give
$$\sigma_1=1,\qquad \sigma_2=2,\qquad \sigma_3=3.$$
Thus
$$\rho_{12}=0.36/(1\cdot2)=0.18,$$
$$\rho_{13}=-1.44/(1\cdot3)=-0.48,$$
and
$$\rho_{23}=0.80/(2\cdot3)\approx0.1333.$$`,
      explanationZh: raw`变量 $i$ 和 $j$ 的相关系数为
$$\rho_{ij}=\frac{\Sigma_{ij}}{\sigma_i\sigma_j}.$$
由对角线元素得
$$\sigma_1=1,\qquad \sigma_2=2,\qquad \sigma_3=3.$$
因此
$$\rho_{12}=0.36/(1\cdot2)=0.18,$$
$$\rho_{13}=-1.44/(1\cdot3)=-0.48,$$
以及
$$\rho_{23}=0.80/(2\cdot3)\approx0.1333.$$`
    }
  },
  {
    id: "yellow-book-problem-025",
    reason: "Equicorrelation bounds were missing.",
    fields: {
      category: "statistics",
      tags: ["黄皮书 150 Most Frequently Asked Questions on Quant Interviews", "Chapter 3", "Correlation Matrix", "statistics"],
      answer: raw`For an $n\times n$ equicorrelation matrix,
$$-\frac{1}{n-1}\le p\le1.$$`,
      answerZh: raw`对 $n\times n$ 等相关矩阵，
$$-\frac{1}{n-1}\le p\le1.$$`,
      explanation: raw`The matrix can be written as
$$R=(1-p)I+p\mathbf 1\mathbf 1^T.$$
The vector $\mathbf 1$ is an eigenvector with eigenvalue
$$1+(n-1)p.$$
Any vector orthogonal to $\mathbf 1$ is an eigenvector with eigenvalue
$$1-p,$$
with multiplicity $n-1$. A correlation matrix must be positive semidefinite, so both eigenvalues must be nonnegative:
$$1-p\ge0,\qquad 1+(n-1)p\ge0.$$
Thus
$$-\frac{1}{n-1}\le p\le1.$$`,
      explanationZh: raw`该矩阵可写为
$$R=(1-p)I+p\mathbf 1\mathbf 1^T.$$
向量 $\mathbf 1$ 是特征向量，对应特征值
$$1+(n-1)p.$$
任何与 $\mathbf 1$ 正交的向量都是特征向量，对应特征值
$$1-p,$$
其重数为 $n-1$。相关矩阵必须正半定，因此两个特征值都非负：
$$1-p\ge0,\qquad 1+(n-1)p\ge0.$$
所以
$$-\frac{1}{n-1}\le p\le1.$$`
    }
  },
  {
    id: "yellow-book-problem-027",
    reason: "Matrix A and both requested decompositions were missing or unreadable.",
    fields: {
      titleEn: "Question 5 - Matrix square root and Cholesky factor",
      titleZh: "问题 5 - 矩阵平方根和 Cholesky 因子",
      category: "linearAlgebra",
      tags: linearTags,
      answer: raw`For
$$A=\begin{pmatrix}2&-2\\-2&5\end{pmatrix},$$
one square root is
$$M=\frac15\begin{pmatrix}4+\sqrt6&2-2\sqrt6\\2-2\sqrt6&1+4\sqrt6\end{pmatrix},\qquad M^2=A.$$
One factor satisfying $A=MM^T$ is
$$M=\begin{pmatrix}\sqrt2&0\\-\sqrt2&\sqrt3\end{pmatrix}.$$`,
      answerZh: raw`对
$$A=\begin{pmatrix}2&-2\\-2&5\end{pmatrix},$$
一个平方根为
$$M=\frac15\begin{pmatrix}4+\sqrt6&2-2\sqrt6\\2-2\sqrt6&1+4\sqrt6\end{pmatrix},\qquad M^2=A.$$
一个满足 $A=MM^T$ 的因子为
$$M=\begin{pmatrix}\sqrt2&0\\-\sqrt2&\sqrt3\end{pmatrix}.$$`,
      promptEn: raw`Let
$$A=\begin{pmatrix}2&-2\\-2&5\end{pmatrix}.$$
(i) Find a $2\times2$ matrix $M$ such that $M^2=A$.
(ii) Find a $2\times2$ matrix $M$ such that $A=MM^T$.`,
      promptZh: raw`设
$$A=\begin{pmatrix}2&-2\\-2&5\end{pmatrix}.$$
(i) 求一个 $2\times2$ 矩阵 $M$，使 $M^2=A$。
(ii) 求一个 $2\times2$ 矩阵 $M$，使 $A=MM^T$。`,
      explanation: raw`The eigenvalues of $A$ are $1$ and $6$, with orthonormal eigenvectors
$$v_1=\frac1{\sqrt5}\begin{pmatrix}2\\1\end{pmatrix},\qquad
v_2=\frac1{\sqrt5}\begin{pmatrix}1\\-2\end{pmatrix}.$$
Using the spectral decomposition $A=Q\Lambda Q^T$, a symmetric square root is
$$Q\Lambda^{1/2}Q^T
=\frac15\begin{pmatrix}4+\sqrt6&2-2\sqrt6\\2-2\sqrt6&1+4\sqrt6\end{pmatrix}.$$

For the second part, use the lower-triangular Cholesky factor directly:
$$M=\begin{pmatrix}\sqrt2&0\\-\sqrt2&\sqrt3\end{pmatrix}.$$
Then
$$MM^T=\begin{pmatrix}2&-2\\-2&5\end{pmatrix}=A.$$`,
      explanationZh: raw`矩阵 $A$ 的特征值为 $1$ 和 $6$，对应单位特征向量可取
$$v_1=\frac1{\sqrt5}\begin{pmatrix}2\\1\end{pmatrix},\qquad
v_2=\frac1{\sqrt5}\begin{pmatrix}1\\-2\end{pmatrix}.$$
由谱分解 $A=Q\Lambda Q^T$，一个对称平方根为
$$Q\Lambda^{1/2}Q^T
=\frac15\begin{pmatrix}4+\sqrt6&2-2\sqrt6\\2-2\sqrt6&1+4\sqrt6\end{pmatrix}.$$

第二问直接使用下三角 Cholesky 因子：
$$M=\begin{pmatrix}\sqrt2&0\\-\sqrt2&\sqrt3\end{pmatrix}.$$
于是
$$MM^T=\begin{pmatrix}2&-2\\-2&5\end{pmatrix}=A.$$`
    }
  },
  {
    id: "yellow-book-problem-028",
    reason: "Eigenvectors and final Av computation were unreadable.",
    fields: {
      titleEn: "Question 6 - Compute Av from eigenvectors",
      titleZh: "问题 6 - 由特征向量分解计算 Av",
      category: "linearAlgebra",
      tags: linearTags,
      answer: raw`With eigenvectors
$$v_1=\begin{pmatrix}1\\1\end{pmatrix},\qquad v_2=\begin{pmatrix}-1\\1\end{pmatrix},$$
and $v=\begin{pmatrix}3\\1\end{pmatrix}$, we have $v=2v_1-v_2$. Hence
$$Av=2(2v_1)-(-3)v_2=4v_1+3v_2=\begin{pmatrix}1\\7\end{pmatrix}.$$`,
      answerZh: raw`若
$$v_1=\begin{pmatrix}1\\1\end{pmatrix},\qquad v_2=\begin{pmatrix}-1\\1\end{pmatrix},$$
且 $v=\begin{pmatrix}3\\1\end{pmatrix}$，则 $v=2v_1-v_2$。因此
$$Av=2(2v_1)-(-3)v_2=4v_1+3v_2=\begin{pmatrix}1\\7\end{pmatrix}.$$`,
      promptEn: raw`The $2\times2$ matrix $A$ has eigenvalues $2$ and $-3$ with corresponding eigenvectors
$$v_1=\begin{pmatrix}1\\1\end{pmatrix},\qquad v_2=\begin{pmatrix}-1\\1\end{pmatrix}.$$
If
$$v=\begin{pmatrix}3\\1\end{pmatrix},$$
find $Av$.`,
      promptZh: raw`$2\times2$ 矩阵 $A$ 的特征值为 $2$ 和 $-3$，对应特征向量分别为
$$v_1=\begin{pmatrix}1\\1\end{pmatrix},\qquad v_2=\begin{pmatrix}-1\\1\end{pmatrix}.$$
若
$$v=\begin{pmatrix}3\\1\end{pmatrix},$$
求 $Av$。`,
      explanation: raw`First express $v$ in the eigenbasis:
$$\begin{pmatrix}3\\1\end{pmatrix}
=2\begin{pmatrix}1\\1\end{pmatrix}
-\begin{pmatrix}-1\\1\end{pmatrix}.$$
Then apply $A$ by multiplying each eigenvector component by its eigenvalue:
$$Av=2A v_1-A v_2=2(2v_1)-(-3v_2)=4v_1+3v_2.$$
Thus
$$Av=4\begin{pmatrix}1\\1\end{pmatrix}+3\begin{pmatrix}-1\\1\end{pmatrix}
=\begin{pmatrix}1\\7\end{pmatrix}.$$`,
      explanationZh: raw`先把 $v$ 写成特征向量基底下的线性组合：
$$\begin{pmatrix}3\\1\end{pmatrix}
=2\begin{pmatrix}1\\1\end{pmatrix}
-\begin{pmatrix}-1\\1\end{pmatrix}.$$
再利用 $A$ 作用在特征向量上只会乘以对应特征值：
$$Av=2A v_1-A v_2=2(2v_1)-(-3v_2)=4v_1+3v_2.$$
所以
$$Av=4\begin{pmatrix}1\\1\end{pmatrix}+3\begin{pmatrix}-1\\1\end{pmatrix}
=\begin{pmatrix}1\\7\end{pmatrix}.$$`
    }
  },
  {
    id: "yellow-book-problem-030",
    reason: "Trace proof was truncated and category was wrong.",
    fields: {
      category: "linearAlgebra",
      tags: linearTags,
      answer: "No. There are no finite n by n matrices A and B such that AB - BA = I_n.",
      answerZh: "不存在。不存在有限维 n 阶矩阵 A 和 B 使得 AB - BA = I_n。",
      explanation: raw`Assume such matrices existed. Taking traces,
$$\operatorname{tr}(AB-BA)=\operatorname{tr}(I_n)=n.$$
But trace is cyclic for square matrices of the same size:
$$\operatorname{tr}(AB)=\operatorname{tr}(BA).$$
Therefore
$$\operatorname{tr}(AB-BA)=0,$$
contradicting $n>0$. Hence no such finite-dimensional matrices exist.`,
      explanationZh: raw`假设这样的矩阵存在。两边取迹：
$$\operatorname{tr}(AB-BA)=\operatorname{tr}(I_n)=n.$$
但同阶方阵满足迹的循环性质：
$$\operatorname{tr}(AB)=\operatorname{tr}(BA).$$
因此
$$\operatorname{tr}(AB-BA)=0,$$
与 $n>0$ 矛盾。所以不存在这样的有限维矩阵。`
    }
  },
  {
    id: "yellow-book-problem-031",
    reason: "Probability-matrix row was categorized too broadly.",
    fields: {
      category: "linearAlgebra",
      tags: ["黄皮书 150 Most Frequently Asked Questions on Quant Interviews", "Chapter 3", "Linear Algebra", "stochastic-matrix"],
      answer: "The product of two probability matrices is a probability matrix.",
      answerZh: "两个概率矩阵的乘积仍然是概率矩阵。",
      explanation: raw`Let $\mathbf 1$ be the column vector of all ones. A matrix $P$ with nonnegative entries is a probability matrix exactly when
$$P\mathbf 1=\mathbf 1.$$
If $A$ and $B$ are probability matrices, then $AB$ has nonnegative entries because it is a sum of products of nonnegative entries. Also,
$$(AB)\mathbf 1=A(B\mathbf 1)=A\mathbf 1=\mathbf 1.$$
Thus every row of $AB$ sums to $1$, and $AB$ is a probability matrix.`,
      explanationZh: raw`令 $\mathbf 1$ 为全 1 列向量。一个非负矩阵 $P$ 是概率矩阵，当且仅当
$$P\mathbf 1=\mathbf 1.$$
若 $A$ 和 $B$ 都是概率矩阵，则 $AB$ 的元素是非负元素乘积之和，因此仍非负。同时
$$(AB)\mathbf 1=A(B\mathbf 1)=A\mathbf 1=\mathbf 1.$$
所以 $AB$ 的每一行和仍为 $1$，即 $AB$ 仍为概率矩阵。`
    }
  },
  {
    id: "yellow-book-problem-034",
    reason: "One-step binomial put valuation formulas and translation were garbled.",
    fields: {
      titleZh: "问题 2 - 股票价格为 50 美元的单期看跌期权",
      answer: "The at-the-money put is worth 1.20.",
      answerZh: "该平值看跌期权价值为 1.20。",
      promptZh: "股票当前价格为 50 美元。三个月后股价要么为 47 美元，要么为 52 美元，两个状态的现实概率各为 50%。为简单起见，假设股票不分红且利率为零。平值看跌期权价值是多少？",
      explanation: raw`The real-world probability of 50% is irrelevant for no-arbitrage pricing. With zero interest, the risk-neutral up probability $p$ solves
$$50=p\cdot52+(1-p)\cdot47.$$
Thus
$$p=\frac{50-47}{52-47}=\frac35=0.6,$$
and the down probability is $0.4$.

The put payoff is $0$ in the up state and $3$ in the down state. Therefore
$$P_0=0.6\cdot0+0.4\cdot3=1.20.$$`,
      explanationZh: raw`现实世界的 50% 概率不参与无套利定价。利率为零时，风险中性上涨概率 $p$ 满足
$$50=p\cdot52+(1-p)\cdot47.$$
所以
$$p=\frac{50-47}{52-47}=\frac35=0.6,$$
下跌概率为 $0.4$。

看跌期权在上涨状态收益为 $0$，在下跌状态收益为 $3$。因此
$$P_0=0.6\cdot0+0.4\cdot3=1.20.$$`
    }
  },
  {
    id: "yellow-book-problem-038",
    reason: "ATM put approximation had mistranslated prompt and wrong T notation.",
    fields: {
      answer: "Approximately 2.40.",
      answerZh: "约为 2.40。",
      promptZh: "现货价格为 40、波动率为 30% 的资产，其三个月平值看跌期权价值约为多少？为简单起见，假设利率为零且资产不分红。",
      explanation: raw`For an at-the-money option with zero rates and no dividends, a useful small-total-variance approximation is
$$P_{\text{ATM}}\approx0.4S_0\sigma\sqrt T.$$
Here $S_0=40$, $\sigma=0.30$, and $T=3/12=0.25$, so $\sqrt T=0.5$. Therefore
$$P_{\text{ATM}}\approx0.4\cdot40\cdot0.30\cdot0.5=2.40.$$
The Black-Scholes value is about $2.39$, so the approximation is quite accurate here.`,
      explanationZh: raw`在利率为零且无股息时，平值期权可用小总方差近似：
$$P_{\text{ATM}}\approx0.4S_0\sigma\sqrt T.$$
这里 $S_0=40$，$\sigma=0.30$，$T=3/12=0.25$，所以 $\sqrt T=0.5$。因此
$$P_{\text{ATM}}\approx0.4\cdot40\cdot0.30\cdot0.5=2.40.$$
Black-Scholes 精确值约为 $2.39$，所以该近似在这里很准确。`
    }
  },
  {
    id: "yellow-book-problem-039",
    reason: "Call value change answer was truncated.",
    fields: {
      answer: "It cannot be determined exactly from this information alone. If the stock doubles, the call will likely become very deep in the money, so its Delta will be close to 1 and its value will increase by roughly the stock-price increase, but the exact change depends on strike, maturity, rates, dividends, and volatility.",
      answerZh: "仅凭这些信息无法精确确定。如果股票价格翻倍，看涨期权通常会变得深度实值，其 Delta 接近 1，价值大致会随股价上涨额同幅增加；但精确变化取决于执行价、到期、利率、股息和波动率。",
      explanation: "A call option value is not determined by the stock move alone. For small moves, the first-order approximation is Delta times the stock-price change. For a huge upward move such as a one-day doubling, most ordinary calls become deep in the money and behave almost like the stock, so Delta is close to 1. Still, without the strike and maturity, there is no unique numerical answer.",
      explanationZh: "看涨期权价值不能只由股价变动决定。对小幅变动，一阶近似是 Delta 乘以股价变化。对“一天翻倍”这种巨大上涨，普通看涨期权通常会变成深度实值，行为接近股票本身，因此 Delta 接近 1。但如果不知道执行价和到期日，就没有唯一的数值答案。"
    }
  },
  {
    id: "yellow-book-problem-041",
    reason: "ATM call/put Delta formulas were garbled and answer was missing.",
    fields: {
      answer: "Approximately +0.5 for an at-the-money call and -0.5 for an at-the-money put.",
      answerZh: "平值看涨期权的 Delta 约为 +0.5，平值看跌期权的 Delta 约为 -0.5。",
      explanation: raw`In Black-Scholes, for a non-dividend-paying stock,
$$\Delta_{\text{call}}=N(d_1),\qquad \Delta_{\text{put}}=N(d_1)-1.$$
For an at-the-money option with moderate maturity and volatility, $d_1$ is close to $0$. Since $N(0)=0.5$,
$$\Delta_{\text{call}}\approx0.5,\qquad \Delta_{\text{put}}\approx-0.5.$$`,
      explanationZh: raw`在 Black-Scholes 模型中，对不分红股票，
$$\Delta_{\text{call}}=N(d_1),\qquad \Delta_{\text{put}}=N(d_1)-1.$$
对期限和波动率适中的平值期权，$d_1$ 接近 $0$。由于 $N(0)=0.5$，
$$\Delta_{\text{call}}\approx0.5,\qquad \Delta_{\text{put}}\approx-0.5.$$`
    }
  },
  {
    id: "yellow-book-problem-046",
    reason: "Put-call parity formulas were corrupted and explanation was incomplete.",
    fields: {
      answer: raw`A European call and put with the same strike and maturity have the same value when the strike equals the forward price:
$$K=F_0=S_0e^{(r-q)T}.$$`,
      answerZh: raw`同执行价、同到期日的欧式看涨和看跌期权在执行价等于远期价格时价值相同：
$$K=F_0=S_0e^{(r-q)T}.$$`,
      explanation: raw`Put-call parity with continuous dividend yield $q$ is
$$C-P=S_0e^{-qT}-Ke^{-rT}.$$
If $C=P$, then
$$S_0e^{-qT}=Ke^{-rT},$$
so
$$K=S_0e^{(r-q)T}=F_0.$$
Thus the options are at-the-money forward.

The intuition is that at the forward strike, the prepaid forward value of the underlying equals the present value of the strike. The call's upside and the put's downside are balanced around the forward level under the parity relationship.`,
      explanationZh: raw`连续股息率为 $q$ 时，看跌-看涨平价为
$$C-P=S_0e^{-qT}-Ke^{-rT}.$$
若 $C=P$，则
$$S_0e^{-qT}=Ke^{-rT},$$
所以
$$K=S_0e^{(r-q)T}=F_0.$$
因此这两个期权是远期平值期权。

直觉是：当执行价等于远期价格时，标的的预付远期价格等于执行价现值。根据平价关系，看涨的上行收益和看跌的下行收益围绕远期水平相互平衡。`
    }
  },
  {
    id: "yellow-book-problem-048",
    reason: "Swap valuation explanation was truncated and partially untranslated.",
    fields: {
      answer: raw`Value a swap as fixed leg minus floating leg for a receiver-fixed swap. If the fixed rate is $R$, payment dates are $T_i$, accruals are $\delta_i$, and discount factors are $P(0,T_i)$, then
$$V_{\text{fixed}}=N R\sum_i\delta_iP(0,T_i),$$
and the floating leg is worth approximately par immediately after reset. The par swap rate is
$$R_{\text{swap}}=\frac{P(0,T_0)-P(0,T_n)}{\sum_i\delta_iP(0,T_i)}.$$`,
      answerZh: raw`对收固定利率的一方，互换价值等于固定腿价值减浮动腿价值。若固定利率为 $R$，支付日为 $T_i$，计息年限为 $\delta_i$，贴现因子为 $P(0,T_i)$，则
$$V_{\text{fixed}}=N R\sum_i\delta_iP(0,T_i),$$
浮动腿在重置后大约按面值计价。平价互换利率为
$$R_{\text{swap}}=\frac{P(0,T_0)-P(0,T_n)}{\sum_i\delta_iP(0,T_i)}.$$`,
      explanation: raw`An interest-rate swap can be decomposed into two bonds: a fixed-rate bond and a floating-rate note. For the party receiving fixed and paying floating,
$$V_{\text{swap}}=V_{\text{fixed leg}}-V_{\text{floating leg}}.$$
The fixed leg is just the present value of known coupons. The floating leg resets to par on reset dates; between reset dates, include the next already-set floating coupon plus the remaining par-style floating note value.

At inception, the par fixed rate is the rate that makes the swap value zero:
$$R_{\text{swap}}\sum_i\delta_iP(0,T_i)=P(0,T_0)-P(0,T_n).$$`,
      explanationZh: raw`利率互换可以拆成两条债券现金流：固定利率债券和浮动利率票据。对收固定、付浮动的一方，
$$V_{\text{swap}}=V_{\text{fixed leg}}-V_{\text{floating leg}}.$$
固定腿就是已知票息的现值。浮动腿在重置日会回到面值；在两个重置日之间，需要加入下一笔已确定的浮动票息，以及剩余部分近似按面值计价的浮动票据价值。

互换初始平价时，固定利率使互换价值为零：
$$R_{\text{swap}}\sum_i\delta_iP(0,T_i)=P(0,T_0)-P(0,T_n).$$`
    }
  },
  {
    id: "yellow-book-problem-050",
    reason: "Duration approximation answer and notation were missing/garbled.",
    fields: {
      titleEn: "Question 18 - Bond value after a 50 bp yield decrease",
      titleZh: "问题 18 - 收益率下降 50 个基点后的债券价值",
      promptZh: "一只五年期债券当前价值为 102，久期为 3.5 年。如果收益率下降 50 个基点，该债券的价值约为多少？",
      answer: "Approximately 103.785, or about 103.79.",
      answerZh: "约为 103.785，也就是约 103.79。",
      explanation: raw`Using duration,
$$\Delta B\approx-D B\,\Delta y.$$
Here $B=102$, $D=3.5$, and the yield change is
$$\Delta y=-0.005.$$
Therefore
$$\Delta B\approx-3.5\cdot102\cdot(-0.005)=1.785.$$
The new bond value is
$$102+1.785=103.785.$$`,
      explanationZh: raw`使用久期近似：
$$\Delta B\approx-D B\,\Delta y.$$
这里 $B=102$，$D=3.5$，收益率变化为
$$\Delta y=-0.005.$$
因此
$$\Delta B\approx-3.5\cdot102\cdot(-0.005)=1.785.$$
新的债券价值为
$$102+1.785=103.785.$$`
    }
  },
  {
    id: "yellow-book-problem-051",
    reason: "Forward contract explanation and formula were incomplete.",
    fields: {
      answer: raw`A forward contract is an agreement to buy or sell an asset at a future date for a delivery price fixed today. The forward price is the delivery price that makes the contract value zero at inception. With continuous dividend yield $q$,
$$F_0=S_0e^{(r-q)T}.$$`,
      answerZh: raw`远期合约是约定在未来某日按今天确定的交割价格买入或卖出资产的协议。远期价格是使合约初始价值为零的交割价格。若连续股息率为 $q$，
$$F_0=S_0e^{(r-q)T}.$$`,
      explanation: raw`The long side of a forward agrees to buy the asset at maturity; the short side agrees to deliver it. The forward price is chosen so that neither side pays an upfront premium at inception.

For a non-dividend-paying asset, no arbitrage gives
$$F_0=S_0e^{rT}.$$
With continuous dividend yield $q$,
$$F_0=S_0e^{(r-q)T}.$$
The forward price is not an upfront price paid for the contract; it is the delivery price written into the contract.`,
      explanationZh: raw`远期多头同意在到期时买入资产；远期空头同意交割资产。远期价格的选择使合约在初始时对双方都没有前端价值。

对不分红资产，无套利给出
$$F_0=S_0e^{rT}.$$
若资产连续支付股息率 $q$，
$$F_0=S_0e^{(r-q)T}.$$
远期价格不是为合约支付的前端价格，而是写入合约的未来交割价格。`
    }
  },
  {
    id: "yellow-book-problem-052",
    reason: "Treasury/commodity forward-price formulas were garbled.",
    fields: {
      category: "option",
      tags: ["黄皮书 150 Most Frequently Asked Questions on Quant Interviews", "Chapter 3", "Financial Instruments", "Forwards", "Futures", "derivatives"],
      promptZh: "国债期货合约的远期价格是多少？商品期货合约的远期价格又是多少？",
      answer: raw`Treasury forward:
$$F=(S_0-C)e^{rT},$$
where $C$ is the present value of coupons received before delivery.

Commodity forward with storage costs:
$$F=(S_0+C)e^{rT},$$
where $C$ is the present value of storage costs.`,
      answerZh: raw`国债远期：
$$F=(S_0-C)e^{rT},$$
其中 $C$ 为交割前收到的票息现值。

有仓储成本的商品远期：
$$F=(S_0+C)e^{rT},$$
其中 $C$ 为仓储成本现值。`,
      explanation: raw`For a treasury bond, owning the bond during the life of the forward generates coupon income. This reduces the cost of carry, so subtract the present value $C$ of coupons before compounding to maturity:
$$F=(S_0-C)e^{rT}.$$

For a physical commodity, owning the commodity may require storage costs. This increases the cost of carry, so add the present value $C$ of storage costs:
$$F=(S_0+C)e^{rT}.$$
Here present values are taken using the same risk-free discounting convention as $r$. These formulas ignore convenience yield; if convenience yield is present, it should be included as a benefit of holding the commodity.`,
      explanationZh: raw`对国债，持有标的债券期间会收到票息收入。这降低了持有成本，因此先减去票息现值 $C$，再滚动到到期：
$$F=(S_0-C)e^{rT}.$$

对实物商品，持有商品可能需要支付仓储成本。这提高了持有成本，因此加上仓储成本现值 $C$：
$$F=(S_0+C)e^{rT}.$$
这里的现值按与 $r$ 一致的无风险贴现口径计算。这些公式忽略便利收益；若存在便利收益，应把它作为持有商品的收益纳入。`
    }
  },
  {
    id: "yellow-book-problem-055",
    reason: "VaR scaling formula and Chinese explanation were corrupted.",
    fields: {
      category: "market",
      tags: ["黄皮书 150 Most Frequently Asked Questions on Quant Interviews", "Chapter 3", "VaR", "risk", "market"],
      answer: "Approximately 16.02 million dollars.",
      answerZh: "约为 1602 万美元。",
      explanation: raw`Assuming normally distributed returns, VaR scales with the square root of time and with the relevant normal quantile:
$$\frac{\operatorname{VaR}(10,99\%)}{\operatorname{VaR}(5,98\%)}
=\sqrt{\frac{10}{5}}\frac{z_{0.99}}{z_{0.98}}.$$
Using $z_{0.99}=2.3263$ and $z_{0.98}=2.0537$,
$$\operatorname{VaR}(10,99\%)
=10{,}000{,}000\cdot\sqrt2\cdot\frac{2.3263}{2.0537}
\approx16{,}019{,}000,$$
which rounds to about 16.02 million dollars.`,
      explanationZh: raw`假设收益服从正态分布，VaR 随时间平方根缩放，并随对应置信水平的正态分位数缩放：
$$\frac{\operatorname{VaR}(10,99\%)}{\operatorname{VaR}(5,98\%)}
=\sqrt{\frac{10}{5}}\frac{z_{0.99}}{z_{0.98}}.$$
使用 $z_{0.99}=2.3263$ 和 $z_{0.98}=2.0537$，
$$\operatorname{VaR}(10,99\%)
=10{,}000{,}000\cdot\sqrt2\cdot\frac{2.3263}{2.0537}
\approx16{,}019{,}000,$$
四舍五入约为 1602 万美元。`
    }
  },
  {
    id: "yellow-book-problem-059",
    reason: "C++ pointer declaration answer was empty and translation was garbled.",
    fields: {
      category: "cppProgramming",
      tags: cppTags,
      answer: raw`Pointer to const:

    const T* p;
    T const* p;

Const pointer:

    T* const p = initial_address;

Const pointer to const:

    const T* const p = initial_address;
    T const* const p = initial_address;`,
      answerZh: raw`指向 const 对象的指针：

    const T* p;
    T const* p;

const 指针：

    T* const p = initial_address;

指向 const 对象的 const 指针：

    const T* const p = initial_address;
    T const* const p = initial_address;`,
      explanation: "Read C++ declarations from right to left. In T* const p, p itself is const. In const T* p, the object pointed to is const. Combining both gives const T* const p.",
      explanationZh: "C++ 声明通常可从右向左读。T* const p 中，p 本身是 const；const T* p 中，被指向的对象是 const。二者结合就是 const T* const p。"
    }
  },
  {
    id: "yellow-book-problem-066",
    reason: "Template function code had corrupted plus signs.",
    fields: {
      category: "cppProgramming",
      tags: cppTags,
      answer: raw`Use either template<class T> or template<typename T>:

    template<typename T>
    T temp_sum(T a, T b) {
        return a + b;
    }`,
      answerZh: raw`可使用 template<class T> 或 template<typename T>：

    template<typename T>
    T temp_sum(T a, T b) {
        return a + b;
    }`,
      explanation: "There is no functional difference between class and typename in a type template parameter declaration. The compiler can often infer T from the arguments, or the caller can specify it explicitly.",
      explanationZh: "在类型模板参数声明中，class 和 typename 没有功能差异。编译器通常可以从实参推断 T，也可以由调用方显式指定。"
    }
  },
  {
    id: "yellow-book-problem-073",
    reason: "C++ shallow-copy prompt was garbled.",
    fields: {
      titleEn: "Question 18 - Output of code with shallow-copied owning pointer",
      titleZh: "问题 18 - 浅拷贝拥有型指针代码的输出",
      category: "cppProgramming",
      tags: cppTags,
      answer: "The behavior is undefined. It may print garbage, crash, or appear to work, depending on the compiler/runtime.",
      answerZh: "行为未定义。它可能打印垃圾值、崩溃，或者看似正常，取决于编译器和运行环境。",
      promptEn: raw`What is the output of the following code?

    #include <iostream>
    using namespace std;

    class A {
    public:
        int* ptr;
        ~A() { delete ptr; }
    };

    void foo(A object_input) {}

    int main() {
        A aa;
        aa.ptr = new int(2);
        foo(aa);
        cout << *aa.ptr << endl;
        return 0;
    }`,
      promptZh: raw`下面代码的输出是什么？

    #include <iostream>
    using namespace std;

    class A {
    public:
        int* ptr;
        ~A() { delete ptr; }
    };

    void foo(A object_input) {}

    int main() {
        A aa;
        aa.ptr = new int(2);
        foo(aa);
        cout << *aa.ptr << endl;
        return 0;
    }`,
      explanation: "The function foo takes A by value, so the compiler-generated copy constructor shallow-copies ptr. The copy inside foo and aa.ptr point to the same int. When foo returns, the copied object is destroyed and deletes the int. Then aa.ptr is dangling. Dereferencing it in cout is undefined behavior. The class violates the rule of three/five: if it owns a raw pointer and defines a destructor, it also needs a copy constructor and copy assignment operator, or it should use a smart pointer/value member.",
      explanationZh: "foo 按值接收 A，因此编译器生成的拷贝构造函数会浅拷贝 ptr。foo 内部的副本和 aa.ptr 指向同一个 int。foo 返回时，副本析构并 delete 这个 int，随后 aa.ptr 变成悬空指针。再在 cout 中解引用它就是未定义行为。这个类违反了 rule of three/five：如果类拥有裸指针并定义了析构函数，就还需要定义拷贝构造和拷贝赋值，或者改用智能指针/值成员。"
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
