#!/usr/bin/env python3
"""Import selected Alison Etheridge stochastic-calculus-for-finance problems.

The official Oxford author page exposes lecture notes and problem sheets. No
official solutions are included in the cached public source, so this importer
uses a small curated subset and marks all answers as generated/reviewed and
non-official.
"""

from __future__ import annotations

import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SLUG = "etheridge-finmath-problem-sheets"
SOURCE_NAME = "Alison Etheridge Stochastic Calculus for Finance Problems"
SOURCE_URL = "https://www.stats.ox.ac.uk/~etheridg/finmath/index.html"
PROBLEM_HTML_URL = "https://www.stats.ox.ac.uk/~etheridg/finmath/finanq/finanq.html"
PROBLEM_PDF_URL = "https://www.stats.ox.ac.uk/~etheridg/finmath/finanq.pdf"
CACHE_DIR = PROJECT_ROOT / "artifacts" / "source-research-report" / "downloads" / "alison-etheridge-finmath"
SOURCE_HTML = CACHE_DIR / "finanq.html"
SOURCE_PDF = CACHE_DIR / "finanq.pdf"
OUTPUT_DIR = PROJECT_ROOT / "data" / "question-banks" / SLUG
MANIFEST_PATH = PROJECT_ROOT / "data" / "question-banks" / "catalog-manifest.json"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


GENERATED_AT = now_iso()


def rel(path: Path) -> str:
    return str(path.relative_to(PROJECT_ROOT))


def source_files() -> list[str]:
    files = [SOURCE_URL, PROBLEM_HTML_URL, PROBLEM_PDF_URL]
    for path in [SOURCE_HTML, SOURCE_PDF]:
        if path.exists():
            files.append(rel(path))
    return files


def base_problem(index: int, source_question: str, title_en: str, title_zh: str, category: str, difficulty: str, tags: list[str]) -> dict:
    return {
        "id": f"{SLUG}-problem-{index:03d}",
        "titleEn": title_en,
        "titleZh": title_zh,
        "category": category,
        "difficulty": difficulty,
        "tags": [
            "Alison Etheridge",
            "Stochastic Calculus for Finance",
            "Oxford problem sheet",
            *tags,
        ],
        "classificationReviewed": True,
        "classificationReview": {
            "category": category,
            "difficulty": difficulty,
            "logic": "Curated from the public Oxford stochastic-calculus-for-finance problem sheet and reviewed for quant interview relevance.",
            "reviewedBy": "Codex import-etheridge-finmath-problem-sheets",
        },
        "source": SLUG,
        "sourceUrl": PROBLEM_HTML_URL,
        "sourceType": "public-course-problem-sheet-with-generated-answer",
        "bookSlug": SLUG,
        "bookName": SOURCE_NAME,
        "visibility": "public",
        "sourceFiles": source_files(),
        "sourceQuestion": source_question,
        "answerOfficial": False,
        "answerPolicy": "The public Oxford problem sheet includes prompts but no official solution file in the cached source; this answer is generated and locally reviewed, not an official course solution.",
        "answerSource": {
            "type": "generated-reviewed",
            "official": False,
            "verificationScript": "scripts/import-etheridge-finmath-problem-sheets.py",
            "sourceFiles": source_files(),
        },
        "rightsReview": {
            "status": "official-public-author-page",
            "note": "Official author-hosted Oxford teaching materials. Imported as a small generated-answer sample with attribution; distribution review required before publishing beyond the local app.",
            "reviewedBy": "Codex",
            "reviewedAt": GENERATED_AT,
        },
        "createdAt": GENERATED_AT,
        "updatedAt": GENERATED_AT,
    }


def add(problem: dict, prompt_en: str, prompt_zh: str, answer_en: str, answer_zh: str, explanation_en: str, explanation_zh: str) -> dict:
    problem["promptEn"] = prompt_en.strip()
    problem["promptZh"] = prompt_zh.strip()
    problem["answer"] = answer_en.strip()
    problem["answerEn"] = answer_en.strip()
    problem["answerZh"] = answer_zh.strip()
    problem["explanation"] = explanation_en.strip()
    problem["explanationZh"] = explanation_zh.strip()
    return problem


