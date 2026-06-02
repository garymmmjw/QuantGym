import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const raw = String.raw;
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const options = parseArgs(process.argv.slice(2));
const sourcePath = path.resolve(projectRoot, options.source || "data/question-banks/green-book/problems.json");
const reportPath = path.resolve(projectRoot, options.report || "artifacts/question-bank-quality-review/green-book-batch-001-reviewed-repairs-report.json");
const payload = readJson(sourcePath, { problems: [] });
const problems = Array.isArray(payload) ? payload : payload.problems || [];
const problemById = new Map(problems.map((problem) => [String(problem.id || ""), problem]));
const reviewSource = "llm-full-major-triage-reviewed-repair-green-book-batch-001-2026-06-02";

const repairs = [
  {
    id: "green-book-problem-005",
    reason: "Chinese prompt repeated the black-card condition and omitted the red-card condition.",
    fields: {
      answer: "0",
      answerEn: "0",
      answerZh: "0",
      promptZh: "赌场用一副普通的 52 张扑克牌提供一个纸牌游戏。规则是每次翻开两张牌。对每一对牌，如果两张都是黑色，则放入庄家的牌堆；如果两张都是红色，则放入你的牌堆；如果一黑一红，则丢弃。重复这个过程，直到 52 张牌全部翻完。如果你的牌堆牌数更多，你赢得 100 美元；否则（包括平局）你什么也得不到。赌场允许你协商参加游戏愿意支付的价格。你愿意支付多少钱来玩这个游戏？",
      explanationZh: "这个赌场游戏很阴险。无论牌如何排列，你和庄家的牌堆数量最后总是相同。原因是每一对被丢弃的牌都包含一张黑牌和一张红牌，因此丢弃的红牌数和黑牌数相等。剩下进入你牌堆的红牌数，必然等于进入庄家牌堆的黑牌数。你永远不会比庄家的牌更多，所以这个游戏的价值是 0，不应付钱参加。"
    }
  },
  {
    id: "green-book-problem-010",
    reason: "Operator notation and final square-root answer were OCR-corrupted.",
    fields: {
      answer: "\\sqrt{2}",
      answerEn: "\\sqrt{2}",
      answerZh: "\\sqrt{2}",
      promptEn: raw`If
$$x \wedge x \wedge x \wedge \cdots = 2,$$
where $x\wedge y=x^y$, what is $x$?`,
      promptZh: raw`如果
$$x \wedge x \wedge x \wedge \cdots = 2,$$
其中 $x\wedge y=x^y$，求 $x$。`,
      explanation: raw`Let the infinite power tower be
$$T=x\wedge x\wedge x\wedge\cdots=x^T.$$
The problem states that $T=2$. Therefore
$$2=x^2,$$
so, taking the positive value needed for the real power tower,
$$x=\sqrt{2}.$$`,
      explanationZh: raw`设这个无限幂塔为
$$T=x\wedge x\wedge x\wedge\cdots=x^T.$$
题目给出 $T=2$。因此
$$2=x^2,$$
取实数幂塔所需的正值，得到
$$x=\sqrt{2}.$$`
    }
  },
  {
    id: "green-book-problem-025",
    reason: "LLM triage suspected an answer issue; the original pigeonhole answer is correct but needed clearer count-aware explanation.",
    fields: {
      answer: "4",
      answerEn: "4",
      answerZh: "4",
      promptZh: "你的抽屉里有 2 只红袜子、20 只黄袜子和 31 只蓝袜子。作为一名忙碌且心不在焉的学生，你随机从抽屉中抓出若干只袜子。假设每只袜子被选中的概率相同，为了保证抓到一双同色袜子，最少需要抓多少只？",
      explanation: "There are three colors. The largest number of socks you can draw without having a matching pair is one red, one yellow, and one blue, for a total of 3 socks. The next sock, no matter what color it is, must match one of those colors. Therefore 4 socks are necessary and sufficient.",
      explanationZh: "一共有三种颜色。若不出现同色的一双，最多只能各拿一只：1 只红袜、1 只黄袜、1 只蓝袜，共 3 只。再多拿第 4 只时，无论它是什么颜色，都必然与已有某只袜子同色。因此最少需要 4 只。"
    }
  },
  {
    id: "green-book-problem-041",
    reason: "L'Hospital statement and two limit calculations were OCR-corrupted; answer fields were empty.",
    fields: {
      category: "calculus",
      titleZh: "洛必达法则",
      tags: ["绿皮书", "Limits and Derivatives", "L'Hospital's rule", "limits", "calculus"],
      answer: "\\infty; 0",
      answerEn: "\\infty; 0",
      answerZh: "\\infty；0",
      promptEn: raw`Use L'Hospital's rule to evaluate the following limits:
$$\lim_{x\to\infty}\frac{e^x}{x^2},\qquad \lim_{x\to0^+}x^2\ln x.$$`,
      promptZh: raw`使用洛必达法则计算以下极限：
$$\lim_{x\to\infty}\frac{e^x}{x^2},\qquad \lim_{x\to0^+}x^2\ln x.$$`,
      explanation: raw`For the first limit, both numerator and denominator go to infinity. Applying L'Hospital's rule twice gives
$$\lim_{x\to\infty}\frac{e^x}{x^2}
=\lim_{x\to\infty}\frac{e^x}{2x}
=\lim_{x\to\infty}\frac{e^x}{2}
=\infty.$$

For the second limit, rewrite
$$x^2\ln x=\frac{\ln x}{x^{-2}}.$$
As $x\to0^+$, this has the form $-\infty/\infty$. Applying L'Hospital's rule,
$$\lim_{x\to0^+}\frac{\ln x}{x^{-2}}
=\lim_{x\to0^+}\frac{1/x}{-2x^{-3}}
=\lim_{x\to0^+}-\frac{x^2}{2}=0.$$`,
      explanationZh: raw`第一个极限中，分子和分母都趋于无穷。两次使用洛必达法则：
$$\lim_{x\to\infty}\frac{e^x}{x^2}
=\lim_{x\to\infty}\frac{e^x}{2x}
=\lim_{x\to\infty}\frac{e^x}{2}
=\infty.$$

第二个极限可改写为
$$x^2\ln x=\frac{\ln x}{x^{-2}}.$$
当 $x\to0^+$ 时，这是 $-\infty/\infty$ 型。使用洛必达法则：
$$\lim_{x\to0^+}\frac{\ln x}{x^{-2}}
=\lim_{x\to0^+}\frac{1/x}{-2x^{-3}}
=\lim_{x\to0^+}-\frac{x^2}{2}=0.$$`
    }
  },
  {
    id: "green-book-problem-042",
    reason: "Integration-by-parts notation and terminology were corrupted; answer fields were empty.",
    fields: {
      category: "calculus",
      titleEn: "A. What is the integral of ln(x)?",
      titleZh: "A. \\(\\ln(x)\\) 的积分是多少？",
      tags: ["绿皮书", "Integration", "integration by parts", "logarithm integral", "calculus"],
      answer: "x\\ln x - x + C",
      answerEn: "x\\ln x - x + C",
      answerZh: "x\\ln x - x + C",
      promptEn: "A. What is the integral of \\(\\ln(x)\\)?",
      promptZh: "A. \\(\\ln(x)\\) 的积分是多少？",
      explanation: raw`Use integration by parts with $u=\ln x$ and $dv=dx$. Then $du=dx/x$ and $v=x$. Therefore
$$\int \ln x\,dx=x\ln x-\int x\cdot\frac{1}{x}\,dx=x\ln x-x+C.$$`,
      explanationZh: raw`使用分部积分法，取 $u=\ln x$，$dv=dx$。则 $du=dx/x$，$v=x$。因此
$$\int \ln x\,dx=x\ln x-\int x\cdot\frac{1}{x}\,dx=x\ln x-x+C.$$`
    }
  },
  {
    id: "green-book-problem-043",
    reason: "Integral bounds and trigonometric-integral formulas were OCR-corrupted; answer fields were empty.",
    fields: {
      category: "calculus",
      titleEn: "B. What is the integral of sec(x) from x = 0 to x = pi/6?",
      titleZh: "B. \\(\\sec(x)\\) 从 \\(0\\) 到 \\(\\pi/6\\) 的积分是多少？",
      tags: ["绿皮书", "Integration", "secant integral", "trigonometric integral", "calculus"],
      answer: "\\ln\\sqrt{3}",
      answerEn: "\\ln\\sqrt{3}",
      answerZh: "\\ln\\sqrt{3}",
      promptEn: raw`B. What is
$$\int_0^{\pi/6}\sec x\,dx?$$`,
      promptZh: raw`B. 求
$$\int_0^{\pi/6}\sec x\,dx.$$`,
      explanation: raw`A standard antiderivative is
$$\int \sec x\,dx=\ln|\sec x+\tan x|+C.$$
Thus
$$\int_0^{\pi/6}\sec x\,dx=\ln\left(\sec\frac{\pi}{6}+\tan\frac{\pi}{6}\right)-\ln(\sec0+\tan0).$$
Since $\sec(\pi/6)=2/\sqrt3$, $\tan(\pi/6)=1/\sqrt3$, and $\sec0+\tan0=1$, the value is
$$\ln\sqrt3.$$`,
      explanationZh: raw`标准原函数为
$$\int \sec x\,dx=\ln|\sec x+\tan x|+C.$$
因此
$$\int_0^{\pi/6}\sec x\,dx=\ln\left(\sec\frac{\pi}{6}+\tan\frac{\pi}{6}\right)-\ln(\sec0+\tan0).$$
由于 $\sec(\pi/6)=2/\sqrt3$，$\tan(\pi/6)=1/\sqrt3$，且 $\sec0+\tan0=1$，所以积分值为
$$\ln\sqrt3.$$`
    }
  },
  {
    id: "green-book-problem-044",
    reason: "Steinmetz-solid formula and final volume were OCR-corrupted; answer fields were empty.",
    fields: {
      category: "calculus",
      titleZh: "A. 两个直角相交单位圆柱的交集体积是多少？",
      tags: ["绿皮书", "Integration", "Steinmetz solid", "volume integral", "calculus"],
      answer: "16/3",
      answerEn: "16/3",
      answerZh: "16/3",
      promptZh: "两个半径均为 1 的圆柱体成直角相交，并且它们的中心轴相交。求它们交集的体积。",
      explanation: raw`This is the classic Steinmetz solid. Place the two cylinders as
$$x^2+z^2\leq1,\qquad y^2+z^2\leq1.$$
At height $z$, where $-1\leq z\leq1$, the cross-section is a square:
$$-\sqrt{1-z^2}\leq x\leq\sqrt{1-z^2},\qquad -\sqrt{1-z^2}\leq y\leq\sqrt{1-z^2}.$$
Its side length is $2\sqrt{1-z^2}$, so its area is
$$A(z)=4(1-z^2).$$
Therefore
$$V=\int_{-1}^{1}4(1-z^2)\,dz=4\left[z-\frac{z^3}{3}\right]_{-1}^{1}=\frac{16}{3}.$$`,
      explanationZh: raw`这是经典的 Steinmetz solid。可将两个圆柱写成
$$x^2+z^2\leq1,\qquad y^2+z^2\leq1.$$
在高度 $z$ 处（$-1\leq z\leq1$），截面是一个正方形：
$$-\sqrt{1-z^2}\leq x\leq\sqrt{1-z^2},\qquad -\sqrt{1-z^2}\leq y\leq\sqrt{1-z^2}.$$
其边长为 $2\sqrt{1-z^2}$，面积为
$$A(z)=4(1-z^2).$$
因此
$$V=\int_{-1}^{1}4(1-z^2)\,dz=4\left[z-\frac{z^3}{3}\right]_{-1}^{1}=\frac{16}{3}.$$`
    }
  },
  {
    id: "green-book-problem-046",
    reason: "Standard-normal conditional expectation notation was corrupted and missed the final normalization.",
    fields: {
      category: "probabilityExpectation",
      answer: "\\sqrt{2/\\pi}",
      answerEn: "\\sqrt{2/\\pi}",
      answerZh: "\\sqrt{2/\\pi}",
      promptEn: raw`If $X$ is a standard normal random variable, $X\sim N(0,1)$, what is $\mathbb{E}[X\mid X>0]$?`,
      promptZh: raw`如果 $X$ 是标准正态随机变量，$X\sim N(0,1)$，求 $\mathbb{E}[X\mid X>0]$。`,
      explanation: raw`The standard normal density is
$$f(x)=\frac{1}{\sqrt{2\pi}}e^{-x^2/2}.$$
Since $\mathbb{P}(X>0)=1/2$,
$$\mathbb{E}[X\mid X>0]=\frac{\int_0^\infty x f(x)\,dx}{1/2}.$$
The numerator is
$$\int_0^\infty x\frac{1}{\sqrt{2\pi}}e^{-x^2/2}\,dx=\frac{1}{\sqrt{2\pi}},$$
using $u=-x^2/2$. Therefore
$$\mathbb{E}[X\mid X>0]=\frac{1/\sqrt{2\pi}}{1/2}=\sqrt{\frac{2}{\pi}}.$$`,
      explanationZh: raw`标准正态密度为
$$f(x)=\frac{1}{\sqrt{2\pi}}e^{-x^2/2}.$$
由于 $\mathbb{P}(X>0)=1/2$，
$$\mathbb{E}[X\mid X>0]=\frac{\int_0^\infty x f(x)\,dx}{1/2}.$$
分子为
$$\int_0^\infty x\frac{1}{\sqrt{2\pi}}e^{-x^2/2}\,dx=\frac{1}{\sqrt{2\pi}},$$
其中使用代换 $u=-x^2/2$。因此
$$\mathbb{E}[X\mid X>0]=\frac{1/\sqrt{2\pi}}{1/2}=\sqrt{\frac{2}{\pi}}.$$`
    }
  },
  {
    id: "green-book-problem-048",
    reason: "The question is about i^i; title, notation, and Euler-formula proof were OCR-corrupted.",
    fields: {
      category: "complexNumbers",
      titleEn: "A. What is i^i?",
      titleZh: "A. \\(i^i\\) 是多少？",
      tags: ["绿皮书", "Important Calculus Methods", "complex numbers", "Euler's formula", "principal logarithm"],
      answer: "e^{-\\pi/2}",
      answerEn: "e^{-\\pi/2}",
      answerZh: "e^{-\\pi/2}",
      promptEn: "A. What is \\(i^i\\)?",
      promptZh: "A. \\(i^i\\) 是多少？",
      explanation: raw`Using Euler's formula,
$$e^{i\theta}=\cos\theta+i\sin\theta.$$
Taking $\theta=\pi/2$ gives
$$i=e^{i\pi/2}.$$
Using the principal logarithm, $\log i=i\pi/2$. Hence
$$i^i=e^{i\log i}=e^{i(i\pi/2)}=e^{-\pi/2}.$$`,
      explanationZh: raw`由欧拉公式，
$$e^{i\theta}=\cos\theta+i\sin\theta.$$
取 $\theta=\pi/2$，得到
$$i=e^{i\pi/2}.$$
使用主值对数，$\log i=i\pi/2$。因此
$$i^i=e^{i\log i}=e^{i(i\pi/2)}=e^{-\pi/2}.$$`
    }
  },
  {
    id: "green-book-problem-049",
    reason: "Bernoulli inequality prompt and proof were OCR-corrupted.",
    fields: {
      category: "algebra",
      titleEn: "B. Prove (1+x)^n >= 1+nx for x > -1 and integers n >= 2.",
      titleZh: "B. 证明当 \\(x>-1\\)、整数 \\(n\\ge2\\) 时，\\((1+x)^n\\ge1+nx\\)。",
      tags: ["绿皮书", "Important Calculus Methods", "Bernoulli inequality", "inequality", "induction"],
      answer: "By Bernoulli's inequality, (1+x)^n >= 1+nx for x > -1 and integer n >= 2.",
      answerEn: "By Bernoulli's inequality, (1+x)^n >= 1+nx for x > -1 and integer n >= 2.",
      answerZh: "由伯努利不等式，当 x > -1 且整数 n >= 2 时，(1+x)^n >= 1+nx。",
      promptEn: raw`B. Prove that
$$(1+x)^n\geq 1+nx$$
for all $x>-1$ and all integers $n\geq2$.`,
      promptZh: raw`B. 证明对所有 $x>-1$ 和所有整数 $n\geq2$，
$$(1+x)^n\geq 1+nx.$$`,
      explanation: raw`Use induction on $n$. For $n=2$,
$$(1+x)^2=1+2x+x^2\geq1+2x.$$
Assume $(1+x)^k\geq1+kx$ for some $k\geq2$. Because $x>-1$, we have $1+x>0$, so multiplying by $1+x$ preserves the inequality:
$$(1+x)^{k+1}\geq(1+kx)(1+x)=1+(k+1)x+kx^2\geq1+(k+1)x.$$
Thus the result holds for every integer $n\geq2$.`,
      explanationZh: raw`对 $n$ 使用归纳法。$n=2$ 时，
$$(1+x)^2=1+2x+x^2\geq1+2x.$$
假设对某个 $k\geq2$ 有 $(1+x)^k\geq1+kx$。由于 $x>-1$，所以 $1+x>0$，两边乘以 $1+x$ 保持不等号方向：
$$(1+x)^{k+1}\geq(1+kx)(1+x)=1+(k+1)x+kx^2\geq1+(k+1)x.$$
因此结论对所有整数 $n\geq2$ 成立。`
    }
  },
  {
    id: "green-book-problem-054",
    reason: "Differential equation and substitution solution were OCR-corrupted.",
    fields: {
      category: "calculus",
      titleEn: "B. Solve the ordinary differential equation y' = (x-y)/(x+y).",
      titleZh: "B. 求解常微分方程 \\(y'=(x-y)/(x+y)\\)。",
      tags: ["绿皮书", "Ordinary Differential Equations", "ordinary differential equation", "substitution", "calculus"],
      answer: "(x+y)^2 = 2x^2 + C",
      answerEn: "(x+y)^2 = 2x^2 + C",
      answerZh: "(x+y)^2 = 2x^2 + C",
      promptEn: raw`B. Solve the ordinary differential equation
$$y'=\frac{x-y}{x+y}.$$`,
      promptZh: raw`B. 求解常微分方程
$$y'=\frac{x-y}{x+y}.$$`,
      explanation: raw`Let $z=x+y$, so $y=z-x$ and $y'=z'-1$. Substituting into the differential equation gives
$$z'-1=\frac{x-(z-x)}{z}=\frac{2x-z}{z}=\frac{2x}{z}-1.$$
Thus
$$z'=\frac{2x}{z},$$
or
$$z\,dz=2x\,dx.$$
Integrating,
$$z^2=2x^2+C.$$
Since $z=x+y$, the implicit solution is
$$(x+y)^2=2x^2+C.$$`,
      explanationZh: raw`令 $z=x+y$，则 $y=z-x$ 且 $y'=z'-1$。代入微分方程：
$$z'-1=\frac{x-(z-x)}{z}=\frac{2x-z}{z}=\frac{2x}{z}-1.$$
因此
$$z'=\frac{2x}{z},$$
即
$$z\,dz=2x\,dx.$$
积分得
$$z^2=2x^2+C.$$
由于 $z=x+y$，隐式解为
$$(x+y)^2=2x^2+C.$$`
    }
  },
  {
    id: "green-book-problem-060",
    reason: "Matrix prompt and eigenvector notation were OCR-corrupted.",
    fields: {
      category: "linearAlgebra",
      tags: ["绿皮书", "Linear Algebra", "matrix", "eigenvalues", "eigenvectors"],
      answer: "Eigenvalues 3 and 1; eigenvectors proportional to (1,1)^T and (1,-1)^T.",
      answerEn: "Eigenvalues 3 and 1; eigenvectors proportional to (1,1)^T and (1,-1)^T.",
      answerZh: "特征值为 3 和 1；对应特征向量分别与 (1,1)^T 和 (1,-1)^T 成比例。",
      promptEn: raw`For
$$A=\begin{pmatrix}2&1\\1&2\end{pmatrix},$$
find the eigenvalues and eigenvectors of $A$.`,
      promptZh: raw`给定
$$A=\begin{pmatrix}2&1\\1&2\end{pmatrix},$$
求 $A$ 的特征值和特征向量。`,
      explanation: raw`The characteristic equation is
$$\det(A-\lambda I)=\det\begin{pmatrix}2-\lambda&1\\1&2-\lambda\end{pmatrix}=(2-\lambda)^2-1=0.$$
Thus $\lambda=3$ or $\lambda=1$.

For $\lambda=3$, $(A-3I)x=0$ gives $x_1=x_2$, so an eigenvector is $(1,1)^T$; normalized, it is $(1/\sqrt2,1/\sqrt2)^T$.

For $\lambda=1$, $(A-I)x=0$ gives $x_1=-x_2$, so an eigenvector is $(1,-1)^T$; normalized, it is $(1/\sqrt2,-1/\sqrt2)^T$.`,
      explanationZh: raw`特征方程为
$$\det(A-\lambda I)=\det\begin{pmatrix}2-\lambda&1\\1&2-\lambda\end{pmatrix}=(2-\lambda)^2-1=0.$$
因此 $\lambda=3$ 或 $\lambda=1$。

当 $\lambda=3$ 时，$(A-3I)x=0$ 给出 $x_1=x_2$，所以一个特征向量是 $(1,1)^T$；归一化后为 $(1/\sqrt2,1/\sqrt2)^T$。

当 $\lambda=1$ 时，$(A-I)x=0$ 给出 $x_1=-x_2$，所以一个特征向量是 $(1,-1)^T$；归一化后为 $(1/\sqrt2,-1/\sqrt2)^T$。`
    }
  },
  {
    id: "green-book-problem-061",
    reason: "Correlation-matrix determinant expression was OCR-corrupted; answer fields were empty.",
    fields: {
      category: "statistics",
      tags: ["绿皮书", "Linear Algebra", "correlation matrix", "positive semidefinite", "statistics"],
      answer: "Minimum: 0.28; maximum: 1",
      answerEn: "Minimum: 0.28; maximum: 1",
      answerZh: "最小值：0.28；最大值：1",
      promptEn: "There are three random variables x, y, and z. The correlation between x and y is 0.8, and the correlation between x and z is 0.8. What are the maximum and minimum possible correlations between y and z?",
      promptZh: "有三个随机变量 x、y 和 z。x 与 y 的相关系数为 0.8，x 与 z 的相关系数为 0.8。y 与 z 的最大和最小可能相关系数是多少？",
      explanation: raw`Let $\rho$ be the correlation between $y$ and $z$. The correlation matrix is
$$R=\begin{pmatrix}1&0.8&0.8\\0.8&1&\rho\\0.8&\rho&1\end{pmatrix}.$$
It must be positive semidefinite, so $\det(R)\geq0$. Computing the determinant,
$$\det(R)=1+2(0.8)(0.8)\rho-0.8^2-0.8^2-\rho^2=-0.28+1.28\rho-\rho^2.$$
Thus
$$-\rho^2+1.28\rho-0.28\geq0,$$
or
$$\rho^2-1.28\rho+0.28\leq0.$$
The roots are $0.28$ and $1$, so
$$0.28\leq\rho\leq1.$$`,
      explanationZh: raw`设 $y$ 与 $z$ 的相关系数为 $\rho$。相关矩阵为
$$R=\begin{pmatrix}1&0.8&0.8\\0.8&1&\rho\\0.8&\rho&1\end{pmatrix}.$$
相关矩阵必须半正定，所以 $\det(R)\geq0$。计算行列式：
$$\det(R)=1+2(0.8)(0.8)\rho-0.8^2-0.8^2-\rho^2=-0.28+1.28\rho-\rho^2.$$
因此
$$-\rho^2+1.28\rho-0.28\geq0,$$
即
$$\rho^2-1.28\rho+0.28\leq0.$$
两个根为 $0.28$ 和 $1$，所以
$$0.28\leq\rho\leq1.$$`
    }
  },
  {
    id: "green-book-problem-073",
    reason: "Radical notation and integer argument were OCR-corrupted.",
    fields: {
      answer: "9",
      answerEn: "9",
      answerZh: "9",
      promptEn: raw`What is the 100th digit to the right of the decimal point in the decimal representation of $(1+\sqrt2)^{3000}$?`,
      promptZh: raw`$(1+\sqrt2)^{3000}$ 的十进制表示中，小数点右侧第 100 位数字是多少？`,
      explanation: raw`For every positive integer $n$,
$$(1+\sqrt2)^n+(1-\sqrt2)^n$$
is an integer, because the irrational terms cancel in the binomial expansion.

When $n=3000$, the term $(1-\sqrt2)^{3000}$ is positive and extremely small:
$$0<(1-\sqrt2)^{3000}<10^{-100}.$$
Therefore $(1+\sqrt2)^{3000}$ is an integer minus a tiny positive number smaller than $10^{-100}$. Its first 100 digits after the decimal point are all $9$, so the 100th digit is $9$.`,
      explanationZh: raw`对任意正整数 $n$，
$$(1+\sqrt2)^n+(1-\sqrt2)^n$$
都是整数，因为二项展开中的无理项会相互抵消。

当 $n=3000$ 时，$(1-\sqrt2)^{3000}$ 为正且极小：
$$0<(1-\sqrt2)^{3000}<10^{-100}.$$
因此 $(1+\sqrt2)^{3000}$ 等于某个整数减去一个小于 $10^{-100}$ 的正数。它小数点后的前 100 位都是 $9$，所以第 100 位数字是 $9$。`
    }
  },
  {
    id: "green-book-problem-081",
    reason: "Birthday-line probability ratios were garbled; answer fields were empty.",
    fields: {
      answer: "20th",
      answerEn: "20th",
      answerZh: "第 20 位",
      promptZh: "在一家电影院，一位经理宣布：她会把一张免费票送给队伍中第一个生日与已经买过票的人相同的人。你可以选择自己在队伍中的任意位置。假设你不知道其他人的生日，并且生日在一年 365 天中均匀随机分布，那么你站在第几位最有可能拿到免费票？",
      explanation: raw`Suppose you choose position $n$. You get the ticket exactly when the first $n-1$ birthdays are all distinct and your birthday matches one of them. Thus
$$p(n)=\frac{365\cdot364\cdots(365-n+2)}{365^{n-1}}\cdot\frac{n-1}{365}.$$
Compare consecutive probabilities:
$$\frac{p(n+1)}{p(n)}=\frac{365-(n-1)}{365}\cdot\frac{n}{n-1}=\frac{n(366-n)}{365(n-1)}.$$
This ratio is greater than $1$ through $n=19$ and less than $1$ at $n=20$. Hence $p(n)$ is maximized at $n=20$.`,
      explanationZh: raw`假设你选择第 $n$ 位。你拿到票，当且仅当前 $n-1$ 个人生日互不相同，并且你的生日与其中某个人相同。因此
$$p(n)=\frac{365\cdot364\cdots(365-n+2)}{365^{n-1}}\cdot\frac{n-1}{365}.$$
比较相邻概率：
$$\frac{p(n+1)}{p(n)}=\frac{365-(n-1)}{365}\cdot\frac{n}{n-1}=\frac{n(366-n)}{365(n-1)}.$$
这个比值到 $n=19$ 时仍大于 $1$，到 $n=20$ 时小于 $1$。因此 $p(n)$ 在 $n=20$ 处最大。`
    }
  },
  {
    id: "green-book-problem-082",
    reason: "Final probability was truncated.",
    fields: {
      answer: "5/54",
      answerEn: "5/54",
      answerZh: "5/54",
      promptZh: "依次掷 3 个骰子。得到的 3 个点数严格递增的概率是多少？",
      explanation: raw`There are $6^3=216$ equally likely ordered outcomes. A strictly increasing triple is determined by choosing any 3 distinct faces from the 6 faces and arranging them in increasing order. Thus the number of favorable outcomes is
$$\binom{6}{3}=20.$$
Therefore the probability is
$$\frac{20}{216}=\frac{5}{54}.$$`,
      explanationZh: raw`共有 $6^3=216$ 个等可能的有序结果。一个严格递增的三元组，只需从 6 个点数中选出 3 个不同点数，并按递增顺序排列即可。因此有利结果数为
$$\binom{6}{3}=20.$$
概率为
$$\frac{20}{216}=\frac{5}{54}.$$`
    }
  },
  {
    id: "green-book-problem-085",
    reason: "Candy counts and final probability were OCR-corrupted.",
    fields: {
      answer: "7/12",
      answerEn: "7/12",
      answerZh: "7/12",
      promptEn: "You are taking candies one by one from a jar that has 10 red candies, 20 blue candies, and 30 green candies in it. What is the probability that there is at least 1 blue candy and 1 green candy left in the jar when you have taken out all the red candies?",
      promptZh: "一个罐子里有 10 颗红糖、20 颗蓝糖和 30 颗绿糖。你从罐子里一颗一颗不放回地取糖。当所有红糖都被取出时，罐子里至少还剩 1 颗蓝糖和 1 颗绿糖的概率是多少？",
      explanation: raw`Think of the draw order as a random permutation of the candies. We need the last red candy to appear before the last blue candy and before the last green candy.

If the absolute last candy is green, which has probability $30/60$, then among the red and blue candies, the last one must be blue. That conditional probability is $20/(10+20)=20/30$.

If the absolute last candy is blue, which has probability $20/60$, then among the red and green candies, the last one must be green. That conditional probability is $30/(10+30)=30/40$.

Therefore
$$\frac{30}{60}\cdot\frac{20}{30}+\frac{20}{60}\cdot\frac{30}{40}=\frac{7}{12}.$$`,
      explanationZh: raw`把取糖顺序看成糖果的一个随机排列。我们需要最后一颗红糖早于最后一颗蓝糖，也早于最后一颗绿糖。

如果绝对最后一颗糖是绿色，概率为 $30/60$，那么在红糖和蓝糖中，最后出现的必须是蓝糖。这个条件概率为 $20/(10+20)=20/30$。

如果绝对最后一颗糖是蓝色，概率为 $20/60$，那么在红糖和绿糖中，最后出现的必须是绿糖。这个条件概率为 $30/(10+30)=30/40$。

因此概率为
$$\frac{30}{60}\cdot\frac{20}{30}+\frac{20}{60}\cdot\frac{30}{40}=\frac{7}{12}.$$`
    }
  },
  {
    id: "green-book-problem-091",
    reason: "Counting expression was truncated; answer fields were empty.",
    fields: {
      answer: "2197/20825",
      answerEn: "2197/20825",
      answerZh: "2197/20825",
      explanation: raw`Reveal where the four aces are dealt. The first ace can be anywhere. For the second ace to be in a different player's hand, it must fall in one of the $39$ cards outside the first ace's 13-card hand, among the remaining $51$ card positions. Given that, for the third ace to be in a third hand, it must fall in one of $26$ positions among the remaining $50$. Finally, the fourth ace must fall in the last remaining player's $13$ positions among the remaining $49$.

Thus the probability is
$$1\cdot\frac{39}{51}\cdot\frac{26}{50}\cdot\frac{13}{49}=\frac{2197}{20825}.$$`,
      explanationZh: raw`只需看四张 A 被发到哪里。第一张 A 可以在任意位置。第二张 A 要与第一张 A 在不同玩家手中，必须落在第一张 A 所在 13 张手牌之外的 $39$ 个位置中，而剩余位置共有 $51$ 个。在此条件下，第三张 A 要落在第三个玩家手中，必须落在剩余 $50$ 个位置中的 $26$ 个位置之一。最后，第四张 A 必须落在最后一个玩家剩余的 $13$ 个位置中，而总剩余位置为 $49$。

因此概率为
$$1\cdot\frac{39}{51}\cdot\frac{26}{50}\cdot\frac{13}{49}=\frac{2197}{20825}.$$`
    }
  },
  {
    id: "green-book-problem-092",
    reason: "Gambler's ruin formula was garbled and Chinese prompt was mistranslated.",
    fields: {
      answer: "(1-(q/p)^i)/(1-(q/p)^N), p != q; i/N when p=q=1/2",
      answerEn: "(1-(q/p)^i)/(1-(q/p)^N), p != q; i/N when p=q=1/2",
      answerZh: "当 p != q 时为 (1-(q/p)^i)/(1-(q/p)^N)；当 p=q=1/2 时为 i/N",
      promptZh: "一名赌徒初始有 i 美元。每局游戏中，他以概率 p（0 < p < 1）赢得 1 美元，以概率 q = 1 - p 输掉 1 美元。当他的财富达到 N 美元或变为 0 时停止。求他最终达到 N 美元的概率。",
      explanation: raw`Let $P_i$ be the probability of reaching $N$ before $0$ when starting with $i$ dollars. Then
$$P_i=pP_{i+1}+qP_{i-1},\qquad P_0=0,\quad P_N=1.$$
For $p\neq q$, solving this second-order difference equation gives
$$P_i=\frac{1-(q/p)^i}{1-(q/p)^N}.$$
For the fair case $p=q=1/2$, the solution is linear:
$$P_i=\frac{i}{N}.$$`,
      explanationZh: raw`令 $P_i$ 表示从 $i$ 美元出发，先达到 $N$ 而不是先到 $0$ 的概率。则
$$P_i=pP_{i+1}+qP_{i-1},\qquad P_0=0,\quad P_N=1.$$
当 $p\neq q$ 时，解这个二阶差分方程得到
$$P_i=\frac{1-(q/p)^i}{1-(q/p)^N}.$$
当公平情形 $p=q=1/2$ 时，解为线性函数：
$$P_i=\frac{i}{N}.$$`
    }
  },
  {
    id: "green-book-problem-093",
    reason: "Pólya urn induction notation and final probability were OCR-corrupted.",
    fields: {
      answer: "1/99",
      answerEn: "1/99",
      answerZh: "1/99",
      promptZh: "一名篮球运动员罚球 100 次。球进得 1 分，没进得 0 分。她第一次罚球命中，第二次罚球未中。之后每次罚球命中的概率等于她到目前为止的命中比例。例如，如果第 40 次罚球后她命中 23 次，则第 41 次命中的概率为 23/40。100 次罚球后（包括前两次），她恰好命中 50 次的概率是多少？",
      explanation: raw`After the first two throws, the process is the classic Pólya urn with one success and one failure. Let $P_{n,k}$ be the probability of having $k$ successes after $n$ throws. We claim that for $n\geq2$,
$$P_{n,k}=\frac{1}{n-1},\qquad k=1,2,\ldots,n-1.$$
This is true for $n=2$. If it holds at time $n$, then
$$P_{n+1,k}=P_{n,k}\left(1-\frac{k}{n}\right)+P_{n,k-1}\frac{k-1}{n}
=\frac{1}{n-1}\cdot\frac{n-k}{n}+\frac{1}{n-1}\cdot\frac{k-1}{n}
=\frac{1}{n}.$$
Thus the number of successes after 100 throws is uniform over $1,2,\ldots,99$, so
$$P_{100,50}=\frac{1}{99}.$$`,
      explanationZh: raw`前两次罚球之后，这个过程等价于经典的 Pólya urn：初始有一个成功和一个失败。令 $P_{n,k}$ 表示 $n$ 次罚球后共有 $k$ 次命中的概率。我们断言对 $n\geq2$，
$$P_{n,k}=\frac{1}{n-1},\qquad k=1,2,\ldots,n-1.$$
这在 $n=2$ 时显然成立。若在 $n$ 时刻成立，则
$$P_{n+1,k}=P_{n,k}\left(1-\frac{k}{n}\right)+P_{n,k-1}\frac{k-1}{n}
=\frac{1}{n-1}\cdot\frac{n-k}{n}+\frac{1}{n-1}\cdot\frac{k-1}{n}
=\frac{1}{n}.$$
因此 100 次罚球后的命中次数在 $1,2,\ldots,99$ 上均匀分布，所以
$$P_{100,50}=\frac{1}{99}.$$`
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
