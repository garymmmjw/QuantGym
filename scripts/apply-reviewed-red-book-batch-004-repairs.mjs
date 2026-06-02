import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const raw = String.raw;
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const options = parseArgs(process.argv.slice(2));
const sourcePath = path.resolve(projectRoot, options.source || "data/question-banks/red-book/problems.json");
const reportPath = path.resolve(projectRoot, options.report || "artifacts/question-bank-quality-review/red-book-batch-004-reviewed-repairs-report.json");
const payload = readJson(sourcePath, { problems: [] });
const problems = Array.isArray(payload) ? payload : payload.problems || [];
const problemById = new Map(problems.map((problem) => [String(problem.id || ""), problem]));
const reviewSource = "llm-full-major-triage-reviewed-repair-red-book-batch-004-2026-06-02";

const calculusTags = [
  "红宝书 Quant Job Interview Questions And Answers",
  "Chapter 6",
  "Mathematics",
  "Calculus",
  "calculus"
];
const algebraTags = [
  "红宝书 Quant Job Interview Questions And Answers",
  "Chapter 6",
  "Mathematics",
  "Algebra",
  "continued-fraction"
];
const linearAlgebraTags = [
  "红宝书 Quant Job Interview Questions And Answers",
  "Chapter 6",
  "Mathematics",
  "Linear Algebra",
  "matrix"
];
const puzzleTags = [
  "红宝书 Quant Job Interview Questions And Answers",
  "Chapter 8",
  "Logic/Brainteasers",
  "Mental Math",
  "puzzle"
];