def problems() -> list[dict]:
    return [
        add(
            base_problem(1, "Problem 1", "One-period binomial call price", "单周期二叉树欧式看涨定价", "option", "Medium", ["binomial model", "risk-neutral pricing"]),
            r"""
A stock starts at $S_0$ and after one period $\Delta T$ moves to either $S_0u$ or $S_0d$. One dollar invested risk-free grows to $e^{r\Delta T}$. Assume $d<e^{r\Delta T}<u$. Derive the no-arbitrage price at time 0 of a European call with strike $K$ maturing after this period. What goes wrong if the inequality is dropped?
""",
            r"""
股票初始价格为 $S_0$，一个周期 $\Delta T$ 后变为 $S_0u$ 或 $S_0d$。1 美元无风险投资在该周期后变为 $e^{r\Delta T}$。假设 $d<e^{r\Delta T}<u$。推导到期为一个周期、执行价为 $K$ 的欧式看涨期权在 0 时刻的无套利价格。若该不等式不成立，会发生什么？
""",
            r"The price is $e^{-r\Delta T}\{q(S_0u-K)^++(1-q)(S_0d-K)^+\}$ with $q=(e^{r\Delta T}-d)/(u-d)$. If $e^{r\Delta T}$ is outside $[d,u]$, the stock and bond admit arbitrage and no risk-neutral probability in $[0,1]$ exists.",
            r"价格为 $e^{-r\Delta T}\{q(S_0u-K)^++(1-q)(S_0d-K)^+\}$，其中 $q=(e^{r\Delta T}-d)/(u-d)$。若 $e^{r\Delta T}$ 不在 $[d,u]$ 内，股票和债券之间存在套利，且不存在位于 $[0,1]$ 的风险中性概率。",
            r"""
The risk-neutral probability $q$ is defined by matching the discounted stock price:
$$S_0=e^{-r\Delta T}\bigl(qS_0u+(1-q)S_0d\bigr).$$
Solving gives
$$q=\frac{e^{r\Delta T}-d}{u-d}.$$
Then the option price is the discounted risk-neutral expected payoff:
$$C_0=e^{-r\Delta T}\left[q(S_0u-K)^++(1-q)(S_0d-K)^+\right].$$
The strict inequality ensures $0<q<1$. If the bank account return is at least the up factor, shorting stock and investing proceeds in the bank gives arbitrage; if it is at most the down factor, borrowing to buy stock gives arbitrage.
""",
            r"""
风险中性概率 $q$ 由贴现股票价格匹配确定：
$$S_0=e^{-r\Delta T}\bigl(qS_0u+(1-q)S_0d\bigr).$$
解得
$$q=\frac{e^{r\Delta T}-d}{u-d}.$$
于是期权价格为贴现的风险中性期望收益：
$$C_0=e^{-r\Delta T}\left[q(S_0u-K)^++(1-q)(S_0d-K)^+\right].$$
严格不等式保证 $0<q<1$。若银行账户收益率至少等于上涨因子，可卖空股票并把所得投入银行套利；若银行账户收益率至多等于下跌因子，可借钱买股票套利。
""",
        ),
        add(
            base_problem(2, "Problem 2", "Currency put mispricing in a one-period model", "单周期汇率模型中的看跌期权错价", "option", "Medium", ["arbitrage", "replication", "currency option"]),
            r"""
At current exchange rates, 100 pounds are worth 280 DM. At year end the value will be either 260 DM or 300 DM. A European put allows the holder to sell 100 pounds for 290 DM at year end. The risk-free rate is zero and the put trades for 20 DM. Use a one-period binary model to decide whether this is fair, and if not construct an arbitrage.
""",
            r"""
当前汇率下，100 英镑价值 280 马克。年末它将价值 260 马克或 300 马克。某欧式看跌期权允许持有人年末以 290 马克卖出 100 英镑。无风险利率为 0，该看跌期权价格为 20 马克。用单周期二叉模型判断价格是否公平；若不公平，构造套利。
""",
            "The fair value is 15 DM, so the put is overpriced. Sell the put for 20 DM and buy its replicating portfolio for 15 DM, locking in 5 DM.",
            "公允价值为 15 马克，因此该看跌期权被高估。卖出期权收 20 马克，同时用 15 马克买入复制组合，可锁定 5 马克利润。",
            r"""
The put payoff is 30 DM in the down state and 0 in the up state. The risk-neutral up probability $q$ satisfies
$$300q+260(1-q)=280,$$
so $q=1/2$. With zero interest, the fair value is
$$\frac12\cdot0+\frac12\cdot30=15.$$
A replicating portfolio has stock exposure
$$\Delta=\frac{0-30}{300-260}=-\frac34,$$
and cash
$$B=30-\Delta\cdot260=225.$$
Its initial cost is $-\frac34\cdot280+225=15$. Selling the option for 20 and buying this replicating payoff leaves a riskless 5 DM surplus.
""",
            r"""
看跌期权在下跌状态收益为 30 马克，在上涨状态收益为 0。风险中性上涨概率 $q$ 满足
$$300q+260(1-q)=280,$$
所以 $q=1/2$。无风险利率为 0，因此公允价值为
$$\frac12\cdot0+\frac12\cdot30=15.$$
复制组合的标的头寸为
$$\Delta=\frac{0-30}{300-260}=-\frac34,$$
现金头寸为
$$B=30-\Delta\cdot260=225.$$
初始成本为 $-\frac34\cdot280+225=15$。以 20 卖出期权并以 15 买入复制组合，可无风险留下 5 马克。
""",
        ),
        add(
            base_problem(3, "Problem 3", "Put-call parity with constant rates", "常利率下的看跌-看涨平价", "option", "Easy", ["put-call parity", "replication"]),
            r"""
Let $C_t$ and $P_t$ be the prices at time $t$ of European call and put options on the same asset, both with maturity $T$ and strike $K$. The risk-free rate is constant $r$. Show that
$$C_t-P_t=S_t-Ke^{-r(T-t)}.$$
""",
            r"""
令 $C_t$ 与 $P_t$ 分别表示同一标的、相同到期日 $T$、相同执行价 $K$ 的欧式看涨和看跌期权在 $t$ 时刻的价格。无风险利率为常数 $r$。证明
$$C_t-P_t=S_t-Ke^{-r(T-t)}.$$
""",
            r"$C_t-P_t=S_t-Ke^{-r(T-t)}$.",
            r"$C_t-P_t=S_t-Ke^{-r(T-t)}$。",
            r"""
Compare two portfolios at maturity. Portfolio A is long one call and short one put. Its payoff is
$$ (S_T-K)^+-(K-S_T)^+=S_T-K.$$
Portfolio B is long one share and short a zero-coupon bond that pays $K$ at $T$. Its payoff is also $S_T-K$. By no-arbitrage, equal terminal payoffs have equal time-$t$ values:
$$C_t-P_t=S_t-Ke^{-r(T-t)}.$$
""",
            r"""
比较两个组合的到期收益。组合 A：买入一份看涨、卖出一份看跌，到期收益为
$$ (S_T-K)^+-(K-S_T)^+=S_T-K.$$
组合 B：持有一股标的，同时卖空一张到期支付 $K$ 的零息债券，到期收益同样为 $S_T-K$。由无套利，相同到期收益的组合在 $t$ 时刻价值相同：
$$C_t-P_t=S_t-Ke^{-r(T-t)}.$$
""",
        ),
        add(
            base_problem(4, "Problem 7", "Cash-or-nothing digital option in a CRR tree", "CRR 树中的现金或无价值数字期权", "option", "Medium", ["digital option", "CRR model", "binomial distribution"]),
            r"""
In an $N$-step Cox-Ross-Rubinstein tree, each step moves the asset from $S_n$ to $S_nu$ or $S_nd$, with $d<e^{r\Delta T}<u$. A cash-or-nothing digital option pays $X$ at maturity if $S_T>K$ and 0 otherwise. Give the time-0 price as a finite sum.
""",
            r"""
在 $N$ 步 Cox-Ross-Rubinstein 二叉树中，每一步标的从 $S_n$ 变为 $S_nu$ 或 $S_nd$，并且 $d<e^{r\Delta T}<u$。现金或无价值数字期权在到期时若 $S_T>K$ 支付 $X$，否则支付 0。请把 0 时刻价格写成有限求和形式。
""",
            r"The price is $e^{-rN\Delta T}X\sum_{j:S_0u^jd^{N-j}>K}\binom Nj q^j(1-q)^{N-j}$, where $q=(e^{r\Delta T}-d)/(u-d)$.",
            r"价格为 $e^{-rN\Delta T}X\sum_{j:S_0u^jd^{N-j}>K}\binom Nj q^j(1-q)^{N-j}$，其中 $q=(e^{r\Delta T}-d)/(u-d)$。",
            r"""
Under the risk-neutral measure, each step goes up with
$$q=\frac{e^{r\Delta T}-d}{u-d}.$$
After $j$ up moves and $N-j$ down moves, the terminal price is $S_0u^jd^{N-j}$ and that path count has binomial probability $\binom Njq^j(1-q)^{N-j}$. Discount the expected digital payoff:
$$V_0=e^{-rN\Delta T}X\sum_{\{j:S_0u^jd^{N-j}>K\}}\binom Njq^j(1-q)^{N-j}.$$
""",
            r"""
在风险中性测度下，每一步上涨概率为
$$q=\frac{e^{r\Delta T}-d}{u-d}.$$
若共有 $j$ 次上涨、$N-j$ 次下跌，则终值为 $S_0u^jd^{N-j}$，对应二项概率为 $\binom Njq^j(1-q)^{N-j}$。将数字期权期望收益贴现：
$$V_0=e^{-rN\Delta T}X\sum_{\{j:S_0u^jd^{N-j}>K\}}\binom Njq^j(1-q)^{N-j}.$$
""",
        ),
        add(
            base_problem(5, "Problem 10", "Which Brownian transformations remain Brownian?", "哪些布朗运动变换仍是布朗运动", "probabilityExpectation", "Medium", ["Brownian motion", "scaling", "independent increments"]),
            r"""
Let $B_t$ be standard Brownian motion. Decide which processes are Brownian motions:
(a) $-B_t$;
(b) $cB_{t/c^2}$ for a nonzero constant $c$;
(c) $\sqrt t\,B_1$;
(d) $B_{2t}-B_t$.
Justify each answer.
""",
            r"""
令 $B_t$ 为标准布朗运动。判断下列过程哪些仍是布朗运动：
(a) $-B_t$；
(b) 对非零常数 $c$，$cB_{t/c^2}$；
(c) $\sqrt t\,B_1$；
(d) $B_{2t}-B_t$。
请说明理由。
""",
            "Processes (a) and (b) are Brownian motions; (c) and (d) are not.",
            "(a) 与 (b) 是布朗运动；(c) 与 (d) 不是。",
            r"""
The process $-B_t$ has continuous paths, starts at 0, and has independent Gaussian increments with variance equal to elapsed time.

Brownian scaling gives $cB_{t/c^2}$ as Brownian for $c\ne0$: increments are Gaussian with variance $c^2((t-s)/c^2)=t-s$ and remain independent.

For $\sqrt t\,B_1$, each marginal is $N(0,t)$, but all times are driven by the same $B_1$, so increments are not independent.

For $B_{2t}-B_t$, each marginal has variance $t$, but the covariance structure is wrong. For example if $t\ge2s$, the increments over $[s,2s]$ and $[t,2t]$ are disjoint, so
$$Cov(B_{2s}-B_s,\ B_{2t}-B_t)=0,$$
whereas Brownian covariance would be $s$.
""",
            r"""
$-B_t$ 路径连续、从 0 出发，并且增量仍为独立正态、方差等于时间长度。

由布朗缩放性质，$cB_{t/c^2}$ 在 $c\ne0$ 时仍是布朗运动：其增量方差为 $c^2((t-s)/c^2)=t-s$，独立性也保留。

对 $\sqrt t\,B_1$，每个边缘分布确实是 $N(0,t)$，但所有时刻都由同一个 $B_1$ 驱动，增量不独立。

对 $B_{2t}-B_t$，每个边缘方差为 $t$，但协方差结构不对。例如当 $t\ge2s$ 时，区间 $[s,2s]$ 与 $[t,2t]$ 不相交，所以
$$Cov(B_{2s}-B_s,\ B_{2t}-B_t)=0,$$
而标准布朗运动的协方差应为 $s$。
""",
        ),
        add(
            base_problem(6, "Problem 16", "Exponential Brownian martingale drift", "指数布朗过程成为鞅的漂移条件", "probabilityExpectation", "Easy", ["Brownian motion", "martingale", "exponential martingale"]),
            r"""
Let $B_t$ be Brownian motion and define $S_t=\exp(\sigma B_t+\mu t)$. For which values of $\mu$ is $S_t$ a martingale with respect to the Brownian filtration?
""",
            r"""
令 $B_t$ 为布朗运动，并定义 $S_t=\exp(\sigma B_t+\mu t)$。对哪些 $\mu$，$S_t$ 关于布朗运动自然滤过是鞅？
""",
            r"$S_t$ is a martingale iff $\mu=-\sigma^2/2$.",
            r"$S_t$ 是鞅当且仅当 $\mu=-\sigma^2/2$。",
            r"""
Since $B_t-B_s$ is independent of $\mathcal F_s$ and normal with variance $t-s$,
$$E[S_t\mid\mathcal F_s]=S_s\exp\left((\mu+\sigma^2/2)(t-s)\right).$$
This equals $S_s$ for all $s<t$ exactly when
$$\mu+\frac12\sigma^2=0.$$
""",
            r"""
由于 $B_t-B_s$ 独立于 $\mathcal F_s$，且服从方差为 $t-s$ 的正态分布，
$$E[S_t\mid\mathcal F_s]=S_s\exp\left((\mu+\sigma^2/2)(t-s)\right).$$
要使它对所有 $s<t$ 都等于 $S_s$，必须且只需
$$\mu+\frac12\sigma^2=0.$$
""",
        ),
        add(
            base_problem(7, "Problem 22", "Ito formula for three Brownian functionals", "三个布朗函数的 Itô 公式", "probabilityExpectation", "Medium", ["Ito formula", "stochastic differential equation"]),
            r"""
Use Itô's formula to write SDEs for:
(a) $Y_t=B_t^3$;
(b) $Y_t=\exp(\sigma B_t-\frac12\sigma^2t)$;
(c) $Y_t=tB_t$.
""",
            r"""
用 Itô 公式写出下列过程的 SDE：
(a) $Y_t=B_t^3$；
(b) $Y_t=\exp(\sigma B_t-\frac12\sigma^2t)$；
(c) $Y_t=tB_t$。
""",
            r"(a) $dY_t=3B_t^2\,dB_t+3B_t\,dt$; (b) $dY_t=\sigma Y_t\,dB_t$; (c) $dY_t=B_t\,dt+t\,dB_t$.",
            r"(a) $dY_t=3B_t^2\,dB_t+3B_t\,dt$；(b) $dY_t=\sigma Y_t\,dB_t$；(c) $dY_t=B_t\,dt+t\,dB_t$。",
            r"""
For $f(x)=x^3$, Itô's formula gives
$$dB_t^3=3B_t^2\,dB_t+\frac12(6B_t)\,dt=3B_t^2\,dB_t+3B_t\,dt.$$
For $Y_t=e^{\sigma B_t-\sigma^2t/2}$, the time drift and second derivative terms cancel:
$$dY_t=Y_t\left(\sigma\,dB_t-\frac12\sigma^2dt\right)+\frac12\sigma^2Y_tdt=\sigma Y_t\,dB_t.$$
For $Y_t=tB_t$, product/Itô formula gives
$$d(tB_t)=B_t\,dt+t\,dB_t.$$
""",
            r"""
对 $f(x)=x^3$，Itô 公式给出
$$dB_t^3=3B_t^2\,dB_t+\frac12(6B_t)\,dt=3B_t^2\,dB_t+3B_t\,dt.$$
对 $Y_t=e^{\sigma B_t-\sigma^2t/2}$，时间漂移项与二阶项抵消：
$$dY_t=Y_t\left(\sigma\,dB_t-\frac12\sigma^2dt\right)+\frac12\sigma^2Y_tdt=\sigma Y_t\,dB_t.$$
对 $Y_t=tB_t$，乘积公式给出
$$d(tB_t)=B_t\,dt+t\,dB_t.$$
""",
        ),
        add(
            base_problem(8, "Problem 24", "Mean and variance of the Ornstein-Uhlenbeck process", "Ornstein-Uhlenbeck 过程的均值与方差", "probabilityExpectation", "Medium", ["Ornstein-Uhlenbeck", "SDE", "Ito integral"]),
            r"""
Let $X_t$ solve the Ornstein-Uhlenbeck SDE
$$dX_t=-\alpha X_t\,dt+dB_t,\qquad X_0=x.$$
Verify the explicit solution and compute $E[X_t]$ and $Var(X_t)$.
""",
            r"""
令 $X_t$ 满足 Ornstein-Uhlenbeck SDE
$$dX_t=-\alpha X_t\,dt+dB_t,\qquad X_0=x.$$
验证显式解，并计算 $E[X_t]$ 与 $Var(X_t)$。
""",
            r"$X_t=e^{-\alpha t}x+\int_0^t e^{-\alpha(t-s)}\,dB_s$, so $E[X_t]=e^{-\alpha t}x$ and $Var(X_t)=\frac{1-e^{-2\alpha t}}{2\alpha}$ for $\alpha\ne0$ (with limit $t$ when $\alpha=0$).",
            r"$X_t=e^{-\alpha t}x+\int_0^t e^{-\alpha(t-s)}\,dB_s$，所以 $E[X_t]=e^{-\alpha t}x$，当 $\alpha\ne0$ 时 $Var(X_t)=\frac{1-e^{-2\alpha t}}{2\alpha}$（$\alpha=0$ 的极限为 $t$）。",
            r"""
Multiply the SDE by the integrating factor $e^{\alpha t}$:
$$d(e^{\alpha t}X_t)=e^{\alpha t}\,dB_t.$$
Integrating from 0 to $t$ gives
$$X_t=e^{-\alpha t}x+\int_0^t e^{-\alpha(t-s)}\,dB_s.$$
The Itô integral has mean 0, so $E[X_t]=e^{-\alpha t}x$. Its variance is the Itô isometry:
$$Var(X_t)=\int_0^t e^{-2\alpha(t-s)}\,ds=\frac{1-e^{-2\alpha t}}{2\alpha},$$
with the continuous limit $t$ at $\alpha=0$.
""",
            r"""
将 SDE 乘以积分因子 $e^{\alpha t}$：
$$d(e^{\alpha t}X_t)=e^{\alpha t}\,dB_t.$$
从 0 积分到 $t$ 得到
$$X_t=e^{-\alpha t}x+\int_0^t e^{-\alpha(t-s)}\,dB_s.$$
Itô 积分均值为 0，所以 $E[X_t]=e^{-\alpha t}x$。方差由 Itô 等距给出：
$$Var(X_t)=\int_0^t e^{-2\alpha(t-s)}\,ds=\frac{1-e^{-2\alpha t}}{2\alpha},$$
在 $\alpha=0$ 时连续极限为 $t$。
""",
        ),
        add(
            base_problem(9, "Problem 25", "Changing the drift of Brownian motion", "改变布朗运动漂移的测度变换", "probabilityExpectation", "Hard", ["Girsanov theorem", "change of measure", "Brownian drift"]),
            r"""
Under probability measure $P$, suppose $X_t=\mu t+B_t$ where $B_t$ is standard Brownian motion. Find an equivalent measure $P^*$ under which $X_t$ is Brownian motion with drift $\nu$ over a finite horizon $[0,T]$.
""",
            r"""
在概率测度 $P$ 下，设 $X_t=\mu t+B_t$，其中 $B_t$ 为标准布朗运动。在有限时间区间 $[0,T]$ 上，找一个等价测度 $P^*$，使得 $X_t$ 在 $P^*$ 下是漂移为 $\nu$ 的布朗运动。
""",
            r"Let $\lambda=\mu-\nu$ and define $\frac{dP^*}{dP}\big|_{\mathcal F_T}=\exp(-\lambda B_T-\frac12\lambda^2T)$. Then $B_t^*=B_t+\lambda t$ is Brownian under $P^*$ and $X_t=\nu t+B_t^*$.",
            r"令 $\lambda=\mu-\nu$，并定义 $\frac{dP^*}{dP}\big|_{\mathcal F_T}=\exp(-\lambda B_T-\frac12\lambda^2T)$。则 $B_t^*=B_t+\lambda t$ 在 $P^*$ 下是布朗运动，且 $X_t=\nu t+B_t^*$。",
            r"""
Set $\lambda=\mu-\nu$. The exponential martingale
$$Z_T=\exp\left(-\lambda B_T-\frac12\lambda^2T\right)$$
has expectation 1, so it defines an equivalent measure on $\mathcal F_T$. By Girsanov's theorem,
$$B_t^*=B_t+\lambda t$$
is Brownian motion under $P^*$. Therefore
$$X_t=\mu t+B_t=\mu t+B_t^*-\lambda t=(\mu-\lambda)t+B_t^*=\nu t+B_t^*,$$
so the drift is changed from $\mu$ to $\nu$.
""",
            r"""
令 $\lambda=\mu-\nu$。指数鞅
$$Z_T=\exp\left(-\lambda B_T-\frac12\lambda^2T\right)$$
期望为 1，因此可在 $\mathcal F_T$ 上定义等价测度。由 Girsanov 定理，
$$B_t^*=B_t+\lambda t$$
在 $P^*$ 下是布朗运动。于是
$$X_t=\mu t+B_t=\mu t+B_t^*-\lambda t=(\mu-\lambda)t+B_t^*=\nu t+B_t^*,$$
漂移便从 $\mu$ 变为 $\nu$。
""",
        ),
        add(
            base_problem(10, "Problem 29", "Discounted Black-Scholes PDE from martingales", "由贴现鞅推出 Black-Scholes PDE", "option", "Hard", ["Black-Scholes", "PDE", "risk-neutral measure"]),
            r"""
Under the risk-neutral measure, the discounted stock price $\tilde S_t$ satisfies
$$d\tilde S_t=\sigma\tilde S_t\,dW_t.$$
If the discounted option value is $\tilde V_t=\tilde F(t,\tilde S_t)$ and is a martingale, find the PDE for $\tilde F$. Then translate it to the usual Black-Scholes PDE for $F(t,S)$.
""",
            r"""
在风险中性测度下，贴现股票价格 $\tilde S_t$ 满足
$$d\tilde S_t=\sigma\tilde S_t\,dW_t.$$
若贴现期权价值为 $\tilde V_t=\tilde F(t,\tilde S_t)$ 且它是鞅，求 $\tilde F$ 满足的 PDE。再将其转化为通常的 Black-Scholes PDE。
""",
            r"$\tilde F_t+\frac12\sigma^2x^2\tilde F_{xx}=0$. In undiscounted variables, $F_t+rSF_S+\frac12\sigma^2S^2F_{SS}-rF=0$.",
            r"$\tilde F_t+\frac12\sigma^2x^2\tilde F_{xx}=0$。在未贴现变量下，$F_t+rSF_S+\frac12\sigma^2S^2F_{SS}-rF=0$。",
            r"""
Apply Itô's formula to $\tilde F(t,\tilde S_t)$:
$$d\tilde F=\left(\tilde F_t+\frac12\sigma^2x^2\tilde F_{xx}\right)dt+\sigma x\tilde F_x\,dW_t,\qquad x=\tilde S_t.$$
Since $\tilde V_t$ is a martingale, its drift must vanish:
$$\tilde F_t+\frac12\sigma^2x^2\tilde F_{xx}=0.$$
Returning to undiscounted variables gives the standard Black-Scholes equation
$$F_t+rSF_S+\frac12\sigma^2S^2F_{SS}-rF=0.$$
""",
            r"""
对 $\tilde F(t,\tilde S_t)$ 使用 Itô 公式：
$$d\tilde F=\left(\tilde F_t+\frac12\sigma^2x^2\tilde F_{xx}\right)dt+\sigma x\tilde F_x\,dW_t,\qquad x=\tilde S_t.$$
由于 $\tilde V_t$ 是鞅，其漂移必须为 0：
$$\tilde F_t+\frac12\sigma^2x^2\tilde F_{xx}=0.$$
回到未贴现变量，得到标准 Black-Scholes 方程
$$F_t+rSF_S+\frac12\sigma^2S^2F_{SS}-rF=0.$$
""",
        ),
    ]


