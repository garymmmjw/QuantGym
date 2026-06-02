import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const raw = String.raw;
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const options = parseArgs(process.argv.slice(2));
const sourcePath = path.resolve(projectRoot, options.source || "data/question-banks/green-book/problems.json");
const reportPath = path.resolve(projectRoot, options.report || "artifacts/question-bank-quality-review/green-book-batch-002-reviewed-repairs-report.json");
const payload = readJson(sourcePath, { problems: [] });
const problems = Array.isArray(payload) ? payload : payload.problems || [];
const problemById = new Map(problems.map((problem) => [String(problem.id || ""), problem]));
const reviewSource = "llm-full-major-triage-reviewed-repair-green-book-batch-002-2026-06-02";

const repairs = [
  {
    id: "green-book-problem-039",
    reason: "Derivative formulas and the final derivative were OCR-corrupted; answer fields were empty.",
    fields: {
      category: "calculus",
      titleZh: "导数基础",
      tags: ["绿皮书", "Limits and Derivatives", "derivatives", "chain rule", "calculus"],
      answer: raw`$\displaystyle y'=(\ln x)^x\left(\ln(\ln x)+\frac{1}{\ln x}\right)$ for $x>1$.`,
      answerZh: raw`当 $x>1$ 时，$\displaystyle y'=(\ln x)^x\left(\ln(\ln x)+\frac{1}{\ln x}\right)$。`,
      promptEn: raw`Review the basic derivative rules: product rule, quotient rule, chain rule, logarithmic differentiation, and derivatives of exponential and trigonometric functions. What is the derivative of
$$y=(\ln x)^x?$$`,
      promptZh: raw`复习基本求导规则：乘积法则、商法则、链式法则、对数求导，以及指数函数和三角函数的导数。求
$$y=(\ln x)^x$$
的导数。`,
      explanation: raw`Use logarithmic differentiation. For $x>1$,
$$\ln y=x\ln(\ln x).$$
Differentiate both sides:
$$\frac{y'}{y}=\ln(\ln x)+x\cdot\frac{1}{\ln x}\cdot\frac{1}{x}
=\ln(\ln x)+\frac{1}{\ln x}.$$
Multiplying by $y=(\ln x)^x$ gives
$$y'=(\ln x)^x\left(\ln(\ln x)+\frac{1}{\ln x}\right).$$`,
      explanationZh: raw`使用对数求导。对 $x>1$，
$$\ln y=x\ln(\ln x).$$
两边求导：
$$\frac{y'}{y}=\ln(\ln x)+x\cdot\frac{1}{\ln x}\cdot\frac{1}{x}
=\ln(\ln x)+\frac{1}{\ln x}.$$
再乘回 $y=(\ln x)^x$，得到
$$y'=(\ln x)^x\left(\ln(\ln x)+\frac{1}{\ln x}\right).$$`
    }
  },
  {
    id: "green-book-problem-040",
    reason: "The comparison between e^pi and pi^e was OCR-corrupted as eli/::re.",
    fields: {
      category: "calculus",
      tags: ["绿皮书", "Limits and Derivatives", "maximum and minimum", "calculus"],
      answer: raw`$e^\pi>\pi^e$.`,
      answerZh: raw`$e^\pi>\pi^e$。`,
      promptEn: raw`Without computing decimal approximations, which number is larger, $e^\pi$ or $\pi^e$?`,
      promptZh: raw`不计算十进制近似值，$e^\pi$ 和 $\pi^e$ 哪个更大？`,
      explanation: raw`Take natural logarithms. We need to compare
$$\ln(e^\pi)=\pi,\qquad \ln(\pi^e)=e\ln\pi.$$
Equivalently, compare $1/e$ with $\ln\pi/\pi$. The function
$$f(x)=\frac{\ln x}{x}$$
has derivative
$$f'(x)=\frac{1-\ln x}{x^2},$$
so it is decreasing for $x>e$. Since $\pi>e$,
$$\frac{\ln e}{e}>\frac{\ln\pi}{\pi}.$$
Thus $\pi>e\ln\pi$, and therefore
$$e^\pi>\pi^e.$$`,
      explanationZh: raw`取自然对数。需要比较
$$\ln(e^\pi)=\pi,\qquad \ln(\pi^e)=e\ln\pi.$$
等价地，比较 $1/e$ 和 $\ln\pi/\pi$。函数
$$f(x)=\frac{\ln x}{x}$$
的导数为
$$f'(x)=\frac{1-\ln x}{x^2},$$
因此在 $x>e$ 时递减。由于 $\pi>e$，
$$\frac{\ln e}{e}>\frac{\ln\pi}{\pi}.$$
所以 $\pi>e\ln\pi$，进而
$$e^\pi>\pi^e.$$`
    }
  },
  {
    id: "green-book-problem-045",
    reason: "Snowplow ODE/integral solution was fragmented and had no final answer.",
    fields: {
      category: "calculus",
      titleEn: "B. Snowplow problem",
      titleZh: "B. 扫雪车问题",
      tags: ["绿皮书", "Integration", "snowplow problem", "calculus", "differential equations"],
      answer: raw`The snow began $\frac{\sqrt5-1}{2}$ hours before noon, about $37.1$ minutes before noon, i.e. about 11:23 a.m.`,
      answerZh: raw`雪在中午前 $\frac{\sqrt5-1}{2}$ 小时开始下，约为中午前 $37.1$ 分钟，即约上午 11:23。`,
      promptEn: "B. Snow began falling at a constant rate before noon. At noon, Cambridge sent out a snowplow to clear Massachusetts Avenue from MIT to Harvard. The plow removes a constant volume of snow per unit time. By 1 p.m. it had traveled 2 miles; by 2 p.m. it had traveled 3 miles. When did the snow begin to fall?",
      promptZh: "B. 雪在中午之前以恒定速率开始下。中午时，剑桥市派出一辆扫雪车清理从 MIT 到 Harvard 的 Massachusetts Avenue。扫雪车每单位时间清除的雪量恒定。到下午 1 点它行驶了 2 英里；到下午 2 点它行驶了 3 英里。雪是什么时候开始下的？",
      explanation: raw`Let noon be time $0$, and suppose the snow began $T$ hours before noon. At time $t$ after noon, the snow depth is proportional to $T+t$. Since the plow removes a constant volume per hour, its speed is
$$\frac{dx}{dt}=\frac{c}{T+t}$$
for some constant $c$.

The distances traveled by 1 p.m. and 2 p.m. give
$$\int_0^1\frac{c}{T+t}\,dt=c\ln\frac{T+1}{T}=2,$$
and
$$\int_0^2\frac{c}{T+t}\,dt=c\ln\frac{T+2}{T}=3.$$
Eliminate $c$:
$$3\ln\frac{T+1}{T}=2\ln\frac{T+2}{T}.$$
Let $u=1/T$. Then
$$3\ln(1+u)=2\ln(1+2u),$$
so
$$(1+u)^3=(1+2u)^2.$$
This gives $u^2-u-1=0$, hence $u=(1+\sqrt5)/2$ and
$$T=\frac{1}{u}=\frac{\sqrt5-1}{2}.$$
Thus the snow began about $0.618$ hours, or $37.1$ minutes, before noon.`,
      explanationZh: raw`令中午为时间 $0$，假设雪在中午前 $T$ 小时开始下。中午后 $t$ 小时时，积雪深度与 $T+t$ 成正比。扫雪车每小时清除的雪量恒定，因此速度可写为
$$\frac{dx}{dt}=\frac{c}{T+t}$$
其中 $c$ 为常数。

下午 1 点和 2 点的路程给出
$$\int_0^1\frac{c}{T+t}\,dt=c\ln\frac{T+1}{T}=2,$$
以及
$$\int_0^2\frac{c}{T+t}\,dt=c\ln\frac{T+2}{T}=3.$$
消去 $c$：
$$3\ln\frac{T+1}{T}=2\ln\frac{T+2}{T}.$$
令 $u=1/T$，则
$$3\ln(1+u)=2\ln(1+2u),$$
所以
$$(1+u)^3=(1+2u)^2.$$
解得 $u^2-u-1=0$，取正根 $u=(1+\sqrt5)/2$，因此
$$T=\frac{1}{u}=\frac{\sqrt5-1}{2}.$$
所以雪在中午前约 $0.618$ 小时，也就是约 $37.1$ 分钟前开始下。`
    }
  },
  {
    id: "green-book-problem-047",
    reason: "Partial-derivative primer and Gaussian integral were unreadable.",
    fields: {
      category: "calculus",
      tags: ["绿皮书", "Partial Derivatives and Multiple Integrals", "Gaussian integral", "polar coordinates", "calculus"],
      answer: raw`$\displaystyle \int_{-\infty}^{\infty}e^{-x^2/2}\,dx=\sqrt{2\pi}$.`,
      answerZh: raw`$\displaystyle \int_{-\infty}^{\infty}e^{-x^2/2}\,dx=\sqrt{2\pi}$。`,
      promptEn: raw`Using polar coordinates or the standard Gaussian integral, calculate
$$\int_{-\infty}^{\infty}e^{-x^2/2}\,dx.$$`,
      promptZh: raw`使用极坐标或标准高斯积分，计算
$$\int_{-\infty}^{\infty}e^{-x^2/2}\,dx.$$`,
      explanation: raw`Let
$$I=\int_{-\infty}^{\infty}e^{-x^2/2}\,dx.$$
Then
$$I^2=\int_{-\infty}^{\infty}\int_{-\infty}^{\infty}e^{-(x^2+y^2)/2}\,dx\,dy.$$
Convert to polar coordinates:
$$I^2=\int_0^{2\pi}\int_0^\infty e^{-r^2/2}r\,dr\,d\theta.$$
Using $u=r^2/2$,
$$\int_0^\infty e^{-r^2/2}r\,dr=\int_0^\infty e^{-u}\,du=1.$$
Therefore $I^2=2\pi$, so
$$I=\sqrt{2\pi}.$$`,
      explanationZh: raw`设
$$I=\int_{-\infty}^{\infty}e^{-x^2/2}\,dx.$$
则
$$I^2=\int_{-\infty}^{\infty}\int_{-\infty}^{\infty}e^{-(x^2+y^2)/2}\,dx\,dy.$$
改用极坐标：
$$I^2=\int_0^{2\pi}\int_0^\infty e^{-r^2/2}r\,dr\,d\theta.$$
令 $u=r^2/2$，
$$\int_0^\infty e^{-r^2/2}r\,dr=\int_0^\infty e^{-u}\,du=1.$$
因此 $I^2=2\pi$，所以
$$I=\sqrt{2\pi}.$$`
    }
  },
  {
    id: "green-book-problem-057",
    reason: "Nonhomogeneous ODE notation was corrupted and omitted one solution.",
    fields: {
      category: "calculus",
      tags: ["绿皮书", "Ordinary Differential Equations", "nonhomogeneous linear equation", "calculus"],
      answer: raw`For $y''+y'+y=1$:
$$y=e^{-x/2}\left(C_1\cos\frac{\sqrt3 x}{2}+C_2\sin\frac{\sqrt3 x}{2}\right)+1.$$
For $y''+y'+y=x$:
$$y=e^{-x/2}\left(C_1\cos\frac{\sqrt3 x}{2}+C_2\sin\frac{\sqrt3 x}{2}\right)+x-1.$$`,
      answerZh: raw`对 $y''+y'+y=1$：
$$y=e^{-x/2}\left(C_1\cos\frac{\sqrt3 x}{2}+C_2\sin\frac{\sqrt3 x}{2}\right)+1.$$
对 $y''+y'+y=x$：
$$y=e^{-x/2}\left(C_1\cos\frac{\sqrt3 x}{2}+C_2\sin\frac{\sqrt3 x}{2}\right)+x-1.$$`,
      promptEn: raw`For a nonhomogeneous linear ODE, a particular solution plus the general homogeneous solution gives the general solution. Solve
$$y''+y'+y=1$$
and
$$y''+y'+y=x.$$`,
      promptZh: raw`对非齐次线性常微分方程，特解加上对应齐次方程的通解就是非齐次方程的通解。求解
$$y''+y'+y=1$$
和
$$y''+y'+y=x.$$`,
      explanation: raw`The homogeneous equation is
$$y''+y'+y=0.$$
Its characteristic equation is
$$r^2+r+1=0,$$
so
$$r=\frac{-1\pm i\sqrt3}{2}.$$
Therefore the homogeneous solution is
$$y_h=e^{-x/2}\left(C_1\cos\frac{\sqrt3 x}{2}+C_2\sin\frac{\sqrt3 x}{2}\right).$$

For $y''+y'+y=1$, the constant particular solution $y_p=1$ works.

For $y''+y'+y=x$, try $y_p=mx+n$. Then $y_p'=m$, $y_p''=0$, and
$$0+m+mx+n=x.$$
Thus $m=1$ and $n=-1$, so $y_p=x-1$.

Add the appropriate particular solution to $y_h$ to get the two general solutions.`,
      explanationZh: raw`对应齐次方程为
$$y''+y'+y=0.$$
特征方程为
$$r^2+r+1=0,$$
所以
$$r=\frac{-1\pm i\sqrt3}{2}.$$
因此齐次通解为
$$y_h=e^{-x/2}\left(C_1\cos\frac{\sqrt3 x}{2}+C_2\sin\frac{\sqrt3 x}{2}\right).$$

对 $y''+y'+y=1$，常数特解 $y_p=1$ 可行。

对 $y''+y'+y=x$，设 $y_p=mx+n$。则 $y_p'=m$，$y_p''=0$，代入得
$$0+m+mx+n=x.$$
因此 $m=1$、$n=-1$，所以 $y_p=x-1$。

把相应特解加到 $y_h$ 上，就得到两个方程的通解。`
    }
  },
  {
    id: "green-book-problem-101",
    reason: "Dice-game expectation notation was corrupted and the answer field was empty.",
    fields: {
      answer: "7",
      answerZh: "7",
      promptEn: "Suppose that you roll a die. For each roll, you are paid the face value. If the roll is 4, 5, or 6, you may roll again. Once you roll 1, 2, or 3, the game stops. What is the expected payoff of this game?",
      promptZh: "假设你掷一枚骰子。每次掷出后，你获得等于点数的报酬。如果掷出 4、5 或 6，你可以继续掷；一旦掷出 1、2 或 3，游戏停止。这个游戏的期望收益是多少？",
      explanation: raw`Let $E$ be the expected payoff. On the first roll, with probability $1/2$ the result is in $\{1,2,3\}$ and the game stops; the conditional average payoff is $2$. With probability $1/2$ the result is in $\{4,5,6\}$; the conditional average immediate payoff is $5$, and then the game starts over with expected value $E$.

Thus
$$E=\frac12\cdot2+\frac12(5+E).$$
Solving gives
$$E=7.$$`,
      explanationZh: raw`令 $E$ 为期望收益。第一次掷骰时，以概率 $1/2$ 得到 $\{1,2,3\}$ 中的点数并停止；此时条件平均收益为 $2$。以概率 $1/2$ 得到 $\{4,5,6\}$ 中的点数；此时条件平均即时收益为 $5$，然后游戏重新开始，额外期望仍为 $E$。

因此
$$E=\frac12\cdot2+\frac12(5+E).$$
解得
$$E=7.$$`
    }
  },
  {
    id: "green-book-problem-102",
    reason: "Indicator notation and fractions in the first-ace expectation were OCR-corrupted.",
    fields: {
      answer: "53/5 = 10.6",
      answerZh: "53/5 = 10.6",
      explanation: raw`There are $4$ aces and $48$ non-aces. For each non-ace card $i$, let $X_i=1$ if it appears before all four aces, and $X_i=0$ otherwise. The number of cards turned over until the first ace appears is
$$X=1+\sum_{i=1}^{48}X_i.$$
In a random ordering, a fixed non-ace is equally likely to fall in any of the five gaps created by the four aces. It is before all four aces with probability $1/5$. Therefore
$$\mathbb{E}[X]=1+48\cdot\frac15=\frac{53}{5}=10.6.$$`,
      explanationZh: raw`共有 $4$ 张 A 和 $48$ 张非 A。对每张非 A 牌 $i$，令 $X_i=1$ 表示它出现在四张 A 之前，否则 $X_i=0$。翻到第一张 A 所需的牌数为
$$X=1+\sum_{i=1}^{48}X_i.$$
在随机排列中，固定的一张非 A 等可能落在四张 A 分出的五个间隔之一。它出现在所有 A 之前的概率为 $1/5$。因此
$$\mathbb{E}[X]=1+48\cdot\frac15=\frac{53}{5}=10.6.$$`
    }
  },
  {
    id: "green-book-problem-105",
    reason: "Joint-default notation and correlation range were OCR-corrupted; answer fields were empty.",
    fields: {
      answer: raw`$P(A\cup B)\in[0.5,0.8]$ and $\rho_{A,B}\in[-\sqrt{3/7},\sqrt{3/7}]$.`,
      answerZh: raw`$P(A\cup B)\in[0.5,0.8]$，且 $\rho_{A,B}\in[-\sqrt{3/7},\sqrt{3/7}]$。`,
      explanation: raw`Let $p_A=0.5$, $p_B=0.3$, and let $p_{AB}=P(A\cap B)$. Feasible joint probabilities satisfy
$$0\leq p_{AB}\leq \min(p_A,p_B)=0.3.$$
Since
$$P(A\cup B)=p_A+p_B-p_{AB}=0.8-p_{AB},$$
the union probability ranges from $0.5$ to $0.8$.

For the correlation of default indicators $I_A$ and $I_B$,
$$\rho=\frac{\operatorname{Cov}(I_A,I_B)}{\sqrt{\operatorname{Var}(I_A)\operatorname{Var}(I_B)}}
=\frac{p_{AB}-0.5\cdot0.3}{\sqrt{0.5(0.5)\cdot0.3(0.7)}}.$$
The denominator is $\sqrt{0.0525}=\sqrt{21}/20$. As $p_{AB}$ ranges from $0$ to $0.3$, the covariance ranges from $-0.15$ to $0.15$. Hence
$$\rho\in\left[-\frac{3}{\sqrt{21}},\frac{3}{\sqrt{21}}\right]
=\left[-\sqrt{\frac37},\sqrt{\frac37}\right].$$`,
      explanationZh: raw`令 $p_A=0.5$、$p_B=0.3$，并令 $p_{AB}=P(A\cap B)$。可行的联合概率满足
$$0\leq p_{AB}\leq \min(p_A,p_B)=0.3.$$
由于
$$P(A\cup B)=p_A+p_B-p_{AB}=0.8-p_{AB},$$
所以至少一个债券违约的概率范围为 $0.5$ 到 $0.8$。

对违约指示变量 $I_A$ 和 $I_B$，相关系数为
$$\rho=\frac{\operatorname{Cov}(I_A,I_B)}{\sqrt{\operatorname{Var}(I_A)\operatorname{Var}(I_B)}}
=\frac{p_{AB}-0.5\cdot0.3}{\sqrt{0.5(0.5)\cdot0.3(0.7)}}.$$
分母为 $\sqrt{0.0525}=\sqrt{21}/20$。当 $p_{AB}$ 从 $0$ 到 $0.3$ 变化时，协方差从 $-0.15$ 到 $0.15$。因此
$$\rho\in\left[-\frac{3}{\sqrt{21}},\frac{3}{\sqrt{21}}\right]
=\left[-\sqrt{\frac37},\sqrt{\frac37}\right].$$`
    }
  },
  {
    id: "green-book-problem-106",
    reason: "Order-statistic formulas were OCR-corrupted and answer fields were empty.",
    fields: {
      answer: raw`For $Z_n=\max_i X_i$: $F_Z(z)=z^n$, $f_Z(z)=nz^{n-1}$, $\mathbb{E}[Z_n]=n/(n+1)$. For $Y_n=\min_i X_i$: $F_Y(y)=1-(1-y)^n$, $f_Y(y)=n(1-y)^{n-1}$, $\mathbb{E}[Y_n]=1/(n+1)$ on $0\leq y,z\leq1$.`,
      answerZh: raw`对 $Z_n=\max_i X_i$：$F_Z(z)=z^n$，$f_Z(z)=nz^{n-1}$，$\mathbb{E}[Z_n]=n/(n+1)$。对 $Y_n=\min_i X_i$：$F_Y(y)=1-(1-y)^n$，$f_Y(y)=n(1-y)^{n-1}$，$\mathbb{E}[Y_n]=1/(n+1)$，其中 $0\leq y,z\leq1$。`,
      promptEn: raw`Let $X_1,X_2,\ldots,X_n$ be IID uniform random variables on $[0,1]$. What are the CDF, PDF, and expected value of
$$Z_n=\max(X_1,\ldots,X_n)?$$
What are the CDF, PDF, and expected value of
$$Y_n=\min(X_1,\ldots,X_n)?$$`,
      promptZh: raw`令 $X_1,X_2,\ldots,X_n$ 为 $[0,1]$ 上的独立同分布均匀随机变量。求
$$Z_n=\max(X_1,\ldots,X_n)$$
的累积分布函数、概率密度函数和期望。再求
$$Y_n=\min(X_1,\ldots,X_n)$$
的累积分布函数、概率密度函数和期望。`,
      explanation: raw`For $0\leq z\leq1$,
$$F_Z(z)=P(Z_n\leq z)=P(X_1\leq z,\ldots,X_n\leq z)=z^n.$$
Thus
$$f_Z(z)=nz^{n-1},\qquad \mathbb{E}[Z_n]=\int_0^1 z\,nz^{n-1}\,dz=\frac{n}{n+1}.$$

For $0\leq y\leq1$,
$$P(Y_n>y)=P(X_1>y,\ldots,X_n>y)=(1-y)^n.$$
Therefore
$$F_Y(y)=1-(1-y)^n,\qquad f_Y(y)=n(1-y)^{n-1},$$
and
$$\mathbb{E}[Y_n]=\int_0^1 y\,n(1-y)^{n-1}\,dy=\frac{1}{n+1}.$$`,
      explanationZh: raw`当 $0\leq z\leq1$ 时，
$$F_Z(z)=P(Z_n\leq z)=P(X_1\leq z,\ldots,X_n\leq z)=z^n.$$
因此
$$f_Z(z)=nz^{n-1},\qquad \mathbb{E}[Z_n]=\int_0^1 z\,nz^{n-1}\,dz=\frac{n}{n+1}.$$

当 $0\leq y\leq1$ 时，
$$P(Y_n>y)=P(X_1>y,\ldots,X_n>y)=(1-y)^n.$$
所以
$$F_Y(y)=1-(1-y)^n,\qquad f_Y(y)=n(1-y)^{n-1},$$
并且
$$\mathbb{E}[Y_n]=\int_0^1 y\,n(1-y)^{n-1}\,dy=\frac{1}{n+1}.$$`
    }
  },
  {
    id: "green-book-problem-107",
    reason: "Correlation answer was missing and the conditional probability notation was corrupted.",
    fields: {
      answer: raw`For $0\leq y\leq z\leq1$, $P(Y\geq y\mid Z\leq z)=((z-y)/z)^2$; it is $0$ if $y>z$. The correlation is $\operatorname{Corr}(Y,Z)=1/2$.`,
      answerZh: raw`当 $0\leq y\leq z\leq1$ 时，$P(Y\geq y\mid Z\leq z)=((z-y)/z)^2$；若 $y>z$ 则为 $0$。相关系数为 $\operatorname{Corr}(Y,Z)=1/2$。`,
      promptEn: raw`Let $X_1$ and $X_2$ be IID uniform random variables on $[0,1]$, and define
$$Y=\min(X_1,X_2),\qquad Z=\max(X_1,X_2).$$
For $y,z\in[0,1]$, what is $P(Y\geq y\mid Z\leq z)$? What is the correlation of $Y$ and $Z$?`,
      promptZh: raw`令 $X_1$ 和 $X_2$ 为 $[0,1]$ 上的独立同分布均匀随机变量，并定义
$$Y=\min(X_1,X_2),\qquad Z=\max(X_1,X_2).$$
对 $y,z\in[0,1]$，求 $P(Y\geq y\mid Z\leq z)$。并求 $Y$ 和 $Z$ 的相关系数。`,
      explanation: raw`The event $Z\leq z$ means both $X_1$ and $X_2$ lie in the square $[0,z]^2$, whose area is $z^2$. If $0\leq y\leq z$, then $Y\geq y$ additionally requires both coordinates to be at least $y$, giving the square $[y,z]^2$ with area $(z-y)^2$. Hence
$$P(Y\geq y\mid Z\leq z)=\frac{(z-y)^2}{z^2}.$$
If $y>z$, this conditional probability is $0$.

From the order-statistic formulas for two uniforms,
$$E[Y]=\frac13,\quad E[Z]=\frac23,\quad \operatorname{Var}(Y)=\operatorname{Var}(Z)=\frac1{18}.$$
Also $YZ=X_1X_2$ because the product of the minimum and maximum equals the product of the two original values. Thus
$$E[YZ]=E[X_1X_2]=E[X_1]E[X_2]=\frac14.$$
So
$$\operatorname{Cov}(Y,Z)=\frac14-\frac13\cdot\frac23=\frac1{36},$$
and
$$\operatorname{Corr}(Y,Z)=\frac{1/36}{1/18}=\frac12.$$`,
      explanationZh: raw`事件 $Z\leq z$ 表示 $X_1$ 和 $X_2$ 都落在正方形 $[0,z]^2$ 中，其面积为 $z^2$。如果 $0\leq y\leq z$，则 $Y\geq y$ 还要求两个坐标都至少为 $y$，对应正方形 $[y,z]^2$，面积为 $(z-y)^2$。因此
$$P(Y\geq y\mid Z\leq z)=\frac{(z-y)^2}{z^2}.$$
若 $y>z$，该条件概率为 $0$。

由两个均匀变量的顺序统计量公式，
$$E[Y]=\frac13,\quad E[Z]=\frac23,\quad \operatorname{Var}(Y)=\operatorname{Var}(Z)=\frac1{18}.$$
并且 $YZ=X_1X_2$，因为最大值和最小值的乘积等于两个原变量的乘积。因此
$$E[YZ]=E[X_1X_2]=E[X_1]E[X_2]=\frac14.$$
所以
$$\operatorname{Cov}(Y,Z)=\frac14-\frac13\cdot\frac23=\frac1{36},$$
进而
$$\operatorname{Corr}(Y,Z)=\frac{1/36}{1/18}=\frac12.$$`
    }
  },
  {
    id: "green-book-problem-117",
    reason: "Ticket-line reflection principle explanation had mixed English/Chinese and broken binomial notation.",
    fields: {
      answer: raw`$\displaystyle \frac{1}{n+1}$.`,
      answerZh: raw`$\displaystyle \frac{1}{n+1}$。`,
      promptZh: "在剧院售票处，有 2n 个人排队买票。其中 n 个人只有 5 美元纸币，另外 n 个人只有 10 美元纸币。售票员一开始没有零钱。若每个人都买一张 5 美元的票，所有人都不需要改变队伍顺序就能买到票的概率是多少？",
      explanation: raw`Encode a customer with a $5 bill as $+1$ and a customer with a $10 bill as $-1$. The seller can make change throughout the line exactly when every partial sum is nonnegative.

Among all orders with $n$ plus steps and $n$ minus steps, there are $\binom{2n}{n}$ paths from $(0,0)$ to $(2n,0)$. By the reflection principle, the number of bad paths that ever go below $0$ equals the number of paths from $(0,0)$ to $(2n,-2)$, which is $\binom{2n}{n-1}$.

Therefore the number of good paths is
$$\binom{2n}{n}-\binom{2n}{n-1}
=\frac{1}{n+1}\binom{2n}{n}.$$
The desired probability is
$$\frac{\frac{1}{n+1}\binom{2n}{n}}{\binom{2n}{n}}=\frac{1}{n+1}.$$`,
      explanationZh: raw`把持有 5 美元纸币的顾客记为 $+1$，持有 10 美元纸币的顾客记为 $-1$。售票员能一直找零，当且仅当队伍前缀和始终非负。

所有含有 $n$ 个正步和 $n$ 个负步的排列共有 $\binom{2n}{n}$ 条路径，从 $(0,0)$ 到 $(2n,0)$。由反射原理，曾经跌到 $0$ 以下的坏路径数等于从 $(0,0)$ 到 $(2n,-2)$ 的路径数，即 $\binom{2n}{n-1}$。

因此好路径数为
$$\binom{2n}{n}-\binom{2n}{n-1}
=\frac{1}{n+1}\binom{2n}{n}.$$
所求概率为
$$\frac{\frac{1}{n+1}\binom{2n}{n}}{\binom{2n}{n}}=\frac{1}{n+1}.$$`
    }
  },
  {
    id: "green-book-problem-121",
    reason: "Dynamic dice game had untranslated phrases, garbled recurrence, and no answer summary.",
    fields: {
      category: "probabilityExpectation",
      answer: "About 6.15 dollars",
      answerZh: "约 6.15 美元",
      promptEn: "A casino designs a dice game. You may roll a die as many times as you want until a 6 appears. After each roll, if 1, 2, 3, 4, or 5 appears, you win 1, 2, 3, 4, or 5 dollars respectively. If 6 appears, all money accumulated in this game is lost and the game stops. After each roll of 1 through 5, you may choose to keep the money or keep rolling. If you are risk neutral, how much are you willing to pay to play?",
      promptZh: "一家赌场设计了一个骰子游戏。你可以任意多次掷骰子，直到出现 6。每次掷出 1、2、3、4、5 时，你分别赢得 1、2、3、4、5 美元；但如果掷出 6，你在本局中已经赢得的钱全部归零，游戏结束。每次掷出 1 到 5 后，你都可以选择拿走当前奖金，或者继续掷。若你是风险中性的，你最多愿意付多少钱来玩这个游戏？",
      explanation: raw`Let $V(n)$ be the optimal expected value when you have already accumulated $n$ dollars. If you stop, you receive $n$. If you roll again, the value is
$$\frac{V(n+1)+V(n+2)+V(n+3)+V(n+4)+V(n+5)+0}{6}.$$
Thus
$$V(n)=\max\left(n,\frac{1}{6}\sum_{i=1}^5 V(n+i)\right).$$

It is optimal to stop from $n=15$ onward: rolling one more time has immediate average increment $(1+2+3+4+5)/6=2.5$ but a $1/6$ chance of losing everything, and the backward recursion confirms the cutoff. Starting with
$$V(15)=15,\quad V(16)=16,\quad \ldots,$$
and computing backward gives
$$V(14)=14.17,\quad V(13)=13.36,\quad \ldots,\quad V(0)\approx6.15.$$
Therefore a risk-neutral player should pay at most about 6.15 dollars.`,
      explanationZh: raw`令 $V(n)$ 表示已经累积 $n$ 美元时的最优期望价值。如果停止，就得到 $n$。如果继续掷一次，则价值为
$$\frac{V(n+1)+V(n+2)+V(n+3)+V(n+4)+V(n+5)+0}{6}.$$
因此
$$V(n)=\max\left(n,\frac{1}{6}\sum_{i=1}^5 V(n+i)\right).$$

从 $n=15$ 起停止是最优的：再掷一次的即时平均增量为 $(1+2+3+4+5)/6=2.5$，但有 $1/6$ 的概率失去所有奖金，向后递推也确认了这个停止阈值。以
$$V(15)=15,\quad V(16)=16,\quad \ldots$$
为边界向后计算，得到
$$V(14)=14.17,\quad V(13)=13.36,\quad \ldots,\quad V(0)\approx6.15.$$
因此风险中性玩家最多愿意支付约 6.15 美元。`
    }
  },
  {
    id: "green-book-problem-128",
    reason: "Brownian hitting probability derivation was garbled and answer fields were empty.",
    fields: {
      answer: raw`No drift: $5/8$. With drift $m\neq0$: $\displaystyle P_0=\frac{e^{10m}-1}{e^{10m}-e^{-6m}}$, with limit $5/8$ as $m\to0$.`,
      answerZh: raw`无漂移时为 $5/8$。漂移为 $m\neq0$ 时，$\displaystyle P_0=\frac{e^{10m}-1}{e^{10m}-e^{-6m}}$；当 $m\to0$ 时极限为 $5/8$。`,
      explanation: raw`Without drift, Brownian motion is a martingale. If $p$ is the probability of hitting $3$ before $-5$ starting from $0$, optional stopping gives
$$3p+(-5)(1-p)=0,$$
so
$$p=\frac58.$$

With drift $m$, let $P(x)$ be the probability of hitting $3$ before $-5$ starting from $x$. It solves
$$mP'(x)+\frac12P''(x)=0,\qquad -5<x<3,$$
with boundary conditions $P(-5)=0$ and $P(3)=1$. For $m\neq0$,
$$P(x)=A+Be^{-2mx}.$$
Applying the boundary conditions and evaluating at $x=0$ gives
$$P(0)=\frac{e^{10m}-1}{e^{10m}-e^{-6m}}.$$
As $m\to0$, this expression tends to $10/16=5/8$, matching the no-drift result.`,
      explanationZh: raw`无漂移时，布朗运动是鞅。若 $p$ 为从 $0$ 出发先达到 $3$ 而不是先达到 $-5$ 的概率，由可选停止定理，
$$3p+(-5)(1-p)=0,$$
所以
$$p=\frac58.$$

有漂移 $m$ 时，令 $P(x)$ 表示从 $x$ 出发先达到 $3$ 而不是 $-5$ 的概率。它满足
$$mP'(x)+\frac12P''(x)=0,\qquad -5<x<3,$$
边界条件为 $P(-5)=0$、$P(3)=1$。当 $m\neq0$，
$$P(x)=A+Be^{-2mx}.$$
代入边界条件并取 $x=0$，得到
$$P(0)=\frac{e^{10m}-1}{e^{10m}-e^{-6m}}.$$
当 $m\to0$ 时，该表达式趋于 $10/16=5/8$，与无漂移情形一致。`
    }
  },
  {
    id: "green-book-problem-139",
    reason: "Black-Scholes PDE derivation contained severe OCR formula corruption.",
    fields: {
      answer: raw`For $\tau=T-t$,
$$C(S,t)=S\,N(d_1)-K e^{-r\tau}N(d_2),$$
where
$$d_1=\frac{\ln(S/K)+(r+\sigma^2/2)\tau}{\sigma\sqrt{\tau}},\qquad d_2=d_1-\sigma\sqrt{\tau}.$$`,
      answerZh: raw`令 $\tau=T-t$，
$$C(S,t)=S\,N(d_1)-K e^{-r\tau}N(d_2),$$
其中
$$d_1=\frac{\ln(S/K)+(r+\sigma^2/2)\tau}{\sigma\sqrt{\tau}},\qquad d_2=d_1-\sigma\sqrt{\tau}.$$`,
      explanation: raw`The Black-Scholes-Merton PDE for a non-dividend-paying stock is
$$V_t+rS V_S+\frac12\sigma^2S^2V_{SS}-rV=0,$$
with terminal condition
$$V(S,T)=\max(S-K,0).$$
Let $\tau=T-t$ and transform the stock variable with $x=\ln S$. After the standard change of variables and discounting transformation, the PDE becomes a heat equation. Solving that heat equation by convolution with the normal density and transforming back yields
$$C(S,t)=S\,N(d_1)-K e^{-r\tau}N(d_2),$$
where
$$d_1=\frac{\ln(S/K)+(r+\sigma^2/2)\tau}{\sigma\sqrt{\tau}},\qquad d_2=d_1-\sigma\sqrt{\tau}.$$
This is the usual Black-Scholes formula for a European call on a non-dividend-paying stock.`,
      explanationZh: raw`非分红股票的 Black-Scholes-Merton PDE 为
$$V_t+rS V_S+\frac12\sigma^2S^2V_{SS}-rV=0,$$
终端条件为
$$V(S,T)=\max(S-K,0).$$
令 $\tau=T-t$，并用 $x=\ln S$ 变换股票价格变量。经过标准变量替换和贴现变换后，该 PDE 可化为热方程。用正态密度卷积求解热方程，再变换回原变量，得到
$$C(S,t)=S\,N(d_1)-K e^{-r\tau}N(d_2),$$
其中
$$d_1=\frac{\ln(S/K)+(r+\sigma^2/2)\tau}{\sigma\sqrt{\tau}},\qquad d_2=d_1-\sigma\sqrt{\tau}.$$
这就是非分红股票欧式看涨期权的 Black-Scholes 公式。`
    }
  },
  {
    id: "green-book-problem-140",
    reason: "Perpetual one-touch option prompt/explanation had untranslated fragments and no answer.",
    fields: {
      titleEn: "D. Perpetual one-touch option with zero interest rate",
      titleZh: "D. 零利率下的永久触碰期权",
      answer: raw`\(\frac{1}{H}\).`,
      answerZh: raw`\(\frac{1}{H}\)。`,
      promptEn: raw`Assume zero interest rate and a non-dividend-paying stock with current price $S_0=1$. When the stock price first hits level $H>1$, you may exercise an option and receive 1 dollar. What is the option worth today?`,
      promptZh: raw`假设利率为零，且一只不分红股票当前价格为 $S_0=1$。当股票价格第一次达到水平 $H>1$ 时，你可以行使期权并获得 1 美元。这个期权今天值多少钱？`,
      explanation: raw`The simplest argument is no-arbitrage. To receive 1 dollar exactly when the stock first reaches $H$, buy $1/H$ shares of the stock today. This costs $1/H$ because $S_0=1$. When the stock reaches $H$, those shares are worth
$$\frac{1}{H}\cdot H=1,$$
which exactly replicates the payoff.

Therefore the option value cannot differ from the cost of the replicating strategy:
$$V_0=\frac{1}{H}.$$`,
      explanationZh: raw`最简单的方法是无套利复制。为了在股票第一次达到 $H$ 时得到 1 美元，今天买入 $1/H$ 股股票。由于 $S_0=1$，成本为 $1/H$。当股票达到 $H$ 时，这些股票价值
$$\frac{1}{H}\cdot H=1,$$
正好复制期权收益。

因此期权价值必须等于复制策略成本：
$$V_0=\frac{1}{H}.$$`
    }
  },
  {
    id: "green-book-problem-141",
    reason: "Inverse-stock payoff title/prompt was truncated and Ito derivation was garbled.",
    fields: {
      titleEn: "E. Value of a contract paying the inverse stock price",
      titleZh: "E. 支付股票价格倒数的合约价值",
      answer: raw`If $\tau=T-t$, then $\displaystyle V_t=\frac{1}{S_t}e^{(\sigma^2-2r)\tau}$.`,
      answerZh: raw`若 $\tau=T-t$，则 $\displaystyle V_t=\frac{1}{S_t}e^{(\sigma^2-2r)\tau}$。`,
      promptEn: "E. Assume a non-dividend-paying stock follows geometric Brownian motion. What is the value of a contract that at maturity T pays the inverse of the stock price observed at maturity?",
      promptZh: "E. 假设一只不分红股票服从几何布朗运动。一个合约在到期日 T 支付到期股票价格的倒数，它的价值是多少？",
      explanation: raw`Under the risk-neutral measure,
$$dS_t=rS_t\,dt+\sigma S_t\,dW_t.$$
For $\tau=T-t$,
$$S_T=S_t\exp\left((r-\tfrac12\sigma^2)\tau+\sigma\sqrt{\tau}Z\right),\qquad Z\sim N(0,1).$$
Thus
$$\frac{1}{S_T}=\frac{1}{S_t}\exp\left(-(r-\tfrac12\sigma^2)\tau-\sigma\sqrt{\tau}Z\right).$$
Using $E[e^{aZ}]=e^{a^2/2}$,
$$E^Q\left[\frac{1}{S_T}\mid S_t\right]
=\frac{1}{S_t}e^{-r\tau+\sigma^2\tau}.$$
Discounting at rate $r$ gives
$$V_t=e^{-r\tau}E^Q\left[\frac{1}{S_T}\mid S_t\right]
=\frac{1}{S_t}e^{(\sigma^2-2r)\tau}.$$`,
      explanationZh: raw`在风险中性测度下，
$$dS_t=rS_t\,dt+\sigma S_t\,dW_t.$$
令 $\tau=T-t$，
$$S_T=S_t\exp\left((r-\tfrac12\sigma^2)\tau+\sigma\sqrt{\tau}Z\right),\qquad Z\sim N(0,1).$$
因此
$$\frac{1}{S_T}=\frac{1}{S_t}\exp\left(-(r-\tfrac12\sigma^2)\tau-\sigma\sqrt{\tau}Z\right).$$
利用 $E[e^{aZ}]=e^{a^2/2}$，
$$E^Q\left[\frac{1}{S_T}\mid S_t\right]
=\frac{1}{S_t}e^{-r\tau+\sigma^2\tau}.$$
再以利率 $r$ 贴现，得到
$$V_t=e^{-r\tau}E^Q\left[\frac{1}{S_T}\mid S_t\right]
=\frac{1}{S_t}e^{(\sigma^2-2r)\tau}.$$`
    }
  },
  {
    id: "green-book-problem-145",
    reason: "ATM call approximation formulas were OCR-corrupted and answer fields were empty.",
    fields: {
      answer: raw`For low rates and short maturity, an at-the-money call is approximately $\displaystyle C\approx S\,\sigma\sqrt{\frac{T}{2\pi}}$.`,
      answerZh: raw`在低利率、短期限下，平值看涨期权近似为 $\displaystyle C\approx S\,\sigma\sqrt{\frac{T}{2\pi}}$。`,
      explanation: raw`For an at-the-money call with $S=K$, low interest rate, and short maturity $T$, the Black-Scholes price is approximately
$$C\approx S\left(N(d_1)-N(d_2)\right).$$
Here
$$d_1\approx \frac{\sigma\sqrt T}{2},\qquad d_2\approx-\frac{\sigma\sqrt T}{2}.$$
For small $x$, $N(x)-N(-x)\approx 2x\phi(0)$, where $\phi(0)=1/\sqrt{2\pi}$. Therefore
$$C\approx S\cdot \sigma\sqrt T\cdot\frac{1}{\sqrt{2\pi}}
=S\,\sigma\sqrt{\frac{T}{2\pi}}.$$
This is the common quick estimate used for short-dated ATM options.`,
      explanationZh: raw`对平值看涨期权 $S=K$，在低利率和短期限 $T$ 下，Black-Scholes 价格可近似为
$$C\approx S\left(N(d_1)-N(d_2)\right).$$
此时
$$d_1\approx \frac{\sigma\sqrt T}{2},\qquad d_2\approx-\frac{\sigma\sqrt T}{2}.$$
当 $x$ 较小时，$N(x)-N(-x)\approx 2x\phi(0)$，其中 $\phi(0)=1/\sqrt{2\pi}$。因此
$$C\approx S\cdot \sigma\sqrt T\cdot\frac{1}{\sqrt{2\pi}}
=S\,\sigma\sqrt{\frac{T}{2\pi}}.$$
这是短期限平值期权常用的快速估算式。`
    }
  },
  {
    id: "green-book-problem-157",
    reason: "VaR explanation had untranslated English, malformed quantile notation, and no answer summary.",
    fields: {
      answer: "VaR is a loss quantile over a horizon at a chosen confidence level. Its key drawbacks are tail blindness and lack of subadditivity; for derivatives with skewed or jumpy losses, VaR can materially understate risk.",
      answerZh: "VaR 是给定期限和置信水平下的损失分位数。主要缺点是看不到分位点之外的尾部损失，并且不一定满足次可加性；对损失偏斜或跳跃的衍生品，VaR 可能显著低估风险。",
      explanation: raw`Value at Risk at confidence level $\alpha$ is commonly defined as the loss threshold $q_\alpha$ such that losses exceed $q_\alpha$ with probability at most $1-\alpha$. Equivalently, it is an $\alpha$-quantile of the loss distribution over a specified horizon.

VaR is popular because it summarizes risk as one dollar number. Its weakness is that it says little about how bad losses are beyond the quantile. This is especially dangerous for derivatives whose payoff distributions may have jumps, skew, or fat tails.

VaR is also not always subadditive. For example, consider two independent short credit default swap positions, each with $1$ million notional, $3\%$ default probability, and zero recovery. At $95\%$ confidence, each single position has VaR $0$ because default probability is below $5\%$. But for the combined portfolio,
$$P(\text{at least one default})=1-0.97^2=0.0591>5\%,$$
so the portfolio's $95\%$ VaR is $1$ million. Thus
$$\operatorname{VaR}(A+B)>\operatorname{VaR}(A)+\operatorname{VaR}(B),$$
which contradicts the diversification intuition. Conditional VaR / expected shortfall fixes this tail issue more directly.`,
      explanationZh: raw`置信水平为 $\alpha$ 的风险价值 VaR 通常定义为一个损失阈值 $q_\alpha$，使得损失超过 $q_\alpha$ 的概率至多为 $1-\alpha$。等价地，它是在指定期限内损失分布的 $\alpha$ 分位数。

VaR 受欢迎，是因为它把风险压缩成一个美元金额。它的弱点是：它几乎不描述分位点之外的损失会有多严重。对收益分布存在跳跃、偏斜或厚尾的衍生品，这尤其危险。

VaR 也不一定满足次可加性。例如，考虑两个相互独立的信用违约掉期空头头寸，每个名义本金为 $100$ 万美元，违约概率为 $3\%$，回收率为 $0$。在 $95\%$ 置信水平下，单个头寸的 VaR 为 $0$，因为违约概率低于 $5\%$。但组合中至少一个违约的概率为
$$P(\text{至少一个违约})=1-0.97^2=0.0591>5\%,$$
因此组合的 $95\%$ VaR 为 $100$ 万美元。于是
$$\operatorname{VaR}(A+B)>\operatorname{VaR}(A)+\operatorname{VaR}(B),$$
这与分散化降低风险的直觉相矛盾。条件 VaR / expected shortfall 能更直接地处理尾部损失问题。`
    }
  },
  {
    id: "green-book-problem-158",
    reason: "Duration/convexity prompt and inverse-floater replication table were OCR-corrupted.",
    fields: {
      answer: "Price: 100. Dollar duration: about 1498. Duration: about 14.98.",
      answerZh: "价格：100。美元久期：约 1498。久期：约 14.98。",
      promptZh: "债券久期定义为价格对收益率变化的敏感度，美元久期为价格乘以久期。一个面值 100 美元、年票息率为 30% - 3r 的反向浮动利率债券 5 年后到期，票息每半年支付一次。假设当前收益率曲线在 7.5% 处为平坦曲线。求该反向浮动债券的价格和久期。",
      explanation: raw`Use cash-flow replication. The inverse floater with coupon rate $30\%-3r$ can be replicated by going long $4$ fixed-rate bonds with $7.5\%$ annual coupon and short $3$ floating-rate bonds, each with face value $100$. The initial cash flow is
$$4\cdot100-3\cdot100=100,$$
so the inverse floater price is $100$.

Dollar duration is additive across the replicating portfolio:
$$\$D_{\text{inverse}}=4\,\$D_{\text{fixed}}-3\,\$D_{\text{floating}}.$$
With a flat $7.5\%$ curve and semiannual payments, the fixed-rate bond is priced at par and has dollar duration about $410.64$. The floating-rate bond's dollar duration for the next reset is about $48.19$. Hence
$$\$D_{\text{inverse}}\approx4(410.64)-3(48.19)=1498.$$
Since the inverse floater price is $100$, its duration is
$$D_{\text{inverse}}=\frac{1498}{100}=14.98.$$`,
      explanationZh: raw`使用现金流复制。票息率为 $30\%-3r$ 的反向浮动债券，可以由做多 $4$ 只年票息率为 $7.5\%$ 的固定利率债券并做空 $3$ 只浮动利率债券复制，每只面值均为 $100$。初始现金流为
$$4\cdot100-3\cdot100=100,$$
所以反向浮动债券价格为 $100$。

美元久期在复制组合中可加：
$$\$D_{\text{inverse}}=4\,\$D_{\text{fixed}}-3\,\$D_{\text{floating}}.$$
在平坦 $7.5\%$ 收益率曲线和半年付息假设下，固定利率债券平价交易，美元久期约为 $410.64$。浮动利率债券到下一次重设的美元久期约为 $48.19$。因此
$$\$D_{\text{inverse}}\approx4(410.64)-3(48.19)=1498.$$
由于反向浮动债券价格为 $100$，其久期为
$$D_{\text{inverse}}=\frac{1498}{100}=14.98.$$`
    }
  },
  {
    id: "green-book-problem-161",
    reason: "Swap code was garbled and contained wrong symbols.",
    fields: {
      answer: raw`Use either arithmetic:
$$i=i+j,\quad j=i-j,\quad i=i-j,$$
or XOR:
$$i=i\oplus j,\quad j=i\oplus j,\quad i=i\oplus j.$$`,
      answerZh: raw`可用加减法：
$$i=i+j,\quad j=i-j,\quad i=i-j,$$
也可用异或：
$$i=i\oplus j,\quad j=i\oplus j,\quad i=i\oplus j.$$`,
      explanation: raw`The arithmetic version stores the sum in $i$, recovers the old $i$ into $j$, and then recovers the old $j$ into $i$:

void swap(int &i, int &j) {
  i = i + j;
  j = i - j;
  i = i - j;
}

The XOR version uses $x\oplus x=0$ and $x\oplus0=x$:

void swap(int &i, int &j) {
  i = i ^ j;
  j = i ^ j;
  i = i ^ j;
}

In production code, a temporary variable is usually clearer, and the arithmetic version can overflow.`,
      explanationZh: raw`加减法版本先把和存入 $i$，再把旧的 $i$ 恢复到 $j$，最后把旧的 $j$ 恢复到 $i$：

void swap(int &i, int &j) {
  i = i + j;
  j = i - j;
  i = i - j;
}

异或版本利用 $x\oplus x=0$ 和 $x\oplus0=x$：

void swap(int &i, int &j) {
  i = i ^ j;
  j = i ^ j;
  i = i ^ j;
}

实际工程中，临时变量通常更清晰；加减法版本还可能发生整数溢出。`
    }
  },
  {
    id: "green-book-problem-162",
    reason: "Chinese code comments mistranslated reserve/reallocation.",
    fields: {
      answer: "Scan the sorted array once and append an element only when it differs from the previous element; time O(n), extra output space O(k).",
      answerZh: "线性扫描排序数组，只在当前元素不同于前一个元素时加入结果；时间复杂度 O(n)，输出空间 O(k)。",
      explanation: raw`Because the array is sorted, equal elements are adjacent. Push the first value, then scan from left to right and push $a[i]$ exactly when $a[i]\neq a[i-1]$.

template <class T>
vector<T> uniqueValues(T a[], int n) {
  vector<T> result;
  if (n <= 0) return result;
  result.reserve(n); // avoid repeated reallocations
  result.push_back(a[0]);
  for (int i = 1; i < n; ++i) {
    if (a[i] != a[i - 1]) result.push_back(a[i]);
  }
  return result;
}

This is an $O(n)$ pass over the array.`,
      explanationZh: raw`因为数组已经排序，相同元素一定相邻。先加入第一个值，然后从左到右扫描；仅当 $a[i]\neq a[i-1]$ 时加入 $a[i]$。

template <class T>
vector<T> uniqueValues(T a[], int n) {
  vector<T> result;
  if (n <= 0) return result;
  result.reserve(n); // 避免反复重新分配内存
  result.push_back(a[0]);
  for (int i = 1; i < n; ++i) {
    if (a[i] != a[i - 1]) result.push_back(a[i]);
  }
  return result;
}

该算法只需线性扫描一次，时间复杂度为 $O(n)$。`
    }
  },
  {
    id: "green-book-problem-163",
    reason: "Horner was mistranscribed as Homer and polynomial subscripts were corrupted.",
    fields: {
      answer: raw`Use Horner's method:
$$y=A_n; \quad y=yx+A_{n-1};\quad \ldots;\quad y=yx+A_0,$$
which takes $O(n)$ multiplications.`,
      answerZh: raw`使用霍纳算法：
$$y=A_n; \quad y=yx+A_{n-1};\quad \ldots;\quad y=yx+A_0,$$
只需 $O(n)$ 次乘法。`,
      promptEn: raw`Write an algorithm to compute
$$y=A_0+A_1x+A_2x^2+\cdots+A_nx^n.$$`,
      promptZh: raw`写一个算法计算
$$y=A_0+A_1x+A_2x^2+\cdots+A_nx^n.$$`,
      explanation: raw`Rewrite the polynomial as
$$y=(\cdots((A_nx+A_{n-1})x+A_{n-2})x+\cdots+A_1)x+A_0.$$
Then compute it from the highest coefficient down:

y = A[n];
for (int k = n - 1; k >= 0; --k) {
  y = y * x + A[k];
}

The naive method repeatedly computes powers of $x$ and can take $O(n^2)$ multiplications. Horner's method uses one multiplication per coefficient after $A_n$, so it is $O(n)$.`,
      explanationZh: raw`把多项式改写为
$$y=(\cdots((A_nx+A_{n-1})x+A_{n-2})x+\cdots+A_1)x+A_0.$$
然后从最高次系数向下计算：

y = A[n];
for (int k = n - 1; k >= 0; --k) {
  y = y * x + A[k];
}

朴素方法会反复计算 $x$ 的幂，可能需要 $O(n^2)$ 次乘法。霍纳算法每个后续系数只需一次乘法，因此复杂度为 $O(n)$。`
    }
  },
  {
    id: "green-book-problem-164",
    reason: "Moving-average indexing notation was corrupted.",
    fields: {
      answer: "Maintain a rolling sum: initialize the sum of the first n values, then update by subtracting the element leaving the window and adding the new element. Time O(m).",
      answerZh: "维护滚动和：先计算前 n 个元素之和，然后每步减去离开窗口的元素、加上新进入窗口的元素。时间复杂度 O(m)。",
      promptEn: raw`Given a large array $A$ of length $m$, develop an efficient algorithm to compute the $n$-element moving average
$$B_i=\frac{A_{i-n+1}+A_{i-n+2}+\cdots+A_i}{n},\qquad i=n,n+1,\ldots,m.$$`,
      promptZh: raw`给定长度为 $m$ 的大数组 $A$，设计一个高效算法计算 $n$ 元素移动平均：
$$B_i=\frac{A_{i-n+1}+A_{i-n+2}+\cdots+A_i}{n},\qquad i=n,n+1,\ldots,m.$$`,
      explanation: raw`Compute the first window sum
$$S=A_1+\cdots+A_n,$$
then set $B_n=S/n$. For each $i=n+1,\ldots,m$, update
$$S\leftarrow S-A_{i-n}+A_i,$$
and set
$$B_i=S/n.$$
Each array element is added once and subtracted once, so the algorithm runs in $O(m)$ time.`,
      explanationZh: raw`先计算第一个窗口之和
$$S=A_1+\cdots+A_n,$$
并令 $B_n=S/n$。对每个 $i=n+1,\ldots,m$，更新
$$S\leftarrow S-A_{i-n}+A_i,$$
再令
$$B_i=S/n.$$
每个数组元素至多被加一次、减一次，因此算法时间复杂度为 $O(m)$。`
    }
  },
  {
    id: "green-book-problem-165",
    reason: "Sorting complexity notation was corrupted.",
    fields: {
      answer: "Insertion sort: average/worst O(n^2). Merge sort: O(n log n). Quicksort: average O(n log n), worst O(n^2).",
      answerZh: "插入排序：平均/最坏 O(n^2)。归并排序：O(n log n)。快速排序：平均 O(n log n)，最坏 O(n^2)。",
      promptEn: raw`Explain three sorting algorithms for sorting $n$ distinct values $A_1,\ldots,A_n$, and analyze the complexity of each algorithm.`,
      promptZh: raw`解释三种用于排序 $n$ 个不同值 $A_1,\ldots,A_n$ 的排序算法，并分析各自复杂度。`,
      explanation: raw`Insertion sort builds a sorted prefix. To insert the $i$th element into the sorted prefix may require $O(i)$ comparisons, so the total average and worst-case time is $O(n^2)$.

Merge sort divides the array into two halves, recursively sorts each half, and merges two sorted halves in linear time. Its recurrence is
$$T(n)=2T(n/2)+O(n),$$
so
$$T(n)=O(n\log n).$$

Quicksort chooses a pivot, partitions the array into elements smaller and larger than the pivot, and recursively sorts both parts. With a random pivot or random input, the average time is $O(n\log n)$. In the worst case, if the pivot repeatedly creates a split of sizes $0$ and $n-1$, the time is $O(n^2)$.`,
      explanationZh: raw`插入排序逐步维护一个已排序前缀。把第 $i$ 个元素插入已排序前缀可能需要 $O(i)$ 次比较，所以平均和最坏时间复杂度都是 $O(n^2)$。

归并排序把数组分成两半，递归排序两半，再用线性时间合并两个有序数组。递推式为
$$T(n)=2T(n/2)+O(n),$$
因此
$$T(n)=O(n\log n).$$

快速排序选择一个枢轴，把数组分成小于和大于枢轴的两部分，再递归排序。随机枢轴或随机输入下，平均复杂度为 $O(n\log n)$。最坏情况下，如果每次枢轴都产生 $0$ 和 $n-1$ 的划分，复杂度为 $O(n^2)$。`
    }
  },
  {
    id: "green-book-problem-167",
    reason: "Reservoir sampling probability notation was corrupted.",
    fields: {
      answer: "Use reservoir sampling: keep the first character; when reading the k-th character, replace the current choice with probability 1/k. At the end, every character has probability 1/m if the file has m characters.",
      answerZh: "使用蓄水池抽样：先保留第一个字符；读到第 k 个字符时，以 1/k 的概率用它替换当前选择。若文件共有 m 个字符，最终每个字符被选中的概率都是 1/m。",
      explanation: raw`This is reservoir sampling with reservoir size $1$. After reading the first character, keep it. When the $k$th character is read, replace the stored character with probability $1/k$ and keep the old stored character with probability $(k-1)/k$.

By induction, after $k$ characters have been processed, each of them is stored with probability $1/k$. When character $k+1$ arrives, each old character remains stored with probability
$$\frac1k\cdot\frac{k}{k+1}=\frac{1}{k+1},$$
and the new character is stored with probability $1/(k+1)$. Thus the invariant holds through the end of the file.`,
      explanationZh: raw`这是容量为 $1$ 的蓄水池抽样。读到第一个字符后先保留它。读到第 $k$ 个字符时，以 $1/k$ 的概率用它替换当前保存的字符，并以 $(k-1)/k$ 的概率保留旧字符。

用归纳法可知，处理完 $k$ 个字符后，每个字符被保存的概率都是 $1/k$。当第 $k+1$ 个字符到来时，每个旧字符继续被保存的概率为
$$\frac1k\cdot\frac{k}{k+1}=\frac{1}{k+1},$$
而新字符被保存的概率也是 $1/(k+1)$。因此该不变量一直保持到文件结束。`
    }
  },
  {
    id: "green-book-problem-169",
    reason: "Exponential search explanation and Chinese prompt were truncated/corrupted.",
    fields: {
      answer: "Use exponential search to bracket the first nonzero position, then binary search inside the bracket. Complexity O(log n), where n is the first nonzero position.",
      answerZh: "先用指数搜索找到第一个非零元素所在区间，再在该区间内二分搜索。若第一个非零元素位置为 n，复杂度为 O(log n)。",
      titleZh: "B. 在未知长度数组中寻找第一个非零元素",
      explanation: raw`Check positions $1,2,4,8,\ldots$ until finding a nonzero element. Suppose the first nonzero among these probes is at position $2^k$. Then the first nonzero element lies between $2^{k-1}+1$ and $2^k$.

Now run binary search in that interval, using the fact that all entries before the target position are zero and all entries from the target position onward are nonzero. The exponential search takes $O(k)$ probes and the binary search takes $O(k)$ probes. Since $2^{k-1}<n\leq2^k$, we have $k=O(\log n)$.`,
      explanationZh: raw`依次检查位置 $1,2,4,8,\ldots$，直到找到一个非零元素。假设这些探测中第一个非零位置是 $2^k$，则真正的第一个非零元素位于 $2^{k-1}+1$ 到 $2^k$ 之间。

然后在这个区间内做二分搜索，利用数组在目标位置之前全为零、从目标位置开始全为非零的性质。指数搜索需要 $O(k)$ 次探测，二分搜索也需要 $O(k)$ 次探测。由于 $2^{k-1}<n\leq2^k$，所以 $k=O(\log n)$。`
    }
  },
  {
    id: "green-book-problem-170",
    reason: "Sorted-matrix search explanation had garbled indices.",
    fields: {
      answer: "Start at the top-right corner. If the current value is larger than the target, move left; if it is smaller, move down. Complexity O(n) for an n by n grid.",
      answerZh: "从右上角开始。若当前值大于目标，向左移动；若当前值小于目标，向下移动。对 n by n 方阵，复杂度为 O(n)。",
      explanation: raw`Start at the top-right cell $(1,n)$. At any step:

- If the current value equals the target, stop.
- If the current value is greater than the target, every value below it in the same column is even larger, so eliminate that column and move left.
- If the current value is less than the target, every value to its left in the same row is even smaller, so eliminate that row and move down.

Each step removes one row or one column. In an $n\times n$ grid, there are at most $2n-1$ steps, so the complexity is $O(n)$.`,
      explanationZh: raw`从右上角单元格 $(1,n)$ 开始。每一步：

- 如果当前值等于目标，停止。
- 如果当前值大于目标，则同一列下方的值更大，可排除该列并向左移动。
- 如果当前值小于目标，则同一行左侧的值更小，可排除该行并向下移动。

每一步都会排除一行或一列。对 $n\times n$ 方阵，最多走 $2n-1$ 步，因此复杂度为 $O(n)$。`
    }
  },
  {
    id: "green-book-problem-172",
    reason: "Maximum-subarray prompt/explanation had corrupted summation notation and no answer.",
    fields: {
      answer: "Use Kadane's algorithm: update the best subarray ending at each position and the global best. Time O(n), space O(1).",
      answerZh: "使用 Kadane 算法：逐步更新“以当前位置结尾的最佳子数组”和全局最佳值。时间复杂度 O(n)，空间复杂度 O(1)。",
      promptEn: raw`Suppose you have a one-dimensional array $A$ of length $n$ containing both positive and negative numbers. Design an algorithm to find the maximum sum of any contiguous subarray
$$A[i],A[i+1],\ldots,A[j].$$`,
      promptZh: raw`假设有一个长度为 $n$ 的一维数组 $A$，其中同时包含正数和负数。设计一个算法，找出任意连续子数组
$$A[i],A[i+1],\ldots,A[j]$$
的最大和。`,
      explanation: raw`Let $bestEndingHere$ be the maximum subarray sum ending at the current position, and let $bestSoFar$ be the best sum seen so far. For each value $x$,
$$bestEndingHere=\max(x,bestEndingHere+x),$$
and
$$bestSoFar=\max(bestSoFar,bestEndingHere).$$
This is Kadane's algorithm. It scans the array once, so the time complexity is $O(n)$ and the extra space is $O(1)$.`,
      explanationZh: raw`令 $bestEndingHere$ 表示以当前位置结尾的最大子数组和，令 $bestSoFar$ 表示目前见过的最大子数组和。对每个值 $x$，
$$bestEndingHere=\max(x,bestEndingHere+x),$$
并更新
$$bestSoFar=\max(bestSoFar,bestEndingHere).$$
这就是 Kadane 算法。它只需扫描数组一次，因此时间复杂度为 $O(n)$，额外空间为 $O(1)$。`
    }
  },
  {
    id: "green-book-problem-173",
    reason: "Power-of-two bit notation used I/l instead of 1 and lacked an answer.",
    fields: {
      answer: raw`For positive integers, check $x>0$ and $(x\ \&\ (x-1))=0$.`,
      answerZh: raw`对正整数，检查 $x>0$ 且 $(x\ \&\ (x-1))=0$。`,
      promptEn: "How do you determine whether an integer is a power of 2?",
      explanation: raw`A positive power of two has exactly one bit set in binary. For example, $8=2^3$ is $1000_2$. Subtracting $1$ flips that bit and sets all lower bits, so $7$ is $0111_2$. Therefore a positive power of two shares no set bits with one less than itself:
$$x\ \&\ (x-1)=0.$$
The positivity check is needed because $0$ also satisfies the bit expression in many languages.`,
      explanationZh: raw`正的 2 的幂在二进制中恰好只有一个 bit 为 $1$。例如 $8=2^3$ 写作 $1000_2$。减去 $1$ 会清掉这个 bit，并把更低位全变为 $1$，所以 $7$ 写作 $0111_2$。因此正的 2 的幂与它减一之后没有共同的置位 bit：
$$x\ \&\ (x-1)=0.$$
还需要检查 $x>0$，因为在许多语言中 $0$ 也会满足这个位运算表达式。`
    }
  },
  {
    id: "green-book-problem-174",
    reason: "Multiplication-by-7 explanation ended with erroneous x*7.8 and no answer.",
    fields: {
      answer: "(x << 3) - x",
      answerZh: "(x << 3) - x",
      explanation: "Use a left shift to multiply by 8, then subtract the original value. Since `x << 3` equals `8x`, `(x << 3) - x` equals `7x`.",
      explanationZh: "使用左移先乘以 8，再减去原值。由于 `x << 3` 等于 `8x`，所以 `(x << 3) - x` 等于 `7x`。"
    }
  },
  {
    id: "green-book-problem-175",
    reason: "Fair-coin simulation had I/1 OCR errors and broken binary notation.",
    fields: {
      answer: "Write p in binary and use coin tosses to generate a uniform binary number U; win iff U < p, comparing bits sequentially.",
      answerZh: "把 p 写成二进制，并用抛硬币生成一个二进制均匀随机数 U；逐位比较，若 U < p 则赢。",
      promptEn: "You are given a fair coin. Can you design a simple game using the fair coin so that your probability of winning is p, where 0 < p < 1?",
      promptZh: "给你一枚公平硬币。你能否用这枚硬币设计一个简单游戏，使你获胜的概率为 p，其中 0 < p < 1？",
      explanation: raw`Write
$$p=0.p_1p_2p_3\cdots\quad\text{in base 2},\qquad p_i\in\{0,1\}.$$
Now toss the fair coin repeatedly to generate bits
$$U=0.s_1s_2s_3\cdots,$$
where heads may be $1$ and tails $0$. Compare $U$ and $p$ bit by bit. At the first index $i$ where $s_i\neq p_i$:

- if $s_i<p_i$, declare a win;
- if $s_i>p_i$, declare a loss.

This is exactly the event $U<p$. Since the fair coin generates a uniform $U$ on $[0,1]$, the winning probability is $P(U<p)=p$. Dyadic rationals have two binary expansions, but the ambiguous equality case has probability zero; one fixed representation is enough.`,
      explanationZh: raw`把
$$p=0.p_1p_2p_3\cdots$$
写成二进制，其中 $p_i\in\{0,1\}$。然后反复抛公平硬币生成二进制位
$$U=0.s_1s_2s_3\cdots,$$
例如正面记为 $1$，反面记为 $0$。逐位比较 $U$ 和 $p$。在第一个满足 $s_i\neq p_i$ 的位置：

- 若 $s_i<p_i$，判定获胜；
- 若 $s_i>p_i$，判定失败。

这正是事件 $U<p$。公平硬币生成的 $U$ 在 $[0,1]$ 上均匀分布，因此获胜概率为 $P(U<p)=p$。二进制有限小数有两种表示，但恰好相等的情况概率为零；固定采用一种表示即可。`
    }
  },
  {
    id: "green-book-problem-177",
    reason: "Monte Carlo option-pricing category and formulas were corrupted.",
    fields: {
      category: "option",
      answer: raw`Simulate risk-neutral terminal prices and discount the sample-average payoff:
$$C_0\approx e^{-rT}\frac1M\sum_{k=1}^M \max(S_T^{(k)}-K,0).$$`,
      answerZh: raw`模拟风险中性测度下的到期价格，并贴现样本平均收益：
$$C_0\approx e^{-rT}\frac1M\sum_{k=1}^M \max(S_T^{(k)}-K,0).$$`,
      explanation: raw`Under the risk-neutral measure, a geometric Brownian stock can be simulated by
$$S_{t_{i+1}}=S_{t_i}\exp\left((r-\tfrac12\sigma^2)\Delta t+\sigma\sqrt{\Delta t}\,Z_i\right),$$
where $Z_i$ are IID standard normal random variables. For a European call, path dependence is absent, so one time step to $T$ is enough:
$$S_T^{(k)}=S_0\exp\left((r-\tfrac12\sigma^2)T+\sigma\sqrt{T}\,Z_k\right).$$
For each simulated path, compute the payoff $\max(S_T^{(k)}-K,0)$. The Monte Carlo estimator is the discounted sample average:
$$C_0\approx e^{-rT}\frac1M\sum_{k=1}^M \max(S_T^{(k)}-K,0).$$`,
      explanationZh: raw`在风险中性测度下，几何布朗运动股票价格可用
$$S_{t_{i+1}}=S_{t_i}\exp\left((r-\tfrac12\sigma^2)\Delta t+\sigma\sqrt{\Delta t}\,Z_i\right),$$
其中 $Z_i$ 是独立标准正态随机变量。对欧式看涨期权，由于没有路径依赖，直接模拟到 $T$ 即可：
$$S_T^{(k)}=S_0\exp\left((r-\tfrac12\sigma^2)T+\sigma\sqrt{T}\,Z_k\right).$$
对每条模拟路径计算收益 $\max(S_T^{(k)}-K,0)$。Monte Carlo 估计量为贴现后的样本平均：
$$C_0\approx e^{-rT}\frac1M\sum_{k=1}^M \max(S_T^{(k)}-K,0).$$`
    }
  },
  {
    id: "green-book-problem-178",
    reason: "Normal-random-variable generation was categorized as coding and had garbled formulas.",
    fields: {
      category: "probabilityExpectation",
      titleEn: "B. Generate normal random variables from uniforms",
      titleZh: "B. 用均匀随机数生成正态随机变量",
      tags: ["绿皮书", "Numerical Methods", "normal distribution", "random number generation", "probability"],
      answer: raw`Generate a standard normal $Z$ from uniforms, for example $Z=\Phi^{-1}(U)$ or via Box-Muller, then return $\mu+\sigma Z$.`,
      answerZh: raw`先由均匀随机数生成标准正态 $Z$，例如 $Z=\Phi^{-1}(U)$ 或使用 Box-Muller 方法，再返回 $\mu+\sigma Z$。`,
      promptEn: raw`B. If your computer can only generate continuous uniform random variables on $[0,1]$, how can you generate random variables with distribution $N(\mu,\sigma^2)$?`,
      promptZh: raw`B. 如果计算机只能生成 $[0,1]$ 上的连续均匀随机变量，如何生成服从 $N(\mu,\sigma^2)$ 的随机变量？`,
      explanation: raw`One general method is inverse transform sampling. If $U\sim U(0,1)$ and $\Phi$ is the standard normal CDF, then
$$Z=\Phi^{-1}(U)$$
has the standard normal distribution. Therefore
$$X=\mu+\sigma Z$$
has distribution $N(\mu,\sigma^2)$.

Another common method is Box-Muller. If $U_1,U_2$ are independent uniforms on $(0,1)$, then
$$Z_1=\sqrt{-2\ln U_1}\cos(2\pi U_2),\qquad
Z_2=\sqrt{-2\ln U_1}\sin(2\pi U_2)$$
are independent standard normal random variables. Scaling by $\mu+\sigma Z$ gives the desired normal distribution.`,
      explanationZh: raw`一种通用方法是逆变换抽样。若 $U\sim U(0,1)$，且 $\Phi$ 为标准正态分布函数，则
$$Z=\Phi^{-1}(U)$$
服从标准正态分布。因此
$$X=\mu+\sigma Z$$
服从 $N(\mu,\sigma^2)$。

另一种常用方法是 Box-Muller。若 $U_1,U_2$ 是 $(0,1)$ 上独立均匀随机变量，则
$$Z_1=\sqrt{-2\ln U_1}\cos(2\pi U_2),\qquad
Z_2=\sqrt{-2\ln U_1}\sin(2\pi U_2)$$
是两个独立标准正态随机变量。再用 $\mu+\sigma Z$ 缩放，即得到目标正态分布。`
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
