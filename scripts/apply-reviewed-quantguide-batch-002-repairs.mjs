import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const raw = String.raw;
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const options = parseArgs(process.argv.slice(2));
const sourcePath = path.resolve(projectRoot, options.source || "data/question-banks/quantguide/problems.json");
const reportPath = path.resolve(projectRoot, options.report || "artifacts/question-bank-quality-review/quantguide-batch-002-reviewed-repairs-report.json");
const payload = readJson(sourcePath, { problems: [] });
const problems = Array.isArray(payload) ? payload : payload.problems || [];
const problemById = new Map(problems.map((problem) => [String(problem.id || ""), problem]));
const reviewSource = "llm-full-major-triage-reviewed-repair-quantguide-batch-002-2026-06-02";

const repairs = [
  {
    id: "quantguide-5-pairwise-sum",
    reason: "Chinese explanation mistranslated the pair-sum counting step and truncated the logic.",
    fields: {
      explanation: raw`Order the five numbers as $a \leq b \leq c \leq d \leq e$. The two smallest elements have sum equal to the minimum pair sum, so $a+b=5$. The two largest elements have sum equal to the maximum pair sum, so $d+e=22$.

Each element appears in exactly four of the ten pair sums, so the sum of all ten pair sums is
$$4(a+b+c+d+e).$$
The given pair sums add to
$$5+11+11+13+13+14+16+19+22+22=146,$$
so $a+b+c+d+e=146/4=36.5$. Since $a+b=5$ and $d+e=22$, we get $c=36.5-5-22=9.5$.

The next smallest pair sum after $a+b$ is $a+c$, so $a+c=11$ and $a=1.5$. Then $b=3.5$. Similarly, the next largest pair sum before $d+e$ is $c+e$, so $c+e=22$ and $e=12.5$. Finally, $d=22-e=9.5$.

Thus
$$(a,b,c,d,e)=(1.5,3.5,9.5,9.5,12.5),$$
and
$$a^2+b^2+c^2+d^2+e^2=1.5^2+3.5^2+9.5^2+9.5^2+12.5^2=351.25=\frac{1405}{4}.$$`,
      explanationZh: raw`先将五个数排序为 $a \leq b \leq c \leq d \leq e$。最小的两两和一定是 $a+b=5$，最大的两两和一定是 $d+e=22$。每个元素都会和另外四个元素各相加一次，所以十个两两和的总和等于
$$4(a+b+c+d+e).$$

给定两两和之和为
$$5+11+11+13+13+14+16+19+22+22=146,$$
因此 $a+b+c+d+e=146/4=36.5$。又因为 $a+b=5$ 且 $d+e=22$，所以 $c=36.5-5-22=9.5$。

排序后，除 $a+b$ 外的最小和是 $a+c$，所以 $a+c=11$，得到 $a=1.5$，进而 $b=3.5$。同理，除 $d+e$ 外的最大和是 $c+e$，因此 $c+e=22$，得到 $e=12.5$，再由 $d+e=22$ 得 $d=9.5$。

所以
$$(a,b,c,d,e)=(1.5,3.5,9.5,9.5,12.5),$$
并且
$$a^2+b^2+c^2+d^2+e^2=1.5^2+3.5^2+9.5^2+9.5^2+12.5^2=351.25=\frac{1405}{4}.$$`
    }
  },
  {
    id: "quantguide-77-multiple-ii",
    reason: "Old explanation was arithmetically correct but needlessly confusing.",
    fields: {
      explanation: raw`The smallest multiple of $77$ that is at least $700{,}000$ is obtained by taking the ceiling of $700{,}000/77$:
$$\frac{700{,}000}{77}=9090.909\ldots,$$
so the required multiplier is $9091$. Therefore
$$77\cdot 9091=700{,}007.$$`,
      explanationZh: raw`至少为 $700{,}000$ 的最小 $77$ 的倍数，可以通过取 $700{,}000/77$ 的上整得到：
$$\frac{700{,}000}{77}=9090.909\ldots,$$
所以所需乘数为 $9091$。因此
$$77\cdot 9091=700{,}007.$$`
    }
  },
  {
    id: "quantguide-9-for-1",
    reason: "Explanation used an off-by-one digit index despite the final answer being correct.",
    fields: {
      explanation: raw`Let $X_i$ be the digit in the $10^i$ place, for $i=0,1,\ldots,7$. Because $k$ is chosen uniformly from $\{0,1,\ldots,8\}$ and then the positions of the $1$s are chosen uniformly, each fixed digit position is equally likely to be $1$ or $9$. Hence
$$\mathbb{E}[X_i]=\frac{1+9}{2}=5.$$

By linearity of expectation,
$$X=\sum_{i=0}^{7}10^iX_i,$$
so
$$\mathbb{E}[X]=\sum_{i=0}^{7}10^i\mathbb{E}[X_i]=5(10^7+10^6+\cdots+10+1)=5\cdot 11111111=55555555.$$`,
      explanationZh: raw`令 $X_i$ 表示 $10^i$ 位上的数字，其中 $i=0,1,\ldots,7$。由于 $k$ 在 $\{0,1,\ldots,8\}$ 中均匀选取，随后 $1$ 的位置也均匀选取，所以任意固定数位上出现 $1$ 和 $9$ 的概率相同。因此
$$\mathbb{E}[X_i]=\frac{1+9}{2}=5.$$

利用期望线性性，
$$X=\sum_{i=0}^{7}10^iX_i,$$
于是
$$\mathbb{E}[X]=\sum_{i=0}^{7}10^i\mathbb{E}[X_i]=5(10^7+10^6+\cdots+10+1)=5\cdot 11111111=55555555.$$`
    }
  },
  {
    id: "quantguide-bank-account-arbitrage",
    reason: "Explanation reversed the high-rate and low-rate accounts and did not state the integer trade explicitly.",
    fields: {
      answer: "0.02",
      answerEn: "0.02",
      answerZh: "0.02",
      explanation: raw`Borrow one integer unit from the lower-rate account $B_2$ and deposit one integer unit into the higher-rate account $B_1$. The initial net cash flow is zero. After one year, the deposit grows to $e^{0.04}$, while the amount owed is $e^{0.02}$.

The guaranteed profit is therefore
$$e^{0.04}-e^{0.02}\approx 0.0206,$$
which rounds to $0.02$ to two decimal places.`,
      explanationZh: raw`从低利率账户 $B_2$ 借入 $1$ 个整数单位，并把这 $1$ 个单位存入高利率账户 $B_1$。初始净现金流为零。一年后，存款增长为 $e^{0.04}$，债务增长为 $e^{0.02}$。

因此保证利润为
$$e^{0.04}-e^{0.02}\approx 0.0206,$$
四舍五入到两位小数为 $0.02$。`
    }
  },
  {
    id: "quantguide-basic-dice-game-iv",
    reason: "English explanation was flagged as truncated; rewrite with the final summation explicit.",
    fields: {
      explanation: raw`Condition on the first roll $X_1=i$. Let $A_i$ be the expected additional total from rolls after the first one, while the game is still trying to avoid rolling $i$.

On the next roll, with probability $1/6$ we roll $i$ again, add $i$, and return to the same state. With probability $5/6$ we roll one of the other five faces and stop; conditional on not rolling $i$, the expected stopping roll is $(21-i)/5$. Thus
$$A_i=\frac{1}{6}(i+A_i)+\frac{5}{6}\cdot\frac{21-i}{5}.$$
Solving gives $A_i=21/5$, independent of $i$. Therefore
$$\mathbb{E}[T\mid X_1=i]=i+\frac{21}{5}.$$
Averaging over the six equally likely first rolls,
$$\mathbb{E}[T]=\frac{1}{6}\sum_{i=1}^{6}\left(i+\frac{21}{5}\right)=\frac{7}{2}+\frac{21}{5}=\frac{77}{10}=7.7.$$`,
      explanationZh: raw`以第一次掷出的点数 $X_1=i$ 为条件。令 $A_i$ 表示第一次之后、在仍需避免再次掷出 $i$ 的状态下，还会获得的额外点数期望。

下一次掷骰时，以概率 $1/6$ 再次掷出 $i$，于是增加 $i$ 点并回到同一状态；以概率 $5/6$ 掷出其他点数并停止。在已知没有掷出 $i$ 的条件下，停止那次掷骰的期望点数为 $(21-i)/5$。因此
$$A_i=\frac{1}{6}(i+A_i)+\frac{5}{6}\cdot\frac{21-i}{5}.$$
解得 $A_i=21/5$，与 $i$ 无关。所以
$$\mathbb{E}[T\mid X_1=i]=i+\frac{21}{5}.$$
对六种等可能的第一次点数取平均，
$$\mathbb{E}[T]=\frac{1}{6}\sum_{i=1}^{6}\left(i+\frac{21}{5}\right)=\frac{7}{2}+\frac{21}{5}=\frac{77}{10}=7.7.$$`
    }
  },
  {
    id: "quantguide-beer-barrel-i",
    reason: "Old explanation had the right answer but an unclear transaction count.",
    fields: {
      explanation: raw`In this version, beer poured out of a measuring vessel cannot be returned to the barrel. Use the 7-quart vessel to discard $98$ quarts first: fill the 7-quart vessel from the barrel and dump it out, repeated $14$ times. This costs $28$ transactions and leaves $22$ quarts in the barrel.

From state $(B,7,5)=(22,0,0)$, use these $14$ more transactions, where the tuple records the amounts in the barrel, 7-quart vessel, and 5-quart vessel after each transaction:

1. $B\to7$: $(15,7,0)$
2. $7\to5$: $(15,2,5)$
3. dump $5$: $(15,2,0)$
4. $7\to5$: $(15,0,2)$
5. $B\to7$: $(8,7,2)$
6. $7\to5$: $(8,4,5)$
7. dump $5$: $(8,4,0)$
8. $7\to5$: $(8,0,4)$
9. $B\to7$: $(1,7,4)$
10. $7\to5$: $(1,6,5)$
11. dump $5$: $(1,6,0)$
12. $7\to5$: $(1,1,5)$
13. dump $5$: $(1,1,0)$
14. $B\to5$: $(0,1,1)$

Thus the task is completed in $28+14=42$ transactions.`,
      explanationZh: raw`在这一版本中，从量器倒出的啤酒不能倒回桶中。先用 7 夸脱量器倒掉 $98$ 夸脱：从桶中装满 7 夸脱量器再倒掉，重复 $14$ 次。这需要 $28$ 次 transaction，桶中剩下 $22$ 夸脱。

从状态 $(B,7,5)=(22,0,0)$ 开始，再做以下 $14$ 次操作；元组记录每次操作后桶、7 夸脱量器、5 夸脱量器中的酒量：

1. $B\to7$: $(15,7,0)$
2. $7\to5$: $(15,2,5)$
3. 倒掉 $5$: $(15,2,0)$
4. $7\to5$: $(15,0,2)$
5. $B\to7$: $(8,7,2)$
6. $7\to5$: $(8,4,5)$
7. 倒掉 $5$: $(8,4,0)$
8. $7\to5$: $(8,0,4)$
9. $B\to7$: $(1,7,4)$
10. $7\to5$: $(1,6,5)$
11. 倒掉 $5$: $(1,6,0)$
12. $7\to5$: $(1,1,5)$
13. 倒掉 $5$: $(1,1,0)$
14. $B\to5$: $(0,1,1)$

因此总共需要 $28+14=42$ 次 transaction。`
    }
  },
  {
    id: "quantguide-beer-barrel-ii",
    reason: "Old explanation had confusing steps; rewrite as a consistent 17-transaction path.",
    fields: {
      explanation: raw`Because this version allows pouring beer from a vessel back into the barrel, the following 17-transaction path works. The state $(B,7,5)$ records the amounts in the barrel, the 7-quart vessel, and the 5-quart vessel.

1. $B\to7$: $(113,7,0)$
2. $B\to5$: $(108,7,5)$
3. dump the remaining barrel contents: $(0,7,5)$
4. $5\to B$: $(5,7,0)$
5. $7\to5$: $(5,2,5)$
6. $5\to B$: $(10,2,0)$
7. $7\to5$: $(10,0,2)$
8. $B\to7$: $(3,7,2)$
9. $7\to5$: $(3,4,5)$
10. $5\to B$: $(8,4,0)$
11. $7\to5$: $(8,0,4)$
12. $B\to7$: $(1,7,4)$
13. $7\to5$: $(1,6,5)$
14. dump $5$: $(1,6,0)$
15. $7\to5$: $(1,1,5)$
16. dump $5$: $(1,1,0)$
17. $B\to5$: $(0,1,1)$

Both vessels now contain exactly one quart, so the answer is $17$.`,
      explanationZh: raw`这一版本允许把量器中的啤酒倒回桶中，因此可以用下面的 17 次 transaction 完成。状态 $(B,7,5)$ 分别表示桶、7 夸脱量器、5 夸脱量器中的酒量。

1. $B\to7$: $(113,7,0)$
2. $B\to5$: $(108,7,5)$
3. 倒掉桶中剩余啤酒: $(0,7,5)$
4. $5\to B$: $(5,7,0)$
5. $7\to5$: $(5,2,5)$
6. $5\to B$: $(10,2,0)$
7. $7\to5$: $(10,0,2)$
8. $B\to7$: $(3,7,2)$
9. $7\to5$: $(3,4,5)$
10. $5\to B$: $(8,4,0)$
11. $7\to5$: $(8,0,4)$
12. $B\to7$: $(1,7,4)$
13. $7\to5$: $(1,6,5)$
14. 倒掉 $5$: $(1,6,0)$
15. $7\to5$: $(1,1,5)$
16. 倒掉 $5$: $(1,1,0)$
17. $B\to5$: $(0,1,1)$

此时两个量器中都正好有 1 夸脱，因此答案是 $17$。`
    }
  },
  {
    id: "quantguide-bowl-of-cherries-iii",
    reason: "The answer is correct, but the old explanation used the wrong event symbol and invited a false objection.",
    fields: {
      explanation: raw`After the transfer, bowl $B$ contains $400+200=600$ cherries. A uniformly chosen cherry from bowl $B$ has probability $200/600=1/3$ of being one of the transferred cherries from bowl $A$, and probability $400/600=2/3$ of being originally from bowl $B$.

Among cherries from bowl $A$, the red fraction is $100/400=1/4$. Among cherries originally from bowl $B$, the red fraction is $300/400=3/4$. Therefore, by total probability,
$$\mathbb{P}(R)=\frac{1}{3}\cdot\frac{1}{4}+\frac{2}{3}\cdot\frac{3}{4}=\frac{7}{12}.$$`,
      explanationZh: raw`转移之后，碗 $B$ 中共有 $400+200=600$ 颗樱桃。从碗 $B$ 均匀随机取一颗，它来自碗 $A$ 转移部分的概率为 $200/600=1/3$，来自碗 $B$ 原有部分的概率为 $400/600=2/3$。

碗 $A$ 中红樱桃比例为 $100/400=1/4$；碗 $B$ 原有樱桃中红樱桃比例为 $300/400=3/4$。因此由全概率公式，
$$\mathbb{P}(R)=\frac{1}{3}\cdot\frac{1}{4}+\frac{2}{3}\cdot\frac{3}{4}=\frac{7}{12}.$$`
    }
  },
  {
    id: "quantguide-bowl-of-cherries-iv",
    reason: "The answer is correct, but the explanation needed a transfer-color derivation.",
    fields: {
      explanation: raw`Condition on the color of the cherry transferred from bowl $A$.

With probability $4/9$, a red cherry is transferred. Then bowl $B$ has $7$ red cherries out of $10$, so the probability of eating a red cherry is $7/10$.

With probability $5/9$, a purple cherry is transferred. Then bowl $B$ has $6$ red cherries out of $10$, so the probability of eating a red cherry is $6/10$.

Therefore
$$\mathbb{P}(R)=\frac{4}{9}\cdot\frac{7}{10}+\frac{5}{9}\cdot\frac{6}{10}=\frac{58}{90}=\frac{29}{45}.$$`,
      explanationZh: raw`按从碗 $A$ 转移的樱桃颜色分类讨论。

以概率 $4/9$，转移的是红樱桃。此时碗 $B$ 中共有 $10$ 颗樱桃，其中 $7$ 颗红樱桃，所以吃到红樱桃的概率为 $7/10$。

以概率 $5/9$，转移的是紫樱桃。此时碗 $B$ 中共有 $10$ 颗樱桃，其中 $6$ 颗红樱桃，所以吃到红樱桃的概率为 $6/10$。

因此
$$\mathbb{P}(R)=\frac{4}{9}\cdot\frac{7}{10}+\frac{5}{9}\cdot\frac{6}{10}=\frac{58}{90}=\frac{29}{45}.$$`
    }
  },
  {
    id: "quantguide-brownian-supremum",
    reason: "Old explanation did not directly connect the zero-one event to the requested supremum probability.",
    fields: {
      explanation: raw`For any fixed $t>0$, Brownian scaling gives
$$\mathbb{P}(M_t>0)=\mathbb{P}\left(\sup_{0\leq s\leq t}W_s>0\right).$$
By the reflection principle, for $a\geq0$,
$$\mathbb{P}(M_t\geq a)=2\mathbb{P}(W_t\geq a).$$
Taking $a=0$ and using continuity of the normal distribution gives
$$\mathbb{P}(M_t>0)=2\mathbb{P}(W_t>0)=1.$$
Equivalently, Brownian motion almost surely visits positive values immediately after time $0$.`,
      explanationZh: raw`对任意固定的 $t>0$，
$$\mathbb{P}(M_t>0)=\mathbb{P}\left(\sup_{0\leq s\leq t}W_s>0\right).$$
由反射原理，对 $a\geq0$ 有
$$\mathbb{P}(M_t\geq a)=2\mathbb{P}(W_t\geq a).$$
令 $a=0$，并利用正态分布连续性，得到
$$\mathbb{P}(M_t>0)=2\mathbb{P}(W_t>0)=1.$$
等价地，布朗运动几乎必然在时间 $0$ 后立即访问正值。`
    }
  },
  {
    id: "quantguide-bull-call-spread-i",
    reason: "Payoff cap was mistyped in the old explanation.",
    fields: {
      explanation: raw`The payoff of the bull call spread is
$$V_T=(S_T-5)^+-(S_T-10)^+.$$
Thus
$$
V_T=
\begin{cases}
0, & S_T\leq 5,\\
S_T-5, & 5<S_T<10,\\
5, & S_T\geq 10.
\end{cases}
$$
The minimum payoff is $0$ and the maximum payoff is $5$. Therefore
$$\max^2+\min^2=5^2+0^2=25.$$`,
      explanationZh: raw`这个牛市看涨价差的收益为
$$V_T=(S_T-5)^+-(S_T-10)^+.$$
因此
$$
V_T=
\begin{cases}
0, & S_T\leq 5,\\
S_T-5, & 5<S_T<10,\\
5, & S_T\geq 10.
\end{cases}
$$
最小收益为 $0$，最大收益为 $5$。所以
$$\max^2+\min^2=5^2+0^2=25.$$`
    }
  },
  {
    id: "quantguide-card-diff",
    reason: "Add the final profit-minus-query-cost conclusion explicitly.",
    fields: {
      explanation: raw`The maximum possible product is $9\cdot10=90$, so the goal is to identify the $9$ and $10$ while spending as little as possible.

Pick one reference card and reveal its difference from up to $11$ of the other $12$ cards. If the reference card is a face card with value $0$, the differences identify where the $9$ and $10$ are; if one of them is the only unrevealed card, it is determined by elimination. If the reference card is not $0$, then seeing two equal differences to face cards identifies the reference value, and the same set of differences locates the $9$ and $10$; again, the last missing card can be inferred by elimination.

Thus $11$ paid difference queries are enough in the worst case to locate the $9$ and $10$. The guaranteed profit is therefore
$$9\cdot10-11=79.$$`,
      explanationZh: raw`最大可能乘积是 $9\cdot10=90$，所以目标是在尽量少花钱的情况下确定 $9$ 和 $10$ 的位置。

先选一张参考牌，并最多向另外 $12$ 张牌中的 $11$ 张询问与它的差值。如果参考牌是面牌，数值为 $0$，这些差值会直接标出 $9$ 和 $10$；如果其中一张是唯一未询问的牌，也可由排除法确定。如果参考牌不是 $0$，那么看到两个与面牌对应的相同差值后，就能确定参考牌的数值，同一组差值也能定位 $9$ 和 $10$；最后未询问的一张同样可由排除法推出。

因此最坏情况下支付 $11$ 次差值查询就足以定位 $9$ 和 $10$。保证利润为
$$9\cdot10-11=79.$$`
    }
  },
  {
    id: "quantguide-circular-slice-ii",
    reason: "Complete the conditioning step for the final conditional probability.",
    fields: {
      explanation: raw`Scale the circle to circumference $1$. From Circular Slice I, the probability that the two arcs are disjoint is $1/6$, so the probability that they intersect at least once is $5/6$.

There are exactly two purple regions precisely when the blue arc covers both endpoints of the red arc. With red arc $[0,\theta_1]$ and blue arc starting at $\alpha$, this requires
$$\alpha<\theta_1 \quad\text{and}\quad \alpha+\theta_2>1.$$
Conditioning on $\alpha=x$,
$$\mathbb{P}(\theta_1>x,\theta_2>1-x)= (1-x)x.$$
Hence
$$\mathbb{P}(\text{two purple regions})=\int_0^1 x(1-x)\,dx=\frac{1}{6}.$$

Let $A$ be the event that there is at least one purple region, and let $E$ be the event that there is exactly one purple region. The question asks for $\mathbb{P}(E\mid A)$, not the unconditional probability $\mathbb{P}(E)$.

The three unconditional cases are disjoint: zero purple regions, exactly one purple region, and two purple regions. We have
$$\mathbb{P}(\text{zero purple regions})=\frac{1}{6},\qquad \mathbb{P}(\text{two purple regions})=\frac{1}{6}.$$
Therefore the unconditional probability of exactly one purple region is
$$\mathbb{P}(E)=1-\mathbb{P}(\text{zero purple regions})-\mathbb{P}(\text{two purple regions})=1-\frac{1}{6}-\frac{1}{6}=\frac{2}{3}.$$
Also $\mathbb{P}(A)=5/6$. Since $E\subset A$, the requested conditional probability is
$$\mathbb{P}(E\mid A)=\frac{\mathbb{P}(E)}{\mathbb{P}(A)}=\frac{2/3}{5/6}=\frac{4}{5}.$$`,
      explanationZh: raw`把圆周长度缩放为 $1$。由 Circular Slice I 可知，两段圆弧不相交的概率是 $1/6$，因此至少相交一次的概率是 $5/6$。

恰好有两个紫色区域，当且仅当蓝色圆弧同时覆盖红色圆弧的两个端点。设红色圆弧为 $[0,\theta_1]$，蓝色圆弧从 $\alpha$ 开始，则需要
$$\alpha<\theta_1 \quad\text{且}\quad \alpha+\theta_2>1.$$
在 $\alpha=x$ 条件下，
$$\mathbb{P}(\theta_1>x,\theta_2>1-x)= (1-x)x.$$
因此
$$\mathbb{P}(\text{两个紫色区域})=\int_0^1 x(1-x)\,dx=\frac{1}{6}.$$

令 $A$ 表示至少有一个紫色区域，$E$ 表示恰好有一个紫色区域。题目要求的是 $\mathbb{P}(E\mid A)$，而不是无条件概率 $\mathbb{P}(E)$。

三个无条件情形互斥：没有紫色区域、恰好一个紫色区域、两个紫色区域。我们有
$$\mathbb{P}(\text{没有紫色区域})=\frac{1}{6},\qquad \mathbb{P}(\text{两个紫色区域})=\frac{1}{6}.$$
所以恰好一个紫色区域的无条件概率为
$$\mathbb{P}(E)=1-\mathbb{P}(\text{没有紫色区域})-\mathbb{P}(\text{两个紫色区域})=1-\frac{1}{6}-\frac{1}{6}=\frac{2}{3}.$$
另外 $\mathbb{P}(A)=5/6$。由于 $E\subset A$，题目要求的条件概率为
$$\mathbb{P}(E\mid A)=\frac{\mathbb{P}(E)}{\mathbb{P}(A)}=\frac{2/3}{5/6}=\frac{4}{5}.$$`
    }
  },
  {
    id: "quantguide-coin-pair-iv",
    reason: "Remove garbled wording and keep the dynamic-programming derivation complete.",
    fields: {
      explanation: raw`Let $e_i$ be the expected additional number of coin flips needed once there are $i$ heads among the four coins. If $i=3$ or $i=4$, fewer than two tails remain, so $e_3=e_4=0$.

When $i=2$, we flip the two tails. The result has two new heads with probability $1/4$, one new head with probability $1/2$, and zero new heads with probability $1/4$. Hence
$$e_2=\frac14(2+e_4)+\frac12(2+e_3)+\frac14(2+e_2),$$
so $e_2=8/3$.

Similarly,
$$e_1=\frac14(2+e_3)+\frac12(2+e_2)+\frac14(2+e_1)=\frac{40}{9},$$
and
$$e_0=\frac14(2+e_2)+\frac12(2+e_1)+\frac14(2+e_0)=\frac{176}{27}.$$

The initial four flips give $X\sim\operatorname{Binom}(4,1/2)$ heads. Therefore
$$\mathbb{E}[T]=4+\frac{1}{16}e_0+\frac{4}{16}e_1+\frac{6}{16}e_2=\frac{176}{27}.$$`,
      explanationZh: raw`令 $e_i$ 表示四枚硬币中已有 $i$ 个正面时，还需要的额外抛币次数期望。若 $i=3$ 或 $i=4$，剩余反面少于两个，不能继续操作，所以 $e_3=e_4=0$。

当 $i=2$ 时，重新抛两枚反面硬币。以概率 $1/4$ 新增两个正面，以概率 $1/2$ 新增一个正面，以概率 $1/4$ 不新增正面。因此
$$e_2=\frac14(2+e_4)+\frac12(2+e_3)+\frac14(2+e_2),$$
解得 $e_2=8/3$。

类似地，
$$e_1=\frac14(2+e_3)+\frac12(2+e_2)+\frac14(2+e_1)=\frac{40}{9},$$
以及
$$e_0=\frac14(2+e_2)+\frac12(2+e_1)+\frac14(2+e_0)=\frac{176}{27}.$$

最初四次抛币得到的正面数 $X\sim\operatorname{Binom}(4,1/2)$。所以
$$\mathbb{E}[T]=4+\frac{1}{16}e_0+\frac{4}{16}e_1+\frac{6}{16}e_2=\frac{176}{27}.$$`
    }
  },
  {
    id: "quantguide-consecutive-pairs",
    reason: "Make the final count explicit and remove ambiguity about the tiling trick.",
    fields: {
      explanation: raw`Use a tiling representation with one extra uncovered slot before $1$. A tile $UC$ represents an uncovered integer followed by a covered integer, so different $UC$ tiles create selected integers that are separated from each other. One special tile $UCC$ creates exactly one adjacent selected pair.

If the subset has $r$ selected integers, then one $UCC$ tile accounts for two of them and $r-2$ additional $UC$ tiles account for the rest. The remaining positions are $U$ tiles. For $r=2,3,4,5,6$, the numbers of arrangements are
$$9,\quad 56,\quad 105,\quad 60,\quad 5.$$
Adding these mutually exclusive cases gives
$$9+56+105+60+5=235.$$`,
      explanationZh: raw`使用铺砖表示，并在整数 $1$ 前额外放一个未覆盖位置。瓷砖 $UC$ 表示一个未覆盖整数后接一个被选中的整数，因此不同 $UC$ 瓷砖产生的被选整数互不相邻。唯一的特殊瓷砖 $UCC$ 产生恰好一对相邻的被选整数。

若子集有 $r$ 个被选整数，则一块 $UCC$ 贡献其中两个，另外 $r-2$ 块 $UC$ 贡献剩余被选整数，其余位置由 $U$ 填充。对 $r=2,3,4,5,6$，排列数分别为
$$9,\quad 56,\quad 105,\quad 60,\quad 5.$$
这些情况互斥且穷尽，因此总数为
$$9+56+105+60+5=235.$$`
    }
  },
  {
    id: "quantguide-couple-pairs",
    reason: "Final inclusion-exclusion expression used an equivalent fraction but looked inconsistent.",
    fields: {
      explanation: raw`Label the couples $1,2,3$, and let $C_i$ be the event that couple $i$ is paired together. By inclusion-exclusion,
$$\mathbb{P}(C_1\cup C_2\cup C_3)=3\mathbb{P}(C_1)-3\mathbb{P}(C_1\cap C_2)+\mathbb{P}(C_1\cap C_2\cap C_3).$$

For a fixed person in couple $1$, exactly one of the other five people is their partner, so $\mathbb{P}(C_1)=1/5$. Given $C_1$, for a fixed person in couple $2$, exactly one of the remaining three people is their partner, so
$$\mathbb{P}(C_1\cap C_2)=\frac15\cdot\frac13=\frac{1}{15}.$$
If two couples are paired together, the third couple is automatically paired together, so $\mathbb{P}(C_1\cap C_2\cap C_3)=1/15$.

Therefore
$$3\cdot\frac15-3\cdot\frac{1}{15}+\frac{1}{15}=\frac{7}{15}.$$`,
      explanationZh: raw`给三对夫妻标号为 $1,2,3$，令 $C_i$ 表示第 $i$ 对夫妻被配在一起的事件。由容斥公式，
$$\mathbb{P}(C_1\cup C_2\cup C_3)=3\mathbb{P}(C_1)-3\mathbb{P}(C_1\cap C_2)+\mathbb{P}(C_1\cap C_2\cap C_3).$$

固定第 $1$ 对夫妻中的一人，剩余五人中恰好一人是其配偶，因此 $\mathbb{P}(C_1)=1/5$。在 $C_1$ 已发生的条件下，固定第 $2$ 对夫妻中的一人，剩余三人中恰好一人是其配偶，所以
$$\mathbb{P}(C_1\cap C_2)=\frac15\cdot\frac13=\frac{1}{15}.$$
如果两对夫妻都配在一起，第三对也必然配在一起，因此 $\mathbb{P}(C_1\cap C_2\cap C_3)=1/15$。

所以
$$3\cdot\frac15-3\cdot\frac{1}{15}+\frac{1}{15}=\frac{7}{15}.$$`
    }
  },
  {
    id: "quantguide-covariance-review-v",
    reason: "Old explanation was mostly correct but contained notation typos and incomplete-looking integrals.",
    fields: {
      explanation: raw`Normalize first:
$$1=\int_0^1\int_0^{x_2}c(1-x_2)\,dx_1\,dx_2=c\int_0^1x_2(1-x_2)\,dx_2=\frac{c}{6},$$
so $c=6$.

The marginals are
$$f_{X_1}(x_1)=\int_{x_1}^{1}6(1-x_2)\,dx_2=3-6x_1+3x_1^2,$$
and
$$f_{X_2}(x_2)=\int_0^{x_2}6(1-x_2)\,dx_1=6x_2-6x_2^2.$$
Thus
$$\mathbb{E}[X_1]=\frac14,\quad \mathbb{E}[X_2]=\frac12,\quad \mathbb{E}[X_1^2]=\frac{1}{10},\quad \mathbb{E}[X_2^2]=\frac{3}{10}.$$
Also
$$\mathbb{E}[X_1X_2]=\int_0^1\int_0^{x_2}6x_1x_2(1-x_2)\,dx_1\,dx_2=\frac{3}{20}.$$
Therefore
$$\operatorname{Cov}(X_1,X_2)=\frac{3}{20}-\frac14\cdot\frac12=\frac{1}{40},$$
$$\operatorname{Var}(X_1)=\frac{1}{10}-\frac{1}{16}=\frac{3}{80},\qquad \operatorname{Var}(X_2)=\frac{3}{10}-\frac14=\frac{1}{20}.$$
Finally,
$$\operatorname{Var}(2X_1-4X_2)=4\operatorname{Var}(X_1)+16\operatorname{Var}(X_2)-16\operatorname{Cov}(X_1,X_2)=\frac{11}{20}.$$`,
      explanationZh: raw`先归一化：
$$1=\int_0^1\int_0^{x_2}c(1-x_2)\,dx_1\,dx_2=c\int_0^1x_2(1-x_2)\,dx_2=\frac{c}{6},$$
所以 $c=6$。

边缘密度为
$$f_{X_1}(x_1)=\int_{x_1}^{1}6(1-x_2)\,dx_2=3-6x_1+3x_1^2,$$
以及
$$f_{X_2}(x_2)=\int_0^{x_2}6(1-x_2)\,dx_1=6x_2-6x_2^2.$$
因此
$$\mathbb{E}[X_1]=\frac14,\quad \mathbb{E}[X_2]=\frac12,\quad \mathbb{E}[X_1^2]=\frac{1}{10},\quad \mathbb{E}[X_2^2]=\frac{3}{10}.$$
另外
$$\mathbb{E}[X_1X_2]=\int_0^1\int_0^{x_2}6x_1x_2(1-x_2)\,dx_1\,dx_2=\frac{3}{20}.$$
所以
$$\operatorname{Cov}(X_1,X_2)=\frac{3}{20}-\frac14\cdot\frac12=\frac{1}{40},$$
$$\operatorname{Var}(X_1)=\frac{1}{10}-\frac{1}{16}=\frac{3}{80},\qquad \operatorname{Var}(X_2)=\frac{3}{10}-\frac14=\frac{1}{20}.$$
最终
$$\operatorname{Var}(2X_1-4X_2)=4\operatorname{Var}(X_1)+16\operatorname{Var}(X_2)-16\operatorname{Cov}(X_1,X_2)=\frac{11}{20}.$$`
    }
  },
  {
    id: "quantguide-find-the-triangle",
    reason: "Replace incorrect area formula with Heron's formula.",
    fields: {
      explanation: raw`Let the three side lengths be consecutive integers and let one of the heights be the fourth consecutive integer. The triangle that works has side lengths $13,14,15$ and height $12$ to the side of length $14$.

Check this with Heron's formula. The semiperimeter is
$$s=\frac{13+14+15}{2}=21,$$
so the area is
$$A=\sqrt{21(21-13)(21-14)(21-15)}=\sqrt{21\cdot8\cdot7\cdot6}=84.$$
Using base $14$, the height is
$$h=\frac{2A}{14}=12,$$
so the sides and height are indeed the four consecutive whole numbers $12,13,14,15$. The area is $84$.`,
      explanationZh: raw`设三条边为连续整数，且某条边上的高是第四个连续整数。符合条件的三角形边长为 $13,14,15$，以长度 $14$ 的边为底时高为 $12$。

用海伦公式验证。半周长为
$$s=\frac{13+14+15}{2}=21,$$
所以面积为
$$A=\sqrt{21(21-13)(21-14)(21-15)}=\sqrt{21\cdot8\cdot7\cdot6}=84.$$
以 $14$ 为底时，高为
$$h=\frac{2A}{14}=12,$$
因此边长和高确实是四个连续整数 $12,13,14,15$。面积为 $84$。`
    }
  },
  {
    id: "quantguide-fixed-point-limit-i",
    reason: "Poisson probability had the wrong exponential factor in the explanation.",
    fields: {
      explanation: raw`For each $i\in S_n$, the event $f(i)=i$ has probability $1/n$, and these events are independent for a uniformly random function. Hence
$$F_n\sim\operatorname{Binom}\left(n,\frac1n\right).$$
By the Poisson limit theorem, $F_n$ converges in distribution to $\operatorname{Pois}(1)$. Therefore
$$\lim_{n\to\infty}\mathbb{P}(F_n=5)=e^{-1}\frac{1^5}{5!}=\frac{1}{120e}.$$
Since the limit is $c/e$, we have $c=1/120$.`,
      explanationZh: raw`对每个 $i\in S_n$，事件 $f(i)=i$ 的概率为 $1/n$，并且对均匀随机函数而言这些事件相互独立。因此
$$F_n\sim\operatorname{Binom}\left(n,\frac1n\right).$$
由泊松极限定理，$F_n$ 依分布收敛到 $\operatorname{Pois}(1)$。所以
$$\lim_{n\to\infty}\mathbb{P}(F_n=5)=e^{-1}\frac{1^5}{5!}=\frac{1}{120e}.$$
由于极限写成 $c/e$，得到 $c=1/120$。`
    }
  },
  {
    id: "quantguide-increasing-uniform-chain",
    reason: "Clarify that the requested answer is coefficient sum, not the expectation itself.",
    fields: {
      explanation: raw`Let $f(x)$ be the expected final maximum given that the current maximum is $x$. With probability $x$, the next sample is below $x$ and the process stops with value $x$. If the next value is $y>x$, the process continues from state $y$. Therefore
$$f(x)=x^2+\int_x^1 f(y)\,dy.$$
Differentiating gives
$$f'(x)=2x-f(x),\qquad f(1)=1.$$
Solving the linear ODE gives
$$f(x)=2(x-1)+e^{1-x}.$$
Thus
$$f(0)=e-2.$$
The expectation is $a+be$ with $a=-2$ and $b=1$, so the requested value is
$$a+b=-2+1=-1.$$`,
      explanationZh: raw`令 $f(x)$ 表示当前最大值为 $x$ 时，最终最大值的期望。以概率 $x$，下一次样本低于 $x$，过程停止且最终值为 $x$；若下一次样本为 $y>x$，则从状态 $y$ 继续。因此
$$f(x)=x^2+\int_x^1 f(y)\,dy.$$
两边求导得到
$$f'(x)=2x-f(x),\qquad f(1)=1.$$
解这个一阶线性微分方程，得到
$$f(x)=2(x-1)+e^{1-x}.$$
所以
$$f(0)=e-2.$$
期望写成 $a+be$ 时，$a=-2$ 且 $b=1$，因此题目要求的值是
$$a+b=-2+1=-1.$$`
    }
  },
  {
    id: "quantguide-king-activity",
    reason: "Chinese explanation used confusing permutation notation and the English formula had m instead of 4.",
    fields: {
      explanation: raw`Let $X$ be the position of the 5th king. For $X=k$, the first $k-1$ cards must contain exactly $4$ kings and $k-5$ non-kings, and the $k$th card must be a king. Thus, up to a constant factor independent of $k$,
$$\mathbb{P}(X=k)\propto \binom{k-1}{4}\frac{(40)_5(480)_{k-5}}{(520)_k},$$
where $(n)_r$ denotes a falling factorial.

To find the mode, compare consecutive probabilities:
$$\frac{\mathbb{P}(X=k+1)}{\mathbb{P}(X=k)}=\frac{k}{k-4}\cdot\frac{485-k}{520-k}.$$
The probabilities stop increasing when this ratio is at most $1$, i.e.
$$k(485-k)\leq (k-4)(520-k).$$
This simplifies to $k\geq160/3\approx53.33$, so the most likely integer position is $54$.`,
      explanationZh: raw`令 $X$ 为第 5 张 king 出现的位置。若 $X=k$，则前 $k-1$ 张牌中必须恰有 $4$ 张 king 和 $k-5$ 张非 king，且第 $k$ 张牌必须是 king。因此，忽略与 $k$ 无关的常数因子，
$$\mathbb{P}(X=k)\propto \binom{k-1}{4}\frac{(40)_5(480)_{k-5}}{(520)_k},$$
其中 $(n)_r$ 表示下降阶乘。

为了找众数，比较相邻概率：
$$\frac{\mathbb{P}(X=k+1)}{\mathbb{P}(X=k)}=\frac{k}{k-4}\cdot\frac{485-k}{520-k}.$$
当这个比值不超过 $1$ 时，概率停止增加，即
$$k(485-k)\leq (k-4)(520-k).$$
化简得 $k\geq160/3\approx53.33$，所以最可能的位置是整数 $54$。`
    }
  },
  {
    id: "quantguide-longest-rope",
    reason: "Rewrite Chinese explanation for completeness and cleaner terminology.",
    fields: {
      explanationZh: raw`设两个切点排序后为 $0<X<Y<1$，三段长度为 $X$、$Y-X$、$1-Y$。由于三段对称，最长段的期望等于在第一段为最长时 $X$ 的条件期望。

第一段最长需要
$$X>Y-X \Rightarrow Y<2X,$$
以及
$$X>1-Y \Rightarrow Y>1-X.$$
在区域 $0<X<Y<1$ 中，这些不等式对应两个三角形区域。它们的面积分别为 $1/24$ 和 $1/8$，所以条件权重为 $1/4$ 和 $3/4$。利用三角形重心，两个区域内 $X$ 的平均值分别为 $4/9$ 和 $2/3$。

因此
$$\mathbb{E}[\text{最长段}]=\mathbb{E}[X\mid X\text{ 为最长段}]=\frac14\cdot\frac49+\frac34\cdot\frac23=\frac{11}{18}.$$`
    }
  },
  {
    id: "quantguide-make-your-martingale-i",
    reason: "Clarify the coefficient convention used by the original answer.",
    fields: {
      explanation: raw`For $M_n$ to be a martingale,
$$\mathbb{E}[M_{n+1}\mid\mathcal{F}_n]=M_n.$$
Since $X_{n+1}$ is independent of $\mathcal{F}_n$,
$$\mathbb{E}[M_{n+1}\mid\mathcal{F}_n]=M_ne^c\mathbb{E}[e^{X_{n+1}}]=M_ne^c\left(\frac{e+e^{-1}}{2}\right).$$
Thus
$$e^c\left(\frac{e+e^{-1}}{2}\right)=1,$$
so
$$c=-\log\left(\frac12 e+\frac12 e^{-1}\right).$$
In the displayed form, the coefficients are $a=\frac12$, $b=1$, $c=\frac12$, and $d=-1$, so the requested sum is $1$.`,
      explanationZh: raw`要使 $M_n$ 成为鞅，需要
$$\mathbb{E}[M_{n+1}\mid\mathcal{F}_n]=M_n.$$
由于 $X_{n+1}$ 与 $\mathcal{F}_n$ 独立，
$$\mathbb{E}[M_{n+1}\mid\mathcal{F}_n]=M_ne^c\mathbb{E}[e^{X_{n+1}}]=M_ne^c\left(\frac{e+e^{-1}}{2}\right).$$
因此
$$e^c\left(\frac{e+e^{-1}}{2}\right)=1,$$
所以
$$c=-\log\left(\frac12 e+\frac12 e^{-1}\right).$$
按这个表达式，系数为 $a=\frac12$、$b=1$、$c=\frac12$、$d=-1$，其和为 $1$。`
    }
  },
  {
    id: "quantguide-marble-mischief",
    reason: "Answer is correct, but explanation needed a clearer order-statistic argument.",
    fields: {
      explanation: raw`Think of the draw order as a uniformly random permutation of the marbles. The desired event is that, immediately after the last red marble appears, at least one blue and at least one green marble still remain. Equivalently, the last red marble must occur before the last blue and before the last green.

If the absolute last marble is green, which has probability $600/1200=1/2$, then we also need the last marble among the red and blue marbles to be blue. Among the $200+400$ red/blue marbles, this has probability $400/600=2/3$.

If the absolute last marble is blue, which has probability $400/1200=1/3$, then we need the last marble among the red and green marbles to be green. Among the $200+600$ red/green marbles, this has probability $600/800=3/4$.

Therefore
$$\mathbb{P}(R)=\frac12\cdot\frac23+\frac13\cdot\frac34=\frac{7}{12}.$$`,
      explanationZh: raw`把抽取顺序看成所有弹珠的一个均匀随机排列。题目要求最后一个红弹珠出现后，至少还有一个蓝弹珠和一个绿弹珠留在 urn 中。等价地，最后一个红弹珠必须早于最后一个蓝弹珠，也早于最后一个绿弹珠。

若绝对最后一个弹珠是绿色，概率为 $600/1200=1/2$，则还需要红蓝两色中最后出现的是蓝色。在 $200+400$ 个红/蓝弹珠中，最后一个为蓝色的概率是 $400/600=2/3$。

若绝对最后一个弹珠是蓝色，概率为 $400/1200=1/3$，则还需要红绿两色中最后出现的是绿色。在 $200+600$ 个红/绿弹珠中，最后一个为绿色的概率是 $600/800=3/4$。

因此
$$\mathbb{P}(R)=\frac12\cdot\frac23+\frac13\cdot\frac34=\frac{7}{12}.$$`
    }
  },
  {
    id: "quantguide-meek-mill",
    reason: "Bayes formula denominator was mislabeled in prose.",
    fields: {
      explanation: raw`Let $P$ be the event that Meek Mill performs, $L$ the event that he is in Philadelphia, and $B$ the event that he is in Baltimore. We want
$$\mathbb{P}(L\mid P)=\frac{\mathbb{P}(P\mid L)\mathbb{P}(L)}{\mathbb{P}(P\mid L)\mathbb{P}(L)+\mathbb{P}(P\mid B)\mathbb{P}(B)}.$$
The problem gives $\mathbb{P}(L)=0.8$, $\mathbb{P}(B)=0.2$, $\mathbb{P}(P\mid L)=0.1$, and $\mathbb{P}(P\mid B)=0.8$. Therefore
$$\mathbb{P}(L\mid P)=\frac{0.1\cdot0.8}{0.1\cdot0.8+0.8\cdot0.2}=\frac{0.08}{0.24}=\frac13.$$`,
      explanationZh: raw`令 $P$ 表示 Meek Mill 演出，$L$ 表示他在 Philadelphia，$B$ 表示他在 Baltimore。要求
$$\mathbb{P}(L\mid P)=\frac{\mathbb{P}(P\mid L)\mathbb{P}(L)}{\mathbb{P}(P\mid L)\mathbb{P}(L)+\mathbb{P}(P\mid B)\mathbb{P}(B)}.$$
题目给出 $\mathbb{P}(L)=0.8$，$\mathbb{P}(B)=0.2$，$\mathbb{P}(P\mid L)=0.1$，$\mathbb{P}(P\mid B)=0.8$。因此
$$\mathbb{P}(L\mid P)=\frac{0.1\cdot0.8}{0.1\cdot0.8+0.8\cdot0.2}=\frac{0.08}{0.24}=\frac13.$$`
    }
  },
  {
    id: "quantguide-nonuniform-fix",
    reason: "Answer is correct; explanation needed to use the beta support and probability integral transform explicitly.",
    fields: {
      explanation: raw`Let $F$ be the CDF of the $\operatorname{Beta}(12,8)$ distribution. Conditional on $T=t$, each $X_i$ exceeds $t$ with probability $1-F(t)$, so
$$N\mid T=t\sim\operatorname{Geom}(1-F(t)),$$
using the convention that a geometric random variable counts trials until the first success. Hence
$$\mathbb{E}[N\mid T=t]=\frac{1}{1-F(t)}.$$

By the probability integral transform, $U=F(T)\sim\operatorname{Unif}(0,1)$ because the beta distribution is continuous. Therefore
$$\mathbb{E}[N]=\mathbb{E}\left[\frac{1}{1-U}\right]=\int_0^1\frac{1}{1-u}\,du=\infty.$$
Thus the expectation is not finite, and the answer is $-1$.`,
      explanationZh: raw`令 $F$ 为 $\operatorname{Beta}(12,8)$ 分布的 CDF。在给定 $T=t$ 的条件下，每个 $X_i$ 超过 $t$ 的概率为 $1-F(t)$，所以
$$N\mid T=t\sim\operatorname{Geom}(1-F(t)),$$
这里几何分布表示直到第一次成功所需的试验次数。因此
$$\mathbb{E}[N\mid T=t]=\frac{1}{1-F(t)}.$$

由于 beta 分布连续，由概率积分变换可知 $U=F(T)\sim\operatorname{Unif}(0,1)$。因此
$$\mathbb{E}[N]=\mathbb{E}\left[\frac{1}{1-U}\right]=\int_0^1\frac{1}{1-u}\,du=\infty.$$
所以期望不是有限值，答案为 $-1$。`
    }
  },
  {
    id: "quantguide-normal-lotus-ii",
    reason: "Make the LOTUS integral explicit.",
    fields: {
      explanation: raw`The joint density factors as
$$10ye^{-5x}I_{(0,\infty)}(x)I_{(0,1)}(y)=\left(5e^{-5x}I_{(0,\infty)}(x)\right)\left(2yI_{(0,1)}(y)\right),$$
so $X$ and $Y$ are independent, $X\sim\operatorname{Exp}(5)$, and $Y$ has density $2y$ on $(0,1)$.

Thus
$$\mathbb{E}\left[\frac{X^2}{Y}\right]=\mathbb{E}[X^2]\mathbb{E}\left[\frac1Y\right].$$
For $X\sim\operatorname{Exp}(5)$, $\mathbb{E}[X^2]=2/25$. By LOTUS,
$$\mathbb{E}\left[\frac1Y\right]=\int_0^1\frac1y\cdot 2y\,dy=\int_0^1 2\,dy=2.$$
Therefore the expectation is $4/25$.`,
      explanationZh: raw`联合密度可分解为
$$10ye^{-5x}I_{(0,\infty)}(x)I_{(0,1)}(y)=\left(5e^{-5x}I_{(0,\infty)}(x)\right)\left(2yI_{(0,1)}(y)\right),$$
所以 $X$ 与 $Y$ 独立，$X\sim\operatorname{Exp}(5)$，且 $Y$ 在 $(0,1)$ 上密度为 $2y$。

因此
$$\mathbb{E}\left[\frac{X^2}{Y}\right]=\mathbb{E}[X^2]\mathbb{E}\left[\frac1Y\right].$$
对 $X\sim\operatorname{Exp}(5)$，有 $\mathbb{E}[X^2]=2/25$。由 LOTUS，
$$\mathbb{E}\left[\frac1Y\right]=\int_0^1\frac1y\cdot 2y\,dy=\int_0^1 2\,dy=2.$$
所以所求期望为 $4/25$。`
    }
  },
  {
    id: "quantguide-odd-coefficients",
    reason: "Clarify how the final expression maps to abcd.",
    fields: {
      explanation: raw`For each odd $n$, the sum of $\binom{n}{k}$ over odd $k$ is half of all subsets of an $n$-element set, namely $2^{n-1}$. Here $n$ ranges over
$$1,3,5,\ldots,999.$$
Therefore the desired sum is
$$\sum_{j=0}^{499}2^{2j}=\sum_{j=0}^{499}4^j=\frac{4^{500}-1}{3}.$$
This is in the form $(a^b-c)/d$ with $a=4$, $b=500$, $c=1$, and $d=3$. Hence
$$abcd=4\cdot500\cdot1\cdot3=6000.$$`,
      explanationZh: raw`对每个奇数 $n$，所有奇数 $k$ 对应的二项式系数之和，等于一个 $n$ 元集合所有子集数的一半，即 $2^{n-1}$。这里
$$n=1,3,5,\ldots,999.$$
因此所求和为
$$\sum_{j=0}^{499}2^{2j}=\sum_{j=0}^{499}4^j=\frac{4^{500}-1}{3}.$$
这对应形式 $(a^b-c)/d$，其中 $a=4$、$b=500$、$c=1$、$d=3$。所以
$$abcd=4\cdot500\cdot1\cdot3=6000.$$`
    }
  },
  {
    id: "quantguide-options-dice-iii",
    reason: "Fix the payoff sentence for rolls (4,5) and (5,4).",
    fields: {
      explanation: raw`The call payoff is $(D_1D_2-19)^+$. The profitable outcomes are
$$(4,5),(5,4),(4,6),(6,4),(5,5),(5,6),(6,5),(6,6).$$
Their payoffs are respectively $1,1,5,5,6,11,11,17$. Therefore the fair value is
$$\frac{2\cdot1+2\cdot5+1\cdot6+2\cdot11+1\cdot17}{36}=\frac{57}{36}=\frac{19}{12}.$$

A $2$-unit wide market centered at the theoretical value has bid $19/12-1=7/12$ and ask $19/12+1=31/12$. The sum of bid and ask is
$$\frac{7}{12}+\frac{31}{12}=\frac{19}{6}.$$`,
      explanationZh: raw`该看涨期权收益为 $(D_1D_2-19)^+$。有正收益的结果是
$$(4,5),(5,4),(4,6),(6,4),(5,5),(5,6),(6,5),(6,6).$$
对应收益分别为 $1,1,5,5,6,11,11,17$。因此公平价值为
$$\frac{2\cdot1+2\cdot5+1\cdot6+2\cdot11+1\cdot17}{36}=\frac{57}{36}=\frac{19}{12}.$$

以理论价值为中心做 $2$ 单位宽的市场，bid 为 $19/12-1=7/12$，ask 为 $19/12+1=31/12$。bid 与 ask 之和为
$$\frac{7}{12}+\frac{31}{12}=\frac{19}{6}.$$`
    }
  },
  {
    id: "quantguide-paired-pumpkins",
    reason: "Final square sum listed the weights in a confusing order.",
    fields: {
      explanation: raw`Set up
$$w_1+w_2=19,\qquad w_2+w_3=21,\qquad w_1+w_3=28.$$
Subtracting the second equation from the first gives $w_1-w_3=-2$. Adding this to $w_1+w_3=28$ gives $2w_1=26$, so $w_1=13$. Then $w_2=6$ and $w_3=15$.

Therefore
$$w_1^2+w_2^2+w_3^2=13^2+6^2+15^2=430.$$`,
      explanationZh: raw`建立方程组
$$w_1+w_2=19,\qquad w_2+w_3=21,\qquad w_1+w_3=28.$$
第一个方程减去第二个方程，得到 $w_1-w_3=-2$。再与 $w_1+w_3=28$ 相加，得到 $2w_1=26$，所以 $w_1=13$。于是 $w_2=6$，$w_3=15$。

因此
$$w_1^2+w_2^2+w_3^2=13^2+6^2+15^2=430.$$`
    }
  },
  {
    id: "quantguide-particle-reach-viii",
    reason: "Explanation referred to position 9 instead of the requested position 7.",
    fields: {
      explanation: raw`Let $T$ be the total number of steps needed to go from position $0$ to position $7$. Write
$$T=T_1+\cdots+T_7,$$
where $T_i$ is the time needed to move from $i-1$ to $i$ after first reaching $i-1$. By the Markov property, the $T_i$ have the same expectation. From Particle Reach VI with $p=2/3$, the expected time to advance one net level is
$$\mathbb{E}[T_1]=\frac{1}{p-(1-p)}=\frac{1}{1/3}=3.$$
Therefore
$$\mathbb{E}[T]=7\cdot3=21.$$`,
      explanationZh: raw`令 $T$ 为从位置 $0$ 到位置 $7$ 所需的总步数。写成
$$T=T_1+\cdots+T_7,$$
其中 $T_i$ 表示首次到达 $i-1$ 后，从 $i-1$ 到 $i$ 所需的时间。由 Markov 性质，这些 $T_i$ 的期望相同。根据 Particle Reach VI，在 $p=2/3$ 时，净前进一格的期望时间为
$$\mathbb{E}[T_1]=\frac{1}{p-(1-p)}=\frac{1}{1/3}=3.$$
因此
$$\mathbb{E}[T]=7\cdot3=21.$$`
    }
  },
  {
    id: "quantguide-points-on-a-circle-iii",
    reason: "Clarify why one favorable chord set corresponds to each four-point subset.",
    fields: {
      promptZh: "圆上有 8 个点。画出每一对点之间能形成的所有弦；然后从这些弦中均匀随机选出 4 条不同的弦。这 4 条弦形成一个凸四边形的概率是多少？",
      explanation: raw`There are $\binom{8}{2}=28$ chords, so there are $\binom{28}{4}$ equally likely sets of four selected chords.

For four selected chords to form a convex quadrilateral, they must be exactly the four boundary sides of a quadrilateral whose vertices are four of the original circle points. Every choice of four circle points gives exactly one such boundary cycle: connect the four chosen points in their cyclic order. Conversely, any selected chord set that forms a convex quadrilateral determines its four vertices uniquely.

Thus the number of favorable chord sets is $\binom{8}{4}$, and the probability is
$$\frac{\binom{8}{4}}{\binom{28}{4}}=\frac{2}{585}.$$`,
      explanationZh: raw`共有 $\binom{8}{2}=28$ 条弦，因此均匀随机选择 4 条不同弦的方式数为 $\binom{28}{4}$。

若这 4 条弦形成一个凸四边形，它们必须恰好是某四个圆上点按圆周顺序连接得到的四条边。每选择 4 个圆上点，就唯一确定一个这样的边界四边形；反过来，任何形成凸四边形的 4 条弦也唯一确定其 4 个顶点。

因此有利情形数为 $\binom{8}{4}$，概率为
$$\frac{\binom{8}{4}}{\binom{28}{4}}=\frac{2}{585}.$$`
    }
  },
  {
    id: "quantguide-power-digits",
    reason: "Rewrite the modular arithmetic count without unexplained constants.",
    fields: {
      explanation: raw`Only the units digit of $m$ matters, so use $\{1,3,5,7,9\}$. There are $20$ possible values of $n$.

For units digit $1$, $m^n$ always ends in $1$, giving $20$ favorable values. For units digits $3$ and $7$, the powers cycle with period $4$, and the units digit is $1$ exactly when $n$ is divisible by $4$; among $2004,\ldots,2023$, this happens $5$ times for each digit. For units digit $5$, the powers always end in $5$. For units digit $9$, the powers alternate $9,1,9,1,\ldots$, so the units digit is $1$ exactly when $n$ is even; this happens $10$ times.

Thus the number of favorable pairs is
$$20+5+0+5+10=40.$$
There are $5\cdot20=100$ total pairs, so the probability is
$$\frac{40}{100}=\frac25.$$`,
      explanationZh: raw`只需要考虑 $m$ 的个位数，因此可用 $\{1,3,5,7,9\}$。$n$ 共有 $20$ 个可能值。

个位数为 $1$ 时，$m^n$ 总以 $1$ 结尾，贡献 $20$ 个有利值。个位数为 $3$ 或 $7$ 时，幂的个位数周期为 $4$，且当 $n$ 能被 $4$ 整除时个位数为 $1$；在 $2004,\ldots,2023$ 中，这样的 $n$ 对每个个位数各有 $5$ 个。个位数为 $5$ 时，幂总以 $5$ 结尾。个位数为 $9$ 时，幂的个位数在 $9,1,9,1,\ldots$ 间交替，所以 $n$ 为偶数时个位数为 $1$；这样的 $n$ 有 $10$ 个。

因此有利配对数为
$$20+5+0+5+10=40.$$
总配对数为 $5\cdot20=100$，所以概率为
$$\frac{40}{100}=\frac25.$$`
    }
  },
  {
    id: "quantguide-regional-manager-ii",
    reason: "Remove irrelevant sample mean and state the Type II calculation directly.",
    fields: {
      explanation: raw`Use the one-sided rejection region for testing $H_0:\mu=15$ against $H_a:\mu=16$ at $\alpha=0.05$. The sample standard deviation is $s=3$ and $n=36$, so the standard error is $3/\sqrt{36}=0.5$.

Reject $H_0$ when
$$\frac{\bar X-15}{0.5}>1.645,$$
or equivalently when $\bar X>15.8225$. Using the rounded cutoff $15.82$, the Type II error probability at $\mu=16$ is
$$\beta=\mathbb{P}_{\mu=16}(\bar X\leq15.82)=\Phi\left(\frac{15.82-16}{0.5}\right)=\Phi(-0.36)\approx0.3594.$$`,
      explanationZh: raw`在显著性水平 $\alpha=0.05$ 下，检验 $H_0:\mu=15$ 对 $H_a:\mu=16$，使用单侧拒绝域。样本标准差为 $s=3$，样本量 $n=36$，所以标准误为 $3/\sqrt{36}=0.5$。

当
$$\frac{\bar X-15}{0.5}>1.645$$
时拒绝 $H_0$，等价于 $\bar X>15.8225$。使用四舍五入后的临界值 $15.82$，在 $\mu=16$ 下的 Type II error 概率为
$$\beta=\mathbb{P}_{\mu=16}(\bar X\leq15.82)=\Phi\left(\frac{15.82-16}{0.5}\right)=\Phi(-0.36)\approx0.3594.$$`
    }
  },
  {
    id: "quantguide-square-shade",
    reason: "Clarify that 1011/2023 is the complement and 1012/2023 is the asked probability.",
    fields: {
      explanation: raw`A rectangle contains no shaded square exactly when it lies entirely above or entirely below the middle row. Since the grid has $2023$ rows, there are $1011$ rows above the middle row and $1011$ rows below it.

The total number of rectangles is
$$\binom{2024}{2}\binom{2024}{2}.$$
Within one $1011\times2023$ half-grid, the number of rectangles is
$$\binom{1012}{2}\binom{2024}{2}.$$
There are two such half-grids, so
$$\mathbb{P}(\text{no shaded square})=\frac{2\binom{1012}{2}\binom{2024}{2}}{\binom{2024}{2}\binom{2024}{2}}=\frac{1011}{2023}.$$
Therefore
$$\mathbb{P}(\text{at least one shaded square})=1-\frac{1011}{2023}=\frac{1012}{2023}.$$`,
      explanationZh: raw`一个矩形不包含阴影方块，当且仅当它完全位于中间行上方或完全位于中间行下方。由于网格有 $2023$ 行，中间行上方有 $1011$ 行，下方也有 $1011$ 行。

总矩形数为
$$\binom{2024}{2}\binom{2024}{2}.$$
在一个 $1011\times2023$ 的半网格中，矩形数为
$$\binom{1012}{2}\binom{2024}{2}.$$
这样的半网格有两个，因此
$$\mathbb{P}(\text{不含阴影方块})=\frac{2\binom{1012}{2}\binom{2024}{2}}{\binom{2024}{2}\binom{2024}{2}}=\frac{1011}{2023}.$$
所以
$$\mathbb{P}(\text{至少包含一个阴影方块})=1-\frac{1011}{2023}=\frac{1012}{2023}.$$`
    }
  },
  {
    id: "quantguide-statistical-test-review-vii",
    reason: "Rewrite beta calculation with consistent normal approximation notation.",
    fields: {
      explanation: raw`Test
$$H_0:p=0.20\qquad\text{against}\qquad H_a:p=0.15$$
with a left-tailed $0.05$-level test. Under $H_0$,
$$\operatorname{SE}_0=\sqrt{\frac{0.2(0.8)}{100}}=0.04.$$
The rejection cutoff for $\hat p$ is
$$0.20+(-1.645)(0.04)=0.1342.$$
Thus we reject for $\hat p\leq0.1342$.

The Type II error probability under Aaron's alternative $p=0.15$ is the probability of failing to reject:
$$\beta=\mathbb{P}_{p=0.15}(\hat p>0.1342).$$
Under $p=0.15$,
$$\operatorname{SE}_a=\sqrt{\frac{0.15(0.85)}{100}}\approx0.0357,$$
so
$$\beta=1-\Phi\left(\frac{0.1342-0.15}{0.0357}\right)\approx1-\Phi(-0.443)\approx0.671.$$`,
      explanationZh: raw`检验
$$H_0:p=0.20\qquad\text{对}\qquad H_a:p=0.15,$$
并使用左尾 $0.05$ 水平检验。在原假设下，
$$\operatorname{SE}_0=\sqrt{\frac{0.2(0.8)}{100}}=0.04.$$
$\hat p$ 的拒绝临界值为
$$0.20+(-1.645)(0.04)=0.1342.$$
因此当 $\hat p\leq0.1342$ 时拒绝原假设。

Aaron 的备择假设 $p=0.15$ 下，Type II error 是未拒绝原假设的概率：
$$\beta=\mathbb{P}_{p=0.15}(\hat p>0.1342).$$
在 $p=0.15$ 下，
$$\operatorname{SE}_a=\sqrt{\frac{0.15(0.85)}{100}}\approx0.0357,$$
所以
$$\beta=1-\Phi\left(\frac{0.1342-0.15}{0.0357}\right)\approx1-\Phi(-0.443)\approx0.671.$$`
    }
  },
  {
    id: "quantguide-unit-fraction-representation",
    reason: "Fix inconsistent example and denominator inequality direction.",
    fields: {
      promptEn: raw`Assume, without proof, that every rational number $0 < q < 1$ can be represented as the sum of unit fractions. For example, $$\dfrac{4}{5} = \dfrac{1}{2} + \dfrac{1}{4} + \dfrac{1}{20}.$$ Find the largest denominator in the unit fraction representation of $\dfrac{179}{720}$ that has the fewest terms and largest possible maximum denominator. In the example above, the largest denominator is $20$.`,
      promptZh: raw`不加证明地假设，每个有理数 $0 < q < 1$ 都可以表示为若干单位分数之和。例如，$$\dfrac{4}{5} = \dfrac{1}{2} + \dfrac{1}{4} + \dfrac{1}{20}.$$ 找出 $\dfrac{179}{720}$ 的单位分数表示中的最大分母，要求该表示项数最少，并且在这些最少项表示中最大分母尽可能大。在上面的例子中，最大分母是 $20$。`,
      explanation: raw`There is no two-term unit-fraction representation for $179/720$, so we look for a three-term representation with the largest possible maximum denominator.

Since
$$\frac15<\frac{179}{720}<\frac14,$$
start with $1/5$. The remainder is
$$\frac{179}{720}-\frac15=\frac{7}{144}.$$
Now
$$\frac{1}{20}>\frac{7}{144}>\frac{1}{21},$$
so choosing $1/21$ leaves
$$\frac{7}{144}-\frac{1}{21}=\frac{3}{3024}=\frac{1}{1008}.$$
Thus
$$\frac{179}{720}=\frac15+\frac{1}{21}+\frac{1}{1008},$$
and the largest denominator is $1008$.`,
      explanationZh: raw`$179/720$ 不存在两项单位分数表示，因此考虑三项表示，并在三项表示中使最大分母尽可能大。

由于
$$\frac15<\frac{179}{720}<\frac14,$$
先取 $1/5$。余数为
$$\frac{179}{720}-\frac15=\frac{7}{144}.$$
此时
$$\frac{1}{20}>\frac{7}{144}>\frac{1}{21},$$
所以取 $1/21$ 后剩下
$$\frac{7}{144}-\frac{1}{21}=\frac{3}{3024}=\frac{1}{1008}.$$
因此
$$\frac{179}{720}=\frac15+\frac{1}{21}+\frac{1}{1008},$$
最大分母为 $1008$。`
    }
  },
  {
    id: "quantguide-upface-correlation",
    reason: "Chinese explanation was garbled and both languages benefit from a shorter derivation.",
    fields: {
      explanation: raw`For each roll $i$, let $X_i$ indicate rolling a $1$ and $Y_i$ indicate rolling a $5$. Then
$$X=\sum_{i=1}^n X_i,\qquad Y=\sum_{i=1}^n Y_i.$$
For the same roll, $X_iY_i=0$ because a roll cannot be both $1$ and $5$. For different rolls $i\neq j$, $X_i$ and $Y_j$ are independent, so $\mathbb{E}[X_iY_j]=1/36$.

Thus
$$\mathbb{E}[XY]=\sum_{i\neq j}\frac{1}{36}=\frac{n(n-1)}{36}.$$
Also $\mathbb{E}[X]=\mathbb{E}[Y]=n/6$, so
$$\operatorname{Cov}(X,Y)=\frac{n(n-1)}{36}-\frac{n^2}{36}=-\frac{n}{36}.$$
Both $X$ and $Y$ are $\operatorname{Binom}(n,1/6)$, so
$$\operatorname{Var}(X)=\operatorname{Var}(Y)=n\cdot\frac16\cdot\frac56=\frac{5n}{36}.$$
Therefore
$$\operatorname{Corr}(X,Y)=\frac{-n/36}{\sqrt{5n/36}\sqrt{5n/36}}=-\frac15.$$`,
      explanationZh: raw`对第 $i$ 次掷骰，令 $X_i$ 表示掷出 $1$ 的指示变量，$Y_i$ 表示掷出 $5$ 的指示变量。则
$$X=\sum_{i=1}^n X_i,\qquad Y=\sum_{i=1}^n Y_i.$$
同一次掷骰不可能同时为 $1$ 和 $5$，所以 $X_iY_i=0$。若 $i\neq j$，则 $X_i$ 与 $Y_j$ 独立，故 $\mathbb{E}[X_iY_j]=1/36$。

因此
$$\mathbb{E}[XY]=\sum_{i\neq j}\frac{1}{36}=\frac{n(n-1)}{36}.$$
又有 $\mathbb{E}[X]=\mathbb{E}[Y]=n/6$，所以
$$\operatorname{Cov}(X,Y)=\frac{n(n-1)}{36}-\frac{n^2}{36}=-\frac{n}{36}.$$
$X$ 和 $Y$ 都服从 $\operatorname{Binom}(n,1/6)$，因此
$$\operatorname{Var}(X)=\operatorname{Var}(Y)=n\cdot\frac16\cdot\frac56=\frac{5n}{36}.$$
最终
$$\operatorname{Corr}(X,Y)=\frac{-n/36}{\sqrt{5n/36}\sqrt{5n/36}}=-\frac15.$$`
    }
  },
  {
    id: "quantguide-zero-volatility-returns",
    reason: "Clarify that the answer is the exponent a, not the ratio itself.",
    fields: {
      explanation: raw`With $\sigma=0$, the dynamics reduce to the deterministic differential equation
$$dS_t=\mu S_t\,dt.$$
Thus
$$\frac{dS_t}{S_t}=\mu\,dt.$$
Integrating from $0$ to $2$ with $\mu=1$ gives
$$\log\left(\frac{S_2}{S_0}\right)=\int_0^2 1\,dt=2.$$
Therefore $S_2/S_0=e^2$, and in the form $e^a$ the exponent is $a=2$.`,
      explanationZh: raw`当 $\sigma=0$ 时，过程化为确定性微分方程
$$dS_t=\mu S_t\,dt.$$
因此
$$\frac{dS_t}{S_t}=\mu\,dt.$$
在 $\mu=1$ 下从 $0$ 积分到 $2$，得到
$$\log\left(\frac{S_2}{S_0}\right)=\int_0^2 1\,dt=2.$$
所以 $S_2/S_0=e^2$，写成 $e^a$ 时指数为 $a=2$。`
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