const repairs = [
  {
    id: "red-book-problem-137",
    reason: "Limit expression was OCR-corrupted and had no direct answer.",
    fields: {
      titleEn: "Question 6.2 - Limit of sqrt(x^2 + 5x) minus x",
      titleZh: "问题 6.2 - sqrt(x^2 + 5x) 减 x 的极限",
      category: "calculus",
      tags: calculusTags,
      answer: raw`$$\lim_{x\to\infty}\left(\sqrt{x^2+5x}-x\right)=\frac52.$$`,
      answerZh: raw`$$\lim_{x\to\infty}\left(\sqrt{x^2+5x}-x\right)=\frac52.$$`,
      promptEn: raw`Evaluate
$$\lim_{x\to\infty}\left(\sqrt{x^2+5x}-x\right).$$`,
      promptZh: raw`计算
$$\lim_{x\to\infty}\left(\sqrt{x^2+5x}-x\right).$$`,
      explanation: raw`Rationalize the expression:
$$\sqrt{x^2+5x}-x
=\frac{x^2+5x-x^2}{\sqrt{x^2+5x}+x}
=\frac{5x}{\sqrt{x^2+5x}+x}.$$
For $x>0$, divide numerator and denominator by $x$:
$$\frac{5}{\sqrt{1+5/x}+1}.$$
As $x\to\infty$, $5/x\to0$, so the limit is
$$\frac{5}{1+1}=\frac52.$$`,
      explanationZh: raw`先有理化：
$$\sqrt{x^2+5x}-x
=\frac{x^2+5x-x^2}{\sqrt{x^2+5x}+x}
=\frac{5x}{\sqrt{x^2+5x}+x}.$$
当 $x>0$ 时，分子分母同除以 $x$：
$$\frac{5}{\sqrt{1+5/x}+1}.$$
当 $x\to\infty$ 时，$5/x\to0$，所以极限为
$$\frac{5}{1+1}=\frac52.$$`
    }
  },
  {
    id: "red-book-problem-141",
    reason: "Exponent notation was corrupted and the final comparison was not stated cleanly.",
    fields: {
      titleEn: "Question 6.6 - Compare e^7 and 7^e",
      titleZh: "问题 6.6 - 比较 e^7 和 7^e",
      category: "algebra",
      tags: [
        "红宝书 Quant Job Interview Questions And Answers",
        "Chapter 6",
        "Mathematics",
        "Algebra",
        "inequality"
      ],
      answer: raw`$$e^7>7^e.$$`,
      answerZh: raw`$$e^7>7^e.$$`,
      promptEn: raw`Which is larger, $e^7$ or $7^e$? Prove it mathematically.`,
      promptZh: raw`$e^7$ 和 $7^e$ 哪个更大？请用数学方法证明。`,
      explanation: raw`Taking logarithms, compare
$$\log(e^7)=7$$
with
$$\log(7^e)=e\log 7.$$
Now consider
$$f(x)=\frac{\log x}{x}.$$
Its derivative is
$$f'(x)=\frac{1-\log x}{x^2},$$
so $f$ is decreasing for $x>e$. Since $7>e$,
$$\frac{\log 7}{7}<\frac{\log e}{e}=\frac1e.$$
Multiplying by $7e$ gives
$$e\log 7<7.$$
Therefore
$$\log(7^e)<\log(e^7),$$
and hence $e^7>7^e$.`,
      explanationZh: raw`取对数后，只需比较
$$\log(e^7)=7$$
和
$$\log(7^e)=e\log 7.$$
考虑函数
$$f(x)=\frac{\log x}{x}.$$
其导数为
$$f'(x)=\frac{1-\log x}{x^2},$$
因此当 $x>e$ 时，$f$ 单调递减。由于 $7>e$，
$$\frac{\log 7}{7}<\frac{\log e}{e}=\frac1e.$$
两边乘以 $7e$ 得
$$e\log 7<7.$$
所以
$$\log(7^e)<\log(e^7),$$
从而 $e^7>7^e$。`
    }
  },
  {
    id: "red-book-problem-142",
    reason: "Continued fraction prompt was unreadable.",
    fields: {
      titleEn: "Question 6.7 - Evaluate a repeating continued fraction",
      titleZh: "问题 6.7 - 计算重复连分数",
      category: "algebra",
      tags: algebraTags,
      answer: raw`For
$$2+\frac{2}{2+\frac{2}{2+\cdots}},$$
the value is
$$1+\sqrt3.$$`,
      answerZh: raw`对
$$2+\frac{2}{2+\frac{2}{2+\cdots}},$$
其值为
$$1+\sqrt3.$$`,
      promptEn: raw`Evaluate the continued fraction
$$2+\frac{2}{2+\frac{2}{2+\cdots}}.$$`,
      promptZh: raw`计算连分数
$$2+\frac{2}{2+\frac{2}{2+\cdots}}.$$`,
      explanation: raw`Let the value of the continued fraction be $y$. Because the tail after the first denominator repeats the whole expression,
$$y=2+\frac{2}{y}.$$
Multiplying by $y$ gives
$$y^2-2y-2=0.$$
The two algebraic roots are
$$y=1\pm\sqrt3.$$
The continued fraction is clearly greater than $2$, so the valid root is
$$y=1+\sqrt3.$$`,
      explanationZh: raw`设该连分数的值为 $y$。由于第一个分母之后的尾部仍然是同一个表达式，
$$y=2+\frac{2}{y}.$$
两边乘以 $y$：
$$y^2-2y-2=0.$$
代数根为
$$y=1\pm\sqrt3.$$
原连分数显然大于 $2$，所以取
$$y=1+\sqrt3.$$`
    }
  },
  {
    id: "red-book-problem-145",
    reason: "Matrix square-root/Cholesky prompt and formulas were incomplete.",
    fields: {
      titleEn: "Question 6.10 - Matrix square root and Cholesky factor",
      titleZh: "问题 6.10 - 矩阵平方根和 Cholesky 因子",
      category: "linearAlgebra",
      tags: linearAlgebraTags,
      answer: raw`For
$$A=\begin{pmatrix}5&-3\\-3&5\end{pmatrix},$$
one symmetric square root is
$$M=\frac{\sqrt2}{2}\begin{pmatrix}3&-1\\-1&3\end{pmatrix},\qquad M^2=A.$$
One upper-triangular factor satisfying $A=C^TC$ is
$$C=\begin{pmatrix}\sqrt5&-3/\sqrt5\\0&4/\sqrt5\end{pmatrix}.$$`,
      answerZh: raw`对
$$A=\begin{pmatrix}5&-3\\-3&5\end{pmatrix},$$
一个对称平方根为
$$M=\frac{\sqrt2}{2}\begin{pmatrix}3&-1\\-1&3\end{pmatrix},\qquad M^2=A.$$
一个满足 $A=C^TC$ 的上三角因子为
$$C=\begin{pmatrix}\sqrt5&-3/\sqrt5\\0&4/\sqrt5\end{pmatrix}.$$`,
      promptEn: raw`Given
$$A=\begin{pmatrix}5&-3\\-3&5\end{pmatrix},$$
find a matrix $M$ such that $A=M^2$. Then find a matrix $C$ such that $A=C^TC$.`,
      promptZh: raw`给定
$$A=\begin{pmatrix}5&-3\\-3&5\end{pmatrix},$$
求矩阵 $M$ 使 $A=M^2$。再求矩阵 $C$ 使 $A=C^TC$。`,
      explanation: raw`For the square root, observe that
$$B=\begin{pmatrix}3&-1\\-1&3\end{pmatrix}$$
satisfies
$$B^2=\begin{pmatrix}10&-6\\-6&10\end{pmatrix}=2A.$$
Therefore
$$M=\frac{1}{\sqrt2}B
=\frac{\sqrt2}{2}\begin{pmatrix}3&-1\\-1&3\end{pmatrix}$$
satisfies $M^2=A$.

For $A=C^TC$, take an upper-triangular Cholesky factor
$$C=\begin{pmatrix}a&b\\0&d\end{pmatrix}.$$
Then
$$C^TC=\begin{pmatrix}a^2&ab\\ab&b^2+d^2\end{pmatrix}.$$
Set $a=\sqrt5$, $b=-3/\sqrt5$, and $d=4/\sqrt5$. This gives $a^2=5$, $ab=-3$, and $b^2+d^2=9/5+16/5=5$.`,
      explanationZh: raw`对平方根，注意
$$B=\begin{pmatrix}3&-1\\-1&3\end{pmatrix}$$
满足
$$B^2=\begin{pmatrix}10&-6\\-6&10\end{pmatrix}=2A.$$
因此
$$M=\frac{1}{\sqrt2}B
=\frac{\sqrt2}{2}\begin{pmatrix}3&-1\\-1&3\end{pmatrix}$$
满足 $M^2=A$。

对 $A=C^TC$，取上三角 Cholesky 因子
$$C=\begin{pmatrix}a&b\\0&d\end{pmatrix}.$$
则
$$C^TC=\begin{pmatrix}a^2&ab\\ab&b^2+d^2\end{pmatrix}.$$
令 $a=\sqrt5$，$b=-3/\sqrt5$，$d=4/\sqrt5$，即可得到 $a^2=5$，$ab=-3$，且 $b^2+d^2=9/5+16/5=5$。`
    }
  },
  {
    id: "red-book-problem-153",
    reason: "Derivative of x^x was garbled and categorized incorrectly.",
    fields: {
      titleEn: "Question 6.18 - Derivative of x^x",
      titleZh: "问题 6.18 - x^x 的导数",
      category: "calculus",
      tags: calculusTags,
      answer: raw`For $x>0$,
$$\frac{d}{dx}x^x=x^x(\log x+1).$$`,
      answerZh: raw`对 $x>0$，
$$\frac{d}{dx}x^x=x^x(\log x+1).$$`,
      promptEn: raw`What is the derivative of $f(x)=x^x$?`,
      promptZh: raw`函数 $f(x)=x^x$ 的导数是什么？`,
      explanation: raw`Rewrite
$$x^x=e^{x\log x},\qquad x>0.$$
Using the chain rule and product rule,
$$\frac{d}{dx}e^{x\log x}
=e^{x\log x}\frac{d}{dx}(x\log x)
=x^x(\log x+1).$$`,
      explanationZh: raw`先写成
$$x^x=e^{x\log x},\qquad x>0.$$
由链式法则和乘积法则，
$$\frac{d}{dx}e^{x\log x}
=e^{x\log x}\frac{d}{dx}(x\log x)
=x^x(\log x+1).$$`
    }
  },
  {
    id: "red-book-problem-154",
    reason: "Discount-factor derivative formulas were OCR-corrupted.",
    fields: {
      titleEn: "Question 6.19 - Differentiate discount-factor formulas",
      titleZh: "问题 6.19 - 对贴现因子公式求导",
      category: "calculus",
      tags: calculusTags,
      answer: raw`The two derivatives are
$$\frac{\partial}{\partial r}\left(1+\frac{r}{n}\right)^{-n}
=-\left(1+\frac{r}{n}\right)^{-n-1},$$
and, for independent forward rates,
$$\frac{\partial}{\partial f_i}\prod_j\frac{1}{1+f_jt_j}
=-\frac{t_i}{1+f_it_i}\prod_j\frac{1}{1+f_jt_j}.$$`,
      answerZh: raw`两个导数为
$$\frac{\partial}{\partial r}\left(1+\frac{r}{n}\right)^{-n}
=-\left(1+\frac{r}{n}\right)^{-n-1},$$
以及在各远期利率相互独立时，
$$\frac{\partial}{\partial f_i}\prod_j\frac{1}{1+f_jt_j}
=-\frac{t_i}{1+f_it_i}\prod_j\frac{1}{1+f_jt_j}.$$`,
      promptEn: raw`Compute
$$\frac{\partial}{\partial r}\left(1+\frac{r}{n}\right)^{-n}$$
and
$$\frac{\partial}{\partial f_i}\prod_j\frac{1}{1+f_jt_j}.$$`,
      promptZh: raw`计算
$$\frac{\partial}{\partial r}\left(1+\frac{r}{n}\right)^{-n}$$
以及
$$\frac{\partial}{\partial f_i}\prod_j\frac{1}{1+f_jt_j}.$$`,
      explanation: raw`For the first expression, apply the chain rule:
$$\frac{\partial}{\partial r}\left(1+\frac{r}{n}\right)^{-n}
=-n\left(1+\frac{r}{n}\right)^{-n-1}\frac1n
=-\left(1+\frac{r}{n}\right)^{-n-1}.$$

For the product, only the factor involving $f_i$ changes with $f_i$. Hence
$$\frac{\partial}{\partial f_i}\prod_j\frac{1}{1+f_jt_j}
=\left(-\frac{t_i}{(1+f_it_i)^2}\right)\prod_{j\ne i}\frac{1}{1+f_jt_j}.$$
Equivalently,
$$-\frac{t_i}{1+f_it_i}\prod_j\frac{1}{1+f_jt_j}.$$`,
      explanationZh: raw`第一个式子直接用链式法则：
$$\frac{\partial}{\partial r}\left(1+\frac{r}{n}\right)^{-n}
=-n\left(1+\frac{r}{n}\right)^{-n-1}\frac1n
=-\left(1+\frac{r}{n}\right)^{-n-1}.$$

对乘积而言，只有含 $f_i$ 的因子会随 $f_i$ 改变。因此
$$\frac{\partial}{\partial f_i}\prod_j\frac{1}{1+f_jt_j}
=\left(-\frac{t_i}{(1+f_it_i)^2}\right)\prod_{j\ne i}\frac{1}{1+f_jt_j}.$$
也可写成
$$-\frac{t_i}{1+f_it_i}\prod_j\frac{1}{1+f_jt_j}.$$`
    }
  },
  {
    id: "red-book-problem-155",
    reason: "First-principles derivative of exp(cos x) was OCR-corrupted.",
    fields: {
      titleEn: "Question 6.20 - Derive the derivative of exp(cos x) from first principles",
      titleZh: "问题 6.20 - 从第一原理推导 exp(cos x) 的导数",
      category: "calculus",
      tags: calculusTags,
      answer: raw`For
$$g(x)=e^{\cos x},$$
the derivative is
$$g'(x)=-\sin x\,e^{\cos x}.$$`,
      answerZh: raw`若
$$g(x)=e^{\cos x},$$
则
$$g'(x)=-\sin x\,e^{\cos x}.$$`,
      promptEn: raw`Derive from first principles the derivative of
$$g(x)=e^{\cos x}.$$`,
      promptZh: raw`从第一原理推导
$$g(x)=e^{\cos x}$$
的导数。`,
      explanation: raw`Start from the definition:
$$g'(x)=\lim_{h\to0}\frac{e^{\cos(x+h)}-e^{\cos x}}{h}.$$
Factor out $e^{\cos x}$:
$$g'(x)=e^{\cos x}\lim_{h\to0}\frac{e^{\cos(x+h)-\cos x}-1}{h}.$$
Since $\cos(x+h)-\cos x=O(h)$ and $e^u-1=u+O(u^2)$,
$$g'(x)=e^{\cos x}\lim_{h\to0}\frac{\cos(x+h)-\cos x+O(h^2)}{h}.$$
The remaining limit is the derivative of cosine, $-\sin x$, so
$$g'(x)=-\sin x\,e^{\cos x}.$$`,
      explanationZh: raw`从导数定义出发：
$$g'(x)=\lim_{h\to0}\frac{e^{\cos(x+h)}-e^{\cos x}}{h}.$$
提出 $e^{\cos x}$：
$$g'(x)=e^{\cos x}\lim_{h\to0}\frac{e^{\cos(x+h)-\cos x}-1}{h}.$$
由于 $\cos(x+h)-\cos x=O(h)$，且 $e^u-1=u+O(u^2)$，
$$g'(x)=e^{\cos x}\lim_{h\to0}\frac{\cos(x+h)-\cos x+O(h^2)}{h}.$$
剩余极限就是余弦函数的导数，即 $-\sin x$，所以
$$g'(x)=-\sin x\,e^{\cos x}.$$`
    }
  },
  {
    id: "red-book-problem-156",
    reason: "Derivative of x log x had inconsistent variables and no answer field.",
    fields: {
      titleEn: "Question 6.21 - Differentiate x log x",
      titleZh: "问题 6.21 - 对 x log x 求导",
      category: "calculus",
      tags: calculusTags,
      answer: raw`For $x>0$,
$$\frac{d}{dx}\left(x\log x\right)=\log x+1.$$`,
      answerZh: raw`对 $x>0$，
$$\frac{d}{dx}\left(x\log x\right)=\log x+1.$$`,
      promptEn: raw`Differentiate $f(x)=x\log x$.`,
      promptZh: raw`对 $f(x)=x\log x$ 求导。`,
      explanation: raw`Use the product rule:
$$\frac{d}{dx}(x\log x)
=1\cdot\log x+x\cdot\frac1x
=\log x+1.$$`,
      explanationZh: raw`使用乘积法则：
$$\frac{d}{dx}(x\log x)
=1\cdot\log x+x\cdot\frac1x
=\log x+1.$$`
    }
  },
  {
    id: "red-book-problem-157",
    reason: "Integral of log x prompt and solution were ambiguous and corrupted.",
    fields: {
      titleEn: "Question 6.22 - Integral of log x",
      titleZh: "问题 6.22 - log x 的积分",
      category: "calculus",
      tags: calculusTags,
      answer: raw`$$\int \log x\,dx=x\log x-x+C.$$`,
      answerZh: raw`$$\int \log x\,dx=x\log x-x+C.$$`,
      promptEn: raw`Evaluate
$$\int \log x\,dx.$$`,
      promptZh: raw`计算
$$\int \log x\,dx.$$`,
      explanation: raw`Use integration by parts with $u=\log x$ and $dv=dx$. Then $du=dx/x$ and $v=x$, so
$$\int \log x\,dx
=x\log x-\int x\frac{1}{x}\,dx
=x\log x-x+C.$$`,
      explanationZh: raw`使用分部积分，取 $u=\log x$，$dv=dx$。则 $du=dx/x$，$v=x$，所以
$$\int \log x\,dx
=x\log x-\int x\frac{1}{x}\,dx
=x\log x-x+C.$$`
    }
  },
  {
    id: "red-book-problem-158",
    reason: "Integral of log^n x prompt and induction formula were garbled.",
    fields: {
      titleEn: "Question 6.23 - Integral of (log x)^n",
      titleZh: "问题 6.23 - (log x)^n 的积分",
      category: "calculus",
      tags: calculusTags,
      answer: raw`Let
$$I_n=\int(\log x)^n\,dx.$$
Then
$$I_n=x(\log x)^n-nI_{n-1}.$$
Equivalently,
$$I_n=x\sum_{k=0}^{n}(-1)^k\frac{n!}{(n-k)!}(\log x)^{n-k}+C.$$`,
      answerZh: raw`令
$$I_n=\int(\log x)^n\,dx.$$
则
$$I_n=x(\log x)^n-nI_{n-1}.$$
等价地，
$$I_n=x\sum_{k=0}^{n}(-1)^k\frac{n!}{(n-k)!}(\log x)^{n-k}+C.$$`,
      promptEn: raw`Evaluate
$$\int(\log x)^n\,dx.$$`,
      promptZh: raw`计算
$$\int(\log x)^n\,dx.$$`,
      explanation: raw`Use integration by parts with
$$u=(\log x)^n,\qquad dv=dx.$$
Then
$$du=n(\log x)^{n-1}\frac{dx}{x},\qquad v=x.$$
So
$$I_n=x(\log x)^n-n\int(\log x)^{n-1}\,dx
=x(\log x)^n-nI_{n-1}.$$
Iterating this recurrence gives
$$I_n=x\left((\log x)^n-n(\log x)^{n-1}+n(n-1)(\log x)^{n-2}-\cdots+(-1)^nn!\right)+C,$$
which is the same as the summation formula in the answer.`,
      explanationZh: raw`使用分部积分，取
$$u=(\log x)^n,\qquad dv=dx.$$
则
$$du=n(\log x)^{n-1}\frac{dx}{x},\qquad v=x.$$
所以
$$I_n=x(\log x)^n-n\int(\log x)^{n-1}\,dx
=x(\log x)^n-nI_{n-1}.$$
不断迭代该递推式，得到
$$I_n=x\left((\log x)^n-n(\log x)^{n-1}+n(n-1)(\log x)^{n-2}-\cdots+(-1)^nn!\right)+C,$$
这与答案中的求和公式等价。`
    }
  },
  {
    id: "red-book-problem-159",
    reason: "Double integral limits and final value were corrupted.",
    fields: {
      titleEn: "Question 6.24 - Evaluate a simple double integral",
      titleZh: "问题 6.24 - 计算一个简单二重积分",
      category: "calculus",
      tags: calculusTags,
      answer: raw`$$\int_0^{1/2}\int_{1/2}^{1/2+x}2\,dy\,dx=\frac14.$$`,
      answerZh: raw`$$\int_0^{1/2}\int_{1/2}^{1/2+x}2\,dy\,dx=\frac14.$$`,
      promptEn: raw`Evaluate
$$\int_0^{1/2}\int_{1/2}^{1/2+x}2\,dy\,dx.$$`,
      promptZh: raw`计算
$$\int_0^{1/2}\int_{1/2}^{1/2+x}2\,dy\,dx.$$`,
      explanation: raw`First evaluate the inner integral:
$$\int_{1/2}^{1/2+x}2\,dy
=2\left((1/2+x)-1/2\right)
=2x.$$
Then
$$\int_0^{1/2}2x\,dx
=\left.x^2\right|_0^{1/2}
=\frac14.$$`,
      explanationZh: raw`先计算内层积分：
$$\int_{1/2}^{1/2+x}2\,dy
=2\left((1/2+x)-1/2\right)
=2x.$$
于是
$$\int_0^{1/2}2x\,dx
=\left.x^2\right|_0^{1/2}
=\frac14.$$`
    }
  },
  {
    id: "red-book-problem-198",
    reason: "Cube shortest-path prompt and square-root notation were corrupted.",
    fields: {
      titleEn: "Question 8.4 - Shortest surface path across a unit cube",
      titleZh: "问题 8.4 - 单位立方体表面上的最短路径",
      category: "mentalMath",
      tags: puzzleTags,
      answer: raw`The shortest path along the surface is
$$\sqrt5\text{ meters}.$$`,
      answerZh: raw`沿表面的最短路径为
$$\sqrt5\text{ 米}.$$`,
      promptEn: "An ant wants to go from one corner of a cube of volume 1 cubic meter to the opposite corner, staying on the surface. What is the shortest distance it must travel?",
      promptZh: "一只蚂蚁想从体积为 1 立方米的正方体一个顶点出发，沿表面走到相对顶点。它需要走的最短距离是多少？",
      explanation: raw`A cube with volume $1$ cubic meter has side length $1$ meter. Unfold two adjacent faces of the cube into a $1$ by $2$ rectangle. The shortest surface path becomes the rectangle's diagonal:
$$\sqrt{1^2+2^2}=\sqrt5.$$`,
      explanationZh: raw`体积为 $1$ 立方米的正方体边长为 $1$ 米。把相邻两个面展开成一个 $1$ 乘 $2$ 的矩形。沿表面的最短路径就是该矩形的对角线：
$$\sqrt{1^2+2^2}=\sqrt5.$$`
    }
  },
  {
    id: "red-book-problem-205",
    reason: "Snowplow puzzle prompt and logarithmic equations were OCR-corrupted.",
    fields: {
      titleEn: "Question 8.11 - Snowplow start time",
      titleZh: "问题 8.11 - 扫雪车问题中的下雪开始时间",
      category: "calculus",
      tags: [
        "红宝书 Quant Job Interview Questions And Answers",
        "Chapter 8",
        "Logic/Brainteasers",
        "Calculus",
        "puzzle"
      ],
      answer: raw`The snow began
$$\frac{\sqrt5-1}{2}\text{ hours}$$
before noon, about $0.618$ hours or about $37$ minutes before noon.`,
      answerZh: raw`雪在中午前
$$\frac{\sqrt5-1}{2}\text{ 小时}$$
开始下，约为 $0.618$ 小时，也就是中午前约 $37$ 分钟。`,
      promptEn: "Snow starts falling sometime before noon. A snowplow begins work at noon, and its speed is inversely proportional to the time since the snow began falling. It travels twice as far from noon to 1 pm as it travels from 1 pm to 2 pm. When did the snow start?",
      promptZh: "中午前某个时刻开始下雪。扫雪车从中午开始工作，其速度与从开始下雪以来经过的时间成反比。扫雪车从中午到下午 1 点行驶的距离，是从下午 1 点到 2 点行驶距离的两倍。雪是什么时候开始下的？",
      explanation: raw`Let $x$ be the number of hours the snow has already been falling at noon. Since speed is inversely proportional to time since the snow started,
$$v(t)=\frac{a}{t},$$
where $t$ is measured from the start of snowfall.

The distance from noon to 1 pm is
$$\int_x^{x+1}\frac{a}{t}\,dt=a\log\frac{x+1}{x}.$$
The distance from 1 pm to 2 pm is
$$\int_{x+1}^{x+2}\frac{a}{t}\,dt=a\log\frac{x+2}{x+1}.$$
The first distance is twice the second, so
$$\log\frac{x+1}{x}=2\log\frac{x+2}{x+1}.$$
Exponentiating gives
$$\frac{x+1}{x}=\left(\frac{x+2}{x+1}\right)^2.$$
Thus
$$(x+1)^3=x(x+2)^2,$$
which reduces to
$$x^2+x-1=0.$$
The positive solution is
$$x=\frac{\sqrt5-1}{2}.$$`,
      explanationZh: raw`令 $x$ 表示到中午时雪已经下了多少小时。由于速度与开始下雪以来经过的时间成反比，
$$v(t)=\frac{a}{t},$$
其中 $t$ 从下雪开始计时。

中午到下午 1 点的距离为
$$\int_x^{x+1}\frac{a}{t}\,dt=a\log\frac{x+1}{x}.$$
下午 1 点到 2 点的距离为
$$\int_{x+1}^{x+2}\frac{a}{t}\,dt=a\log\frac{x+2}{x+1}.$$
题目说第一段距离是第二段的两倍，因此
$$\log\frac{x+1}{x}=2\log\frac{x+2}{x+1}.$$
指数化得到
$$\frac{x+1}{x}=\left(\frac{x+2}{x+1}\right)^2.$$
于是
$$(x+1)^3=x(x+2)^2,$$
化简为
$$x^2+x-1=0.$$
正根为
$$x=\frac{\sqrt5-1}{2}.$$`
    }
  },
  {
    id: "red-book-problem-213",
    reason: "Ball-sack game prompt duplicated the black-ball win condition and answer formula was corrupted.",
    fields: {
      titleEn: "Question 8.19 - Arrange black and white balls in two sacks",
      titleZh: "问题 8.19 - 两个袋子中的黑白球安排",
      category: "probabilityExpectation",
      tags: [
        "红宝书 Quant Job Interview Questions And Answers",
        "Chapter 8",
        "Logic/Brainteasers",
        "Probability/Expectation",
        "puzzle"
      ],
      answer: raw`Put one white ball alone in one sack, and put the remaining 49 white balls plus all 50 black balls in the other sack. Your winning probability is
$$\frac12+\frac12\cdot\frac{49}{99}=\frac{74}{99}\approx0.747.$$`,
      answerZh: raw`把 1 个白球单独放进一个袋子，把剩下的 49 个白球和全部 50 个黑球放进另一个袋子。你的获胜概率为
$$\frac12+\frac12\cdot\frac{49}{99}=\frac{74}{99}\approx0.747.$$`,
      promptZh: "有 100 个球：50 个白球、50 个黑球，以及两个袋子。你可以任意安排这些球。然后我随机选一个袋子，再从该袋中随机摸一个球。如果摸到黑球，我赢；如果摸到白球，你赢。如何安排才能让你获胜概率最大？",
      explanation: raw`The sack is chosen uniformly, so even a sack with only one ball is selected with probability $1/2$. Put a single white ball in one sack. If that sack is chosen, you win with probability $1$.

The other sack contains $49$ white balls and $50$ black balls, so if that sack is chosen your winning probability is $49/99$. Therefore
$$P(\text{win})=\frac12\cdot1+\frac12\cdot\frac{49}{99}
=\frac{74}{99}.$$

This concentrates one sure win into one sack while leaving the other sack with nearly the original white-ball proportion. Any strategy that puts more than one white ball in the first sack lowers the sure-win sack's leverage without enough compensation in the second sack.`,
      explanationZh: raw`袋子是等概率选择的，因此即使某个袋子只有一个球，也会以 $1/2$ 的概率被选中。把一个白球单独放入一个袋子；如果选到该袋，你必胜。

另一个袋子中有 $49$ 个白球和 $50$ 个黑球，所以如果选到该袋，你获胜的概率为 $49/99$。因此
$$P(\text{win})=\frac12\cdot1+\frac12\cdot\frac{49}{99}
=\frac{74}{99}.$$

这个策略把一个袋子变成“必胜袋”，同时让另一个袋子仍保留接近原始比例的白球。若在第一个袋子里放入超过一个白球，会降低这个必胜袋的杠杆效果，而第二个袋子的改善不足以弥补。`
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