def validate(problem_list: list[dict]) -> None:
    required = ["id", "titleEn", "titleZh", "promptEn", "promptZh", "answer", "answerZh", "explanation", "explanationZh", "category", "difficulty"]
    seen = set()
    errors = []
    for problem in problem_list:
        if problem["id"] in seen:
            errors.append(f"duplicate id: {problem['id']}")
        seen.add(problem["id"])
        for key in required:
            if not str(problem.get(key, "")).strip():
                errors.append(f"{problem.get('id', '<missing>')} missing {key}")
    if errors:
        raise SystemExit("\n".join(errors))


def write_outputs(problem_list: list[dict]) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUTPUT_DIR / "problems.json").write_text(json.dumps({"problems": problem_list}, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    metadata = {
        "slug": SLUG,
        "name": SOURCE_NAME,
        "type": "public-course-problem-sheet-with-generated-answer",
        "sourceUrl": SOURCE_URL,
        "problemHtmlUrl": PROBLEM_HTML_URL,
        "problemPdfUrl": PROBLEM_PDF_URL,
        "sourceHtmlPath": rel(SOURCE_HTML) if SOURCE_HTML.exists() else "",
        "sourcePdfPath": rel(SOURCE_PDF) if SOURCE_PDF.exists() else "",
        "problemCount": len(problem_list),
        "generatedAt": GENERATED_AT,
        "rightsNote": "Official public Oxford author-hosted problem sheet. No public solution file was found in the cached source; answers are generated/reviewed and non-official.",
    }
    (OUTPUT_DIR / "metadata.json").write_text(json.dumps(metadata, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def write_manifest_entry(problem_count: int) -> None:
    manifest = read_json(MANIFEST_PATH, {"version": 1, "sources": []})
    sources = manifest.setdefault("sources", [])
    entry = {
        "slug": SLUG,
        "name": SOURCE_NAME,
        "type": "public-course-problem-sheet-with-generated-answer",
        "sourceUrl": SOURCE_URL,
        "problemHtmlUrl": PROBLEM_HTML_URL,
        "problemPdfUrl": PROBLEM_PDF_URL,
        "sourceHtmlPath": rel(SOURCE_HTML) if SOURCE_HTML.exists() else "",
        "sourcePdfPath": rel(SOURCE_PDF) if SOURCE_PDF.exists() else "",
        "problemFile": f"{SLUG}/problems.json",
        "problemCount": problem_count,
        "lastImportedAt": GENERATED_AT,
        "rightsNote": "Official public Oxford author-hosted problem sheet; generated non-official answers because no public solution file is included.",
    }
    for index, source in enumerate(sources):
        if source.get("slug") == SLUG:
            sources[index] = {**source, **entry}
            break
    else:
        sources.append(entry)
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def read_json(path: Path, fallback):
    if not path.exists():
        return fallback
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return fallback


def rebuild_catalog() -> None:
    result = subprocess.run(["node", "scripts/build-problem-catalog.mjs"], cwd=PROJECT_ROOT)
    if result.returncode != 0:
        raise SystemExit(result.returncode)


def parse_args(argv: list[str]) -> dict[str, bool]:
    return {arg[2:]: True for arg in argv if arg.startswith("--")}


def main(argv: list[str]) -> int:
    options = parse_args(argv)
    for path in [SOURCE_HTML, SOURCE_PDF]:
        if not path.exists():
            print(f"Warning: missing cached source file: {path}", file=sys.stderr)
    problem_list = problems()
    validate(problem_list)
    write_outputs(problem_list)
    write_manifest_entry(len(problem_list))
    if options.get("rebuild"):
        rebuild_catalog()
    print(json.dumps({
        "source": SLUG,
        "problemCount": len(problem_list),
        "output": rel(OUTPUT_DIR / "problems.json"),
        "metadata": rel(OUTPUT_DIR / "metadata.json"),
        "sourceHtmlPath": rel(SOURCE_HTML) if SOURCE_HTML.exists() else "",
        "sourcePdfPath": rel(SOURCE_PDF) if SOURCE_PDF.exists() else "",
    }, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
