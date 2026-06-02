import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const raw = String.raw;
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const options = parseArgs(process.argv.slice(2));
const sourcePath = path.resolve(projectRoot, options.source || "data/question-banks/red-book/problems.json");
const reportPath = path.resolve(projectRoot, options.report || "artifacts/question-bank-quality-review/red-book-batch-001-reviewed-repairs-report.json");
const payload = readJson(sourcePath, { problems: [] });
const problems = Array.isArray(payload) ? payload : payload.problems || [];
const problemById = new Map(problems.map((problem) => [String(problem.id || ""), problem]));
const reviewSource = "llm-full-major-triage-reviewed-repair-red-book-batch-001-2026-06-02";

const repairs = [
  {
    id: "red-book-problem-001",
    reason: "Black-Scholes derivation and boundary-condition formulas were OCR-corrupted and answer fields were empty.",
    fields: {
      answer: raw`For a non-dividend-paying stock,
$$C_t+\frac12\sigma^2S^2C_{SS}+rSC_S-rC=0.$$
For a call, $C(t,0)=0$ and as $S\to\infty$, $C_S(t,S)\to1$ with $C(t,S)\sim S-Ke^{-r(T-t)}$.`,
      answerZh: raw`对不分红股票，
$$C_t+\frac12\sigma^2S^2C_{SS}+rSC_S-rC=0.$$
对看涨期权，$C(t,0)=0$；当 $S\to\infty$ 时，$C_S(t,S)\to1$，且 $C(t,S)\sim S-Ke^{-r(T-t)}$。`,
      explanation: raw`Under the risk-neutral measure,
$$dS_t=rS_t\,dt+\sigma S_t\,dW_t,$$
and the bank account satisfies $dB_t=rB_t\,dt$. Let $C(t,S)$ be the derivative price. Ito's lemma gives
$$dC=\left(C_t+rS C_S+\frac12\sigma^2S^2C_{SS}\right)dt+\sigma S C_S\,dW_t.$$
The discounted price $C/B$ must be a martingale, so its drift is zero. Equivalently, the drift of $C$ must be $rC$. Hence
$$C_t+rS C_S+\frac12\sigma^2S^2C_{SS}-rC=0.$$

For a European call with strike $K$, if $S=0$ then the stock remains at zero in the Black-Scholes model and the call is worthless, so $C(t,0)=0$. For very large $S$, the call is almost surely deep in the money; its delta tends to $1$ and its value behaves like the forward intrinsic value
$$C(t,S)\sim S-Ke^{-r(T-t)}.$$`,
      explanationZh: raw`在风险中性测度下，
$$dS_t=rS_t\,dt+\sigma S_t\,dW_t,$$
银行账户满足 $dB_t=rB_t\,dt$。令 $C(t,S)$ 为衍生品价格。由 Ito 引理，
$$dC=\left(C_t+rS C_S+\frac12\sigma^2S^2C_{SS}\right)dt+\sigma S C_S\,dW_t.$$
贴现价格 $C/B$ 必须是鞅，因此漂移项为零。等价地，$C$ 的漂移必须等于 $rC$。所以
$$C_t+rS C_S+\frac12\sigma^2S^2C_{SS}-rC=0.$$

对执行价为 $K$ 的欧式看涨期权，如果 $S=0$，Black-Scholes 模型下股票价格会保持为零，因此看涨期权价值为 $0$，即 $C(t,0)=0$。当 $S$ 很大时，看涨期权几乎必然深度价内；其 delta 趋于 $1$，价值近似为远期内在价值
$$C(t,S)\sim S-Ke^{-r(T-t)}.$$`
    }
  },
  {
    id: "red-book-problem-002",
    reason: "Answer field was empty; explanation had OCR-corrupted notation.",
    fields: {
      answer: raw`Use the risk-neutral stock dynamics $dS=rS\,dt+\sigma S\,dW$. Apply Ito's lemma to $C(t,S)$, then require the discounted option price to have zero drift. This gives
$$C_t+\frac12\sigma^2S^2C_{SS}+rSC_S-rC=0.$$`,
      answerZh: raw`使用风险中性股票动态 $dS=rS\,dt+\sigma S\,dW$。对 $C(t,S)$ 应用 Ito 引理，再要求贴现期权价格的漂移为零，得到
$$C_t+\frac12\sigma^2S^2C_{SS}+rSC_S-rC=0.$$`,
      explanation: raw`An undergraduate-level derivation can be framed as a no-free-money argument. In the Black-Scholes model, after changing to the risk-neutral view, the stock grows on average at the risk-free rate:
$$dS=rS\,dt+\sigma S\,dW.$$
The option price is a smooth function $C(t,S)$. Ito's lemma says its infinitesimal change is
$$dC=\left(C_t+rS C_S+\frac12\sigma^2S^2C_{SS}\right)dt+\sigma S C_S\,dW.$$
If the option is correctly priced, the discounted value of the option cannot have predictable growth; otherwise there would be arbitrage. Therefore the drift of $C$ must be $rC$. Setting the drift equal to $rC$ gives the Black-Scholes PDE:
$$C_t+\frac12\sigma^2S^2C_{SS}+rSC_S-rC=0.$$`,
      explanationZh: raw`本科生层面的推导可以理解为“不能有免费赚钱机会”的论证。在 Black-Scholes 模型中，转到风险中性视角后，股票平均按无风险利率增长：
$$dS=rS\,dt+\sigma S\,dW.$$
期权价格是当前时间和股价的光滑函数 $C(t,S)$。Ito 引理给出
$$dC=\left(C_t+rS C_S+\frac12\sigma^2S^2C_{SS}\right)dt+\sigma S C_S\,dW.$$
如果期权定价正确，贴现后的期权价值不能有可预测增长；否则会产生套利。因此 $C$ 的漂移必须等于 $rC$。令漂移等于 $rC$，得到 Black-Scholes PDE：
$$C_t+\frac12\sigma^2S^2C_{SS}+rSC_S-rC=0.$$`
    }
  },
  {
    id: "red-book-problem-003",
    reason: "Answer field was empty and the PDE formula was corrupted.",
    fields: {
      answer: raw`The Black-Scholes equation is the PDE
$$C_t+\frac12\sigma^2S^2C_{SS}+rSC_S-rC=0,$$
which an arbitrage-free derivative price must satisfy under the model assumptions. The payoff determines the terminal/boundary conditions; the PDE itself is common to European claims on the same non-dividend-paying stock.`,
      answerZh: raw`Black-Scholes 方程是 PDE
$$C_t+\frac12\sigma^2S^2C_{SS}+rSC_S-rC=0,$$
它是模型假设下无套利衍生品价格必须满足的方程。收益函数决定终端/边界条件；对同一只不分红股票上的欧式权益，该 PDE 本身相同。`,
      explanation: raw`For a derivative with price $C(t,S)$ on a non-dividend-paying stock, the Black-Scholes equation is
$$C_t+\frac12\sigma^2S^2C_{SS}+rSC_S-rC=0.$$
Here $t$ is time, $S$ is the current stock price, $r$ is the risk-free rate, and $\sigma$ is the stock volatility. The term $C_t$ captures time decay, $rSC_S$ comes from the risk-neutral drift of the stock, $\frac12\sigma^2S^2C_{SS}$ is the convexity/Ito correction, and $-rC$ discounts the derivative value.

The equation is not enough by itself: the payoff supplies the terminal condition, for example $C(T,S)=\max(S-K,0)$ for a European call. Different payoffs use the same PDE but different terminal or boundary conditions.`,
      explanationZh: raw`对不分红股票上的衍生品价格 $C(t,S)$，Black-Scholes 方程为
$$C_t+\frac12\sigma^2S^2C_{SS}+rSC_S-rC=0.$$
其中 $t$ 为时间，$S$ 为当前股价，$r$ 为无风险利率，$\sigma$ 为股票波动率。$C_t$ 表示时间变化，$rSC_S$ 来自风险中性股价漂移，$\frac12\sigma^2S^2C_{SS}$ 是凸性/Ito 修正项，$-rC$ 表示衍生品价值的贴现。

该方程本身还不够：收益函数给出终端条件。例如欧式看涨期权满足 $C(T,S)=\max(S-K,0)$。不同收益使用相同 PDE，但终端或边界条件不同。`
    }
  },
  {
    id: "red-book-problem-004",
    reason: "Answer field was empty; explanation had corrupted symbols.",
    fields: {
      answer: "With the same volatility, Black-Scholes call prices are the same despite different real-world drifts. Downward jumps make convex-payoff options such as calls more valuable than the pure Black-Scholes diffusion price, because delta hedging loses value at jumps.",
      answerZh: "若波动率相同，即使真实世界漂移不同，Black-Scholes 看涨期权价格也相同。若标的会随机向下跳跃，看涨期权这类凸收益期权通常比纯 Black-Scholes 扩散模型价格更高，因为 delta 对冲在跳跃处会亏损。",
      explanation: raw`In Black-Scholes pricing, the real-world drift is replaced by the risk-free drift under the risk-neutral measure:
$$dS_t=rS_t\,dt+\sigma S_t\,dW_t.$$
Therefore two stocks with the same current price, volatility, maturity, strike, and interest rate have the same vanilla call price even if their real-world drifts differ.

If one stock can have downward jumps, the pure Black-Scholes delta hedge is no longer exact. For a convex payoff such as a call, the Black-Scholes price as a function of spot is convex, and a tangent-line hedge lies below the price curve after a jump. A downward jump can leave the hedging portfolio below the value needed to continue replication. To avoid arbitrage, the option on the jump stock must be priced higher than the no-jump Black-Scholes price, all else equal.`,
      explanationZh: raw`在 Black-Scholes 定价中，真实世界漂移会在风险中性测度下被无风险漂移替代：
$$dS_t=rS_t\,dt+\sigma S_t\,dW_t.$$
因此，只要当前价格、波动率、期限、行权价和利率相同，即使两只股票的真实世界漂移不同，普通看涨期权价格也相同。

如果其中一只股票可能向下跳跃，纯 Black-Scholes 的 delta 对冲就不再精确。对看涨期权这类凸收益，Black-Scholes 价格作为现货价格函数是凸的，切线对冲在跳跃后会落在价格曲线下方。向下跳跃可能使对冲组合低于继续复制所需的价值。为避免套利，在其他条件相同下，跳跃股票上的期权价格应高于无跳跃 Black-Scholes 价格。`
    }
  },
  {
    id: "red-book-problem-018",
    reason: "Digital option smile/skew formulas were garbled.",
    fields: {
      answer: "A digital call is the negative strike derivative of a call price. A normal model corresponds roughly to a negative implied-volatility skew relative to a lognormal model, so the digital call price is higher than in the lognormal model when vanilla call prices are matched.",
      answerZh: "数字看涨期权等于看涨期权价格对行权价的负导数。相对于对数正态模型，正态模型大致对应负的隐含波动率偏斜；在匹配普通看涨期权价格时，数字看涨期权价格会高于对数正态模型下的价格。",
      explanation: raw`A digital call paying $1_{\{S_T>K\}}$ can be replicated as a tight call spread:
$$\text{Digital}(K)=-\frac{\partial C(K)}{\partial K}.$$
If vanilla calls are priced with an implied volatility smile, then
$$\frac{dC}{dK}=C_K+C_\sigma\,\sigma_K.$$
The no-smile lognormal price corresponds to the $-C_K$ term. The smile correction to the digital is
$$-C_\sigma\,\sigma_K.$$
Since vanilla call vega $C_\sigma$ is positive, a downward-sloping smile $\sigma_K<0$ increases the digital call price.

A normal model can be viewed roughly as a lognormal model whose implied volatility is higher for lower spot/strike levels, i.e. negative skew. Therefore, when vanilla call prices are matched, the digital call is more expensive in the normal model than in the lognormal model.`,
      explanationZh: raw`支付 $1_{\{S_T>K\}}$ 的数字看涨期权可由很窄的看涨价差复制：
$$\text{Digital}(K)=-\frac{\partial C(K)}{\partial K}.$$
如果普通看涨期权使用隐含波动率微笑定价，则
$$\frac{dC}{dK}=C_K+C_\sigma\,\sigma_K.$$
无微笑的对数正态价格对应 $-C_K$ 项。微笑对数字期权的修正为
$$-C_\sigma\,\sigma_K.$$
由于普通看涨期权 vega $C_\sigma$ 为正，向下倾斜的微笑 $\sigma_K<0$ 会提高数字看涨价格。

正态模型可粗略看成一种对数正态模型，其低现货/低行权价处的隐含波动率更高，即负偏斜。因此，在普通看涨期权价格被匹配时，正态模型下的数字看涨期权比对数正态模型下更贵。`
    }
  },
  {
    id: "red-book-problem-021",
    reason: "Normal-model ATM call formula was corrupted and answer fields were empty.",
    fields: {
      titleEn: "Question 2.21 - Estimate volatility from a normal-model ATM call",
      titleZh: "问题 2.21 - 用正态模型平值看涨期权估计波动率",
      answer: raw`If $S_T\sim N(S_0,\sigma^2T)$ and the ATM call price is $C$, then
$$C=\frac{\sigma\sqrt T}{\sqrt{2\pi}},\qquad \sigma=C\sqrt{\frac{2\pi}{T}}.$$`,
      answerZh: raw`若 $S_T\sim N(S_0,\sigma^2T)$，且平值看涨期权价格为 $C$，则
$$C=\frac{\sigma\sqrt T}{\sqrt{2\pi}},\qquad \sigma=C\sqrt{\frac{2\pi}{T}}.$$`,
      promptEn: raw`Assume the stock price at time $T$ is normally distributed as $N(S_0,\sigma^2T)$, where $S_0$ is the current price. If we know the price $C$ of an at-the-money European call expiring at $T$, how can we estimate $\sigma$?`,
      promptZh: raw`假设股票在时间 $T$ 的价格服从正态分布 $N(S_0,\sigma^2T)$，其中 $S_0$ 为当前价格。若已知到期为 $T$ 的平值欧式看涨期权价格 $C$，如何估计 $\sigma$？`,
      explanation: raw`For an at-the-money call with strike $K=S_0$ under the normal model,
$$C=E[(S_T-S_0)^+].$$
Write
$$S_T-S_0=\sigma\sqrt T\,Z,\qquad Z\sim N(0,1).$$
Then
$$C=\sigma\sqrt T\,E[Z^+].$$
Since
$$E[Z^+]=\int_0^\infty z\phi(z)\,dz=\frac{1}{\sqrt{2\pi}},$$
we get
$$C=\frac{\sigma\sqrt T}{\sqrt{2\pi}}.$$
Therefore
$$\sigma=C\sqrt{\frac{2\pi}{T}}.$$`,
      explanationZh: raw`对正态模型下行权价 $K=S_0$ 的平值看涨期权，
$$C=E[(S_T-S_0)^+].$$
写成
$$S_T-S_0=\sigma\sqrt T\,Z,\qquad Z\sim N(0,1).$$
则
$$C=\sigma\sqrt T\,E[Z^+].$$
由于
$$E[Z^+]=\int_0^\infty z\phi(z)\,dz=\frac{1}{\sqrt{2\pi}},$$
所以
$$C=\frac{\sigma\sqrt T}{\sqrt{2\pi}}.$$
因此
$$\sigma=C\sqrt{\frac{2\pi}{T}}.$$`
    }
  },
  {
    id: "red-book-problem-024",
    reason: "FX forward no-arbitrage formula had corrupted variables and stray characters.",
    fields: {
      answer: raw`If $S$ is the spot rate in euros per dollar, $r_{\mathrm{EUR}}$ is the euro rate, and $r_{\mathrm{USD}}$ is the dollar rate, the one-year forward rate is
$$F=S\frac{1+r_{\mathrm{EUR}}}{1+r_{\mathrm{USD}}}.$$`,
      answerZh: raw`若 $S$ 为欧元/美元即期汇率（每 1 美元对应多少欧元），$r_{\mathrm{EUR}}$ 为欧元利率，$r_{\mathrm{USD}}$ 为美元利率，则一年远期汇率为
$$F=S\frac{1+r_{\mathrm{EUR}}}{1+r_{\mathrm{USD}}}.$$`,
      explanation: raw`Let $S$ be euros per dollar. Buy 1 dollar today by borrowing $S$ euros. After one year, the dollar investment is worth $1+r_{\mathrm{USD}}$ dollars, while the euro loan has grown to $S(1+r_{\mathrm{EUR}})$ euros.

If the one-year forward rate is $F$ euros per dollar, no arbitrage requires
$$F(1+r_{\mathrm{USD}})=S(1+r_{\mathrm{EUR}}).$$
Therefore
$$F=S\frac{1+r_{\mathrm{EUR}}}{1+r_{\mathrm{USD}}}.$$`,
      explanationZh: raw`令 $S$ 表示每 1 美元对应多少欧元。今天借入 $S$ 欧元并买入 1 美元。一年后，美元投资变为 $1+r_{\mathrm{USD}}$ 美元，而欧元贷款变为 $S(1+r_{\mathrm{EUR}})$ 欧元。

若一年远期汇率为 $F$ 欧元/美元，无套利要求
$$F(1+r_{\mathrm{USD}})=S(1+r_{\mathrm{EUR}}).$$
因此
$$F=S\frac{1+r_{\mathrm{EUR}}}{1+r_{\mathrm{USD}}}.$$`
    }
  },
  {
    id: "red-book-problem-025",
    reason: "Digital exchange option notation was corrupted and answer fields were empty.",
    fields: {
      titleEn: "Question 2.26 - Digital option paying if one asset outperforms another",
      titleZh: "问题 2.26 - 一个资产超过另一个资产时支付的数字期权",
      answer: "Assuming the other asset's volatility and correlation are fixed, increasing the volatility of S1 lowers the digital's value if it is currently in the money (S1 > S2), but raises its value if it is currently out of the money (S1 < S2).",
      answerZh: "在另一个资产的波动率和相关性固定时，若当前价内（S1 > S2），提高 S1 的波动率会降低该数字期权价值；若当前价外（S1 < S2），提高 S1 的波动率会提高其价值。",
      promptEn: "An option pays 1 at time T if S1(T) > S2(T), and 0 otherwise. If the volatility of S1 increases while the other inputs are fixed, what happens to the value of the option?",
      promptZh: "一个期权在时间 T 若满足 S1(T) > S2(T) 则支付 1，否则支付 0。若在其他输入固定时 S1 的波动率上升，该期权价值会如何变化？",
      explanation: raw`This is a digital version of an exchange option. Holding the volatility of $S_2$ and the correlation fixed, higher volatility of $S_1$ spreads out the distribution of the relative performance $S_1/S_2$.

If the option is currently in the money, $S_1>S_2$, extra volatility increases the chance that $S_1$ finishes below $S_2$, so the digital value decreases.

If the option is currently out of the money, $S_1<S_2$, extra volatility gives $S_1$ more chance to overtake $S_2$, so the digital value increases.

At or near the money, the effect is more delicate and depends on the precise model inputs, but the interview intuition is that volatility helps out-of-the-money digitals and hurts in-the-money digitals.`,
      explanationZh: raw`这是交换期权的数字版本。在 $S_2$ 的波动率和相关性固定时，提高 $S_1$ 的波动率会拉宽相对表现 $S_1/S_2$ 的分布。

如果该期权当前价内，即 $S_1>S_2$，额外波动会提高 $S_1$ 到期低于 $S_2$ 的概率，因此数字期权价值下降。

如果该期权当前价外，即 $S_1<S_2$，额外波动给了 $S_1$ 更大概率超过 $S_2$，因此数字期权价值上升。

在平值附近，影响更依赖具体模型输入；但面试直觉是：波动率有利于价外数字期权，不利于价内数字期权。`
    }
  },
  {
    id: "red-book-problem-029",
    reason: "Black formula for call on a forward was OCR-corrupted and answer fields were empty.",
    fields: {
      answer: raw`Black's formula:
$$C=e^{-rT}\left(FN(d_1)-KN(d_2)\right),$$
where
$$d_1=\frac{\ln(F/K)+\frac12\sigma^2T}{\sigma\sqrt T},\qquad d_2=d_1-\sigma\sqrt T.$$`,
      answerZh: raw`Black 公式为
$$C=e^{-rT}\left(FN(d_1)-KN(d_2)\right),$$
其中
$$d_1=\frac{\ln(F/K)+\frac12\sigma^2T}{\sigma\sqrt T},\qquad d_2=d_1-\sigma\sqrt T.$$`,
      explanation: raw`If the underlying is the forward price $F$ and $F$ is modeled as lognormal under the appropriate forward measure, the call option is priced by Black's formula:
$$C=e^{-rT}\left(FN(d_1)-KN(d_2)\right),$$
where
$$d_1=\frac{\ln(F/K)+\frac12\sigma^2T}{\sigma\sqrt T},\qquad d_2=d_1-\sigma\sqrt T.$$
This is the same structural formula used for many interest-rate options, such as caps and swaptions, with the forward replacing the spot as the underlying.`,
      explanationZh: raw`若标的是远期价格 $F$，并且在合适的远期测度下 $F$ 服从对数正态分布，则看涨期权由 Black 公式定价：
$$C=e^{-rT}\left(FN(d_1)-KN(d_2)\right),$$
其中
$$d_1=\frac{\ln(F/K)+\frac12\sigma^2T}{\sigma\sqrt T},\qquad d_2=d_1-\sigma\sqrt T.$$
许多利率期权（如 cap 和 swaption）也使用同样结构的公式，只是用远期价格替代现货作为标的。`
    }
  },
  {
    id: "red-book-problem-033",
    reason: "Series betting hedge had no explicit first-bet answer and formulas were corrupted.",
    fields: {
      answer: "Bet 31.25 on team A in the first match, then dynamically rebalance after each game using the same binomial-tree replication logic.",
      answerZh: "第一场比赛押 31.25 在 A 队上；之后每场比赛后按同样的二叉树复制逻辑动态调整投注。",
      explanation: raw`View the series as a symmetric binomial tree. The desired net payoff is $+100$ if team A wins the series and $-100$ if it loses. After team A wins the first game, it needs at least 3 wins in the remaining 6 games. The probability of that is
$$\frac{\binom63+\binom64+\binom65+\binom66}{2^6}
=\frac{20+15+6+1}{64}
=\frac{21}{32}.$$
So the value in the up state is
$$100\cdot\frac{21}{32}-100\cdot\frac{11}{32}
=\frac{1000}{32}=31.25.$$
By symmetry, the value in the down state is $-31.25$.

A bet of $X$ on team A in the first match has net payoff $+X$ if A wins and $-X$ if A loses. Therefore choose
$$X=31.25.$$`,
      explanationZh: raw`把系列赛看成对称二叉树。目标净收益是：若 A 队赢得系列赛，则为 $+100$；若输掉系列赛，则为 $-100$。若 A 队赢下第一场，则剩余 6 场中至少还需赢 3 场。其概率为
$$\frac{\binom63+\binom64+\binom65+\binom66}{2^6}
=\frac{20+15+6+1}{64}
=\frac{21}{32}.$$
因此上行状态价值为
$$100\cdot\frac{21}{32}-100\cdot\frac{11}{32}
=\frac{1000}{32}=31.25.$$
由对称性，下行状态价值为 $-31.25$。

第一场押 $X$ 在 A 队上，若 A 赢净赚 $+X$，若 A 输净亏 $-X$。因此取
$$X=31.25.$$`
    }
  },
  {
    id: "red-book-problem-037",
    reason: "Mean-reversion volatility answer contained unrelated spillover text.",
    fields: {
      answer: "Use the 20% daily hedging volatility for pricing and hedging the short European option, because the dynamic hedge is exposed to short-horizon moves. The lower long-run mean-reversion volatility would underprice the option.",
      answerZh: "应使用 20% 的日度对冲波动率来为卖出的欧式期权定价和对冲，因为动态对冲暴露于短期价格波动。较低的长期均值回归波动率会低估期权。",
      explanation: raw`For a short option position, the practical question is the volatility of the moves you must hedge. If you delta hedge daily, your hedging error is driven by daily stock moves, not by the long-run mean-reverting behavior over ten years.

Since European option values increase with volatility, using the lower long-run annual volatility would underprice the option and leave the seller undercompensated for short-horizon hedging risk. Under the assumptions in the prompt, use the 20% daily hedging volatility.`,
      explanationZh: raw`对卖出的期权头寸，关键问题是你需要对冲的价格波动尺度。如果每天做 delta 对冲，对冲误差由日度股价变动驱动，而不是由十年尺度上的长期均值回归行为驱动。

由于欧式期权价值随波动率增加而增加，使用较低的长期年化波动率会低估期权，使卖方没有获得足够的短期对冲风险补偿。在题目假设下，应使用 20% 的日度对冲波动率。`
    }
  },
  {
    id: "red-book-problem-050",
    reason: "Binomial option price and delta computations were garbled; strike was mistranslated.",
    fields: {
      answer: "Assuming strike 100 and zero interest, the call price is 50/3 ≈ 16.67 and Delta is 2/3.",
      answerZh: "若假设执行价为 100 且利率为 0，则看涨期权价格为 50/3 ≈ 16.67，Delta 为 2/3。",
      promptZh: "当前股价为 100，下一期可能上涨到 150，也可能下跌到 75。基于该股票的看涨期权价格是多少？Delta 是多少？",
      explanation: raw`The problem omits strike and interest rate, so assume strike $K=100$ and zero interest. The call payoff is $50$ in the up state and $0$ in the down state.

The risk-neutral probability $p$ solves
$$100=150p+75(1-p),$$
so
$$p=\frac13.$$
Therefore the option price is
$$C=\frac13\cdot50+\frac23\cdot0=\frac{50}{3}\approx16.67.$$
The delta is the change in option value divided by the change in stock value:
$$\Delta=\frac{50-0}{150-75}=\frac23.$$`,
      explanationZh: raw`题目未给执行价和利率，因此假设执行价 $K=100$ 且利率为 0。看涨期权在上涨状态收益为 $50$，在下跌状态收益为 $0$。

风险中性概率 $p$ 满足
$$100=150p+75(1-p),$$
所以
$$p=\frac13.$$
因此期权价格为
$$C=\frac13\cdot50+\frac23\cdot0=\frac{50}{3}\approx16.67.$$
Delta 等于期权价值变化除以股票价值变化：
$$\Delta=\frac{50-0}{150-75}=\frac23.$$`
    }
  },
  {
    id: "red-book-problem-055",
    reason: "Die expectation formula was corrupted.",
    fields: {
      answer: "The fair ticket price is 3.5 dollars; to make a profit, charge more than 3.5 dollars.",
      answerZh: "公平票价为 3.5 美元；若想盈利，应收取高于 3.5 美元的价格。",
      explanation: raw`For a fair six-sided die, the expected payoff is
$$E=\frac{1+2+3+4+5+6}{6}=3.5.$$
Thus the actuarially fair ticket price is 3.5 dollars. A casino or seller would charge more than this to earn a positive expected profit.`,
      explanationZh: raw`对公平六面骰，期望收益为
$$E=\frac{1+2+3+4+5+6}{6}=3.5.$$
因此公平票价为 3.5 美元。赌场或卖方若要获得正期望利润，需要收取高于这个价格的票价。`
    }
  },
  {
    id: "red-book-problem-059",
    reason: "Fair-coin multiplicative game had T mistranslated as 7 and broken expectation formulas.",
    fields: {
      answer: "After n tosses, the expected wealth is (5/4)^n dollars, so the expected value tends to infinity as n goes to infinity.",
      answerZh: "抛 n 次后，期望财富为 (5/4)^n 美元；因此当 n 趋于无穷时，期望值趋于无穷大。",
      titleZh: "问题 3.5 - 公平硬币倍增/减半游戏",
      promptZh: "假设你有一枚公平硬币。你从 1 美元开始；若抛出 H，你的头寸翻倍；若抛出 T，你的头寸减半。如果无限次抛硬币，你拥有的钱的期望值是多少？",
      explanation: raw`Each toss multiplies the current wealth by
$$M=\begin{cases}2,&\text{with probability }1/2,\\
1/2,&\text{with probability }1/2.\end{cases}$$
Thus
$$E[M]=\frac12\cdot2+\frac12\cdot\frac12=\frac54.$$
For independent tosses, wealth after $n$ tosses is
$$W_n=\prod_{j=1}^n M_j,$$
so
$$E[W_n]=\prod_{j=1}^n E[M_j]=\left(\frac54\right)^n.$$
As $n\to\infty$, this expectation diverges to infinity.`,
      explanationZh: raw`每次抛硬币会把当前财富乘以
$$M=\begin{cases}2,&\text{概率 }1/2,\\
1/2,&\text{概率 }1/2.\end{cases}$$
因此
$$E[M]=\frac12\cdot2+\frac12\cdot\frac12=\frac54.$$
独立抛掷 $n$ 次后的财富为
$$W_n=\prod_{j=1}^n M_j,$$
所以
$$E[W_n]=\prod_{j=1}^n E[M_j]=\left(\frac54\right)^n.$$
当 $n\to\infty$ 时，该期望发散到无穷大。`
    }
  },
  {
    id: "red-book-problem-061",
    reason: "Stopping-time distribution formulas were corrupted.",
    fields: {
      category: "probabilityExpectation",
      answer: "3 tosses",
      answerZh: "3 次抛掷",
      explanation: raw`Let $N$ be the number of tosses until the first occurrence of either $HH$ or $TT$. For $N=k$, the sequence must alternate for the first $k-1$ tosses and then repeat on the $k$th toss. There are exactly two such sequences of length $k$, so
$$P(N=k)=\frac{2}{2^k}=2^{1-k},\qquad k=2,3,\ldots.$$
Therefore
$$E[N]=\sum_{k=2}^{\infty}k\,2^{1-k}=3.$$`,
      explanationZh: raw`令 $N$ 表示第一次出现 $HH$ 或 $TT$ 前所需的抛掷次数。若 $N=k$，则前 $k-1$ 次必须正反交替，第 $k$ 次与第 $k-1$ 次相同。长度为 $k$ 的这种序列恰好有两条，所以
$$P(N=k)=\frac{2}{2^k}=2^{1-k},\qquad k=2,3,\ldots.$$
因此
$$E[N]=\sum_{k=2}^{\infty}k\,2^{1-k}=3.$$`
    }
  },
  {
    id: "red-book-problem-063",
    reason: "Biased-coin waiting-time sums and martingale derivation were corrupted.",
    fields: {
      category: "probabilityExpectation",
      answer: raw`If $P(H)=p$, then $E[\text{time to first head}]=1/p$ and $E[\text{time to two consecutive heads}]=(1+p)/p^2$.`,
      answerZh: raw`若 $P(H)=p$，则第一次出现正面的期望时间为 $1/p$，连续两个正面的期望时间为 $(1+p)/p^2$。`,
      promptZh: "你抛一枚有偏硬币。第一次出现正面之前的期望抛掷次数是多少？连续两个正面之前的期望抛掷次数是多少？",
      explanation: raw`The waiting time for the first head is geometric with success probability $p$, so its expectation is $1/p$.

For two consecutive heads, let $E_0$ be the expected waiting time from no current streak and $E_1$ from a current streak of one head. Then
$$E_0=1+pE_1+(1-p)E_0,$$
because after a tail we are still in state $0$, and after a head we move to state $1$. Also
$$E_1=1+(1-p)E_0,$$
because a head finishes the game and a tail resets the streak. Solving these equations gives
$$E_0=\frac{1+p}{p^2}.$$`,
      explanationZh: raw`第一次出现正面的等待时间服从成功概率为 $p$ 的几何分布，因此期望为 $1/p$。

对连续两个正面，令 $E_0$ 表示当前没有连续正面时的期望等待时间，$E_1$ 表示当前已经有一个正面时的期望等待时间。则
$$E_0=1+pE_1+(1-p)E_0,$$
因为抛出反面后仍在状态 $0$，抛出正面后进入状态 $1$。另外
$$E_1=1+(1-p)E_0,$$
因为再抛出正面就结束，抛出反面则重置。解这两个方程得到
$$E_0=\frac{1+p}{p^2}.$$`
    }
  },
  {
    id: "red-book-problem-064",
    reason: "Bayes theorem application was unreadable.",
    fields: {
      answer: "8/17",
      answerZh: "8/17",
      promptZh: "一个袋子里有九枚普通公平硬币和一枚双头硬币。随机取出一枚硬币并抛三次，三次都是正面。它是双头硬币的概率是多少？",
      explanation: raw`Let $D$ be the event that the selected coin is double-headed, and let $H$ be the event of observing three heads. Then
$$P(D)=\frac{1}{10},\qquad P(H\mid D)=1,$$
and if the selected coin is ordinary,
$$P(H\mid D^c)=\left(\frac12\right)^3=\frac18,\qquad P(D^c)=\frac9{10}.$$
By Bayes' theorem,
$$P(D\mid H)=\frac{1\cdot(1/10)}{1\cdot(1/10)+(1/8)(9/10)}
=\frac{1}{1+9/8}=\frac8{17}.$$`,
      explanationZh: raw`令 $D$ 表示抽到双头硬币，令 $H$ 表示观察到三次正面。则
$$P(D)=\frac{1}{10},\qquad P(H\mid D)=1,$$
若抽到普通硬币，
$$P(H\mid D^c)=\left(\frac12\right)^3=\frac18,\qquad P(D^c)=\frac9{10}.$$
由贝叶斯公式，
$$P(D\mid H)=\frac{1\cdot(1/10)}{1\cdot(1/10)+(1/8)(9/10)}
=\frac{1}{1+9/8}=\frac8{17}.$$`
    }
  },
  {
    id: "red-book-problem-066",
    reason: "Expected count of HHHHHHTTTTTT had corrupted probability notation.",
    fields: {
      answer: raw`$\displaystyle \frac{1{,}000{,}000-11}{2^{12}}\approx244.14$.`,
      answerZh: raw`$\displaystyle \frac{1{,}000{,}000-11}{2^{12}}\approx244.14$。`,
      promptEn: "You throw a fair coin one million times. What is the expected number of strings of 6 heads followed by 6 tails?",
      promptZh: "你抛一枚公平硬币一百万次。出现“6 个正面后紧跟 6 个反面”这种长度为 12 的序列的期望次数是多少？",
      explanation: raw`There are
$$1{,}000{,}000-12+1=1{,}000{,}000-11$$
possible starting positions for a length-12 string. At each starting position, the probability of seeing exactly
$$HHHHHHTTTTTT$$
is
$$\left(\frac12\right)^{12}.$$
By linearity of expectation, independence between overlapping windows is not required. The expected count is
$$\frac{1{,}000{,}000-11}{2^{12}}\approx244.14.$$`,
      explanationZh: raw`长度为 12 的序列共有
$$1{,}000{,}000-12+1=1{,}000{,}000-11$$
个可能起点。对每个起点，恰好出现
$$HHHHHHTTTTTT$$
的概率为
$$\left(\frac12\right)^{12}.$$
由期望线性性，不需要重叠窗口之间相互独立。期望次数为
$$\frac{1{,}000{,}000-11}{2^{12}}\approx244.14.$$`
    }
  },
  {
    id: "red-book-problem-075",
    reason: "Ace probabilities used wrong single-draw probability and garbled formulas.",
    fields: {
      category: "probabilityExpectation",
      answer: "With replacement: 1/169. Without replacement: 1/221.",
      answerZh: "有放回：1/169。无放回：1/221。",
      promptZh: "如果我从一副普通扑克牌中有放回地抽两张牌，两张都是 A 的概率是多少？如果无放回呢？",
      explanation: raw`There are $4$ aces in a $52$-card deck, so the probability of an ace on one draw is
$$\frac4{52}=\frac1{13}.$$
With replacement, the two draws are independent:
$$\frac1{13}\cdot\frac1{13}=\frac1{169}.$$
Without replacement, after drawing an ace first there are $3$ aces left among $51$ cards, so
$$\frac4{52}\cdot\frac3{51}=\frac1{13}\cdot\frac1{17}=\frac1{221}.$$`,
      explanationZh: raw`一副 $52$ 张牌中有 $4$ 张 A，所以单次抽到 A 的概率为
$$\frac4{52}=\frac1{13}.$$
有放回时，两次抽牌独立：
$$\frac1{13}\cdot\frac1{13}=\frac1{169}.$$
无放回时，第一次抽到 A 后，剩余 $51$ 张牌中还有 $3$ 张 A，因此
$$\frac4{52}\cdot\frac3{51}=\frac1{13}\cdot\frac1{17}=\frac1{221}.$$`
    }
  },
  {
    id: "red-book-problem-077",
    reason: "Recursive random-walk solution had garbled final probabilities.",
    fields: {
      answer: raw`For a 5-meter plank, the survival probability is $f(x)=1-x/5$ for integer $x=0,1,2,3,4,5$.`,
      answerZh: raw`对 5 米长木板，生还概率为 $f(x)=1-x/5$，其中整数 $x=0,1,2,3,4,5$。`,
      explanation: raw`Let $f(x)$ be the probability of reaching the safe end before the dangerous end when starting $x$ meters from safety. The boundary conditions are
$$f(0)=1,\qquad f(5)=0.$$
For $x=1,2,3,4$, the next step moves to $x-1$ or $x+1$ with equal probability, so
$$f(x)=\frac12 f(x-1)+\frac12 f(x+1).$$
The solution to this discrete harmonic equation is linear:
$$f(x)=1-\frac{x}{5}.$$
Thus $f(1)=4/5$, $f(2)=3/5$, $f(3)=2/5$, and $f(4)=1/5$.`,
      explanationZh: raw`令 $f(x)$ 表示从距离安全端 $x$ 米处出发，先到安全端而不是危险端的概率。边界条件为
$$f(0)=1,\qquad f(5)=0.$$
对 $x=1,2,3,4$，下一步以相同概率走到 $x-1$ 或 $x+1$，所以
$$f(x)=\frac12 f(x-1)+\frac12 f(x+1).$$
这个离散调和方程的解是线性的：
$$f(x)=1-\frac{x}{5}.$$
因此 $f(1)=4/5$，$f(2)=3/5$，$f(3)=2/5$，$f(4)=1/5$。`
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
