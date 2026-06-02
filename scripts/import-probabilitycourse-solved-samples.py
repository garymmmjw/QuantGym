#!/usr/bin/env python3
"""Import a curated set of public ProbabilityCourse solved examples.

The source site is an open-access textbook and exposes in-chapter solved
problem pages publicly. This importer intentionally does not scrape the
commercial student solutions guide; it records only selected public solved
example URLs and writes paraphrased, locally reviewed prompts and solutions.
"""

from __future__ import annotations

import json
import math
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import URLError
from urllib.request import Request, urlopen


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SLUG = "probabilitycourse-solved-samples"
SOURCE_NAME = "ProbabilityCourse Public Solved Samples"
SOURCE_URL = "https://www.probabilitycourse.com/"
OUTPUT_DIR = PROJECT_ROOT / "data" / "question-banks" / SLUG
MANIFEST_PATH = PROJECT_ROOT / "data" / "question-banks" / "catalog-manifest.json"
CACHE_DIR = PROJECT_ROOT / "artifacts" / "source-research-report" / "downloads" / "probabilitycourse" / "solved-pages"

PUBLIC_SOURCE_URLS = [
    "https://www.probabilitycourse.com/chapter1/1_4_5_solved3.php",
    "https://www.probabilitycourse.com/chapter5/5_1_6_solved_prob.php",
    "https://www.probabilitycourse.com/chapter7/7_1_3_solved_probs.php",
    "https://www.probabilitycourse.com/chapter8/8_2_5_solved_probs.php",
    "https://www.probabilitycourse.com/chapter9/9_1_10_solved_probs.php",
    "https://www.probabilitycourse.com/chapter11/11_1_5_solved_probs.php",
    "https://www.probabilitycourse.com/chapter11/11_4_3_solved_probs.php",
]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


GENERATED_AT = now_iso()


def phi(x: float) -> float:
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))


def rel(path: Path) -> str:
    return str(path.relative_to(PROJECT_ROOT))


def base_problem(
    index: int,
    title_en: str,
    title_zh: str,
    category: str,
    difficulty: str,
    source_url: str,
    source_question: str,
    tags: list[str],
) -> dict:
    return {
        "id": f"{SLUG}-problem-{index:03d}",
        "titleEn": title_en,
        "titleZh": title_zh,
        "category": category,
        "difficulty": difficulty,
        "tags": [
            "ProbabilityCourse",
            "public solved example",
            *tags,
        ],
        "classificationReviewed": True,
        "classificationReview": {
            "category": category,
            "difficulty": difficulty,
            "logic": "Curated from a public ProbabilityCourse solved-example page and reviewed for QuantGym topic fit.",
            "reviewedBy": "Codex import-probabilitycourse-solved-samples",
        },
        "source": SLUG,
        "sourceUrl": source_url,
        "sourceType": "open-access-web-solved-example",
        "bookSlug": SLUG,
        "bookName": SOURCE_NAME,
        "visibility": "public",
        "sourceFiles": [source_url],
        "sourceQuestion": source_question,
        "answerOfficial": False,
        "answerPolicy": "Problem topic and numerical target are attributed to a public ProbabilityCourse solved-example page; this QuantGym entry uses a paraphrased prompt and locally reviewed bilingual solution, not a copy of the commercial student solutions guide.",
        "answerSource": {
            "type": "generated-reviewed-from-public-solved-example",
            "official": False,
            "verificationScript": "scripts/import-probabilitycourse-solved-samples.py",
            "sourceFiles": [source_url],
        },
        "rightsReview": {
            "status": "public-open-access-page",
            "note": "The source homepage describes the textbook as open access, while the odd-numbered end-of-chapter student solutions guide is sold separately. This source imports only publicly displayed in-chapter solved examples.",
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
    ch1 = PUBLIC_SOURCE_URLS[0]
    ch5 = PUBLIC_SOURCE_URLS[1]
    ch7 = PUBLIC_SOURCE_URLS[2]
    ch8 = PUBLIC_SOURCE_URLS[3]
    ch9 = PUBLIC_SOURCE_URLS[4]
    ch11_poisson = PUBLIC_SOURCE_URLS[5]
    ch11_brownian = PUBLIC_SOURCE_URLS[6]

    n1 = 1 - math.exp(-0.2)
    p_plane = 1 - phi(10 / 3)
    p_bm = 1 - phi(2 / math.sqrt(5))
    p_poisson = (0.5 * math.exp(-0.5)) ** 4
    p_merged = (math.exp(-3) * 3**2 / math.factorial(2)) * (math.exp(-3) * 3**3 / math.factorial(3))

    return [
        add(
            base_problem(
                1,
                "Conditional lifetime of an exponential-like product",
                "指数型寿命产品的条件失效概率",
                "probabilityExpectation",
                "Easy",
                ch1,
                "Chapter 1.4.5 solved problem 1",
                ["conditional probability", "survival function", "exponential distribution"],
            ),
            r"""
A product lifetime $T$ satisfies $P(T\ge t)=e^{-t/5}$ for all $t\ge0$. You have used the product for two years with no failure. What is the conditional probability that it fails during the third year, i.e. between years 2 and 3?
""",
            r"""
某产品寿命 $T$ 满足对所有 $t\ge0$ 都有 $P(T\ge t)=e^{-t/5}$。你已经无故障使用了 2 年。求它在第 3 年内失效，也就是在第 2 年到第 3 年之间失效的条件概率。
""",
            f"The conditional probability is $1-e^{{-1/5}}\\approx {n1:.4f}$.",
            f"条件概率为 $1-e^{{-1/5}}\\approx {n1:.4f}$。",
            r"""
Condition on survival to time 2:
$$P(2\le T\le 3\mid T\ge2)=\frac{P(T\ge2)-P(T\ge3)}{P(T\ge2)}.$$
Using the survival function,
$$\frac{e^{-2/5}-e^{-3/5}}{e^{-2/5}}=1-e^{-1/5}\approx0.1813.$$
This is the memoryless-style calculation behind exponential lifetimes.
""",
            r"""
在已经存活到 2 年的条件下，
$$P(2\le T\le 3\mid T\ge2)=\frac{P(T\ge2)-P(T\ge3)}{P(T\ge2)}.$$
代入生存函数得到
$$\frac{e^{-2/5}-e^{-3/5}}{e^{-2/5}}=1-e^{-1/5}\approx0.1813.$$
这正是指数型寿命的无记忆性计算。
""",
        ),
        add(
            base_problem(
                2,
                "Three fair coin tosses with conditional information",
                "三次公平抛硬币的条件概率",
                "probabilityExpectation",
                "Easy",
                ch1,
                "Chapter 1.4.5 solved problem 2",
                ["conditional probability", "coin tosses", "counting"],
            ),
            r"""
A fair coin is tossed three independent times. Find: (a) $P(HHH)$; (b) the probability of exactly one head; (c) the probability of at least two heads given that at least one head occurred.
""",
            r"""
公平硬币独立抛 3 次。求：(a) $P(HHH)$；(b) 恰好出现 1 次正面的概率；(c) 已知至少出现 1 次正面时，至少出现 2 次正面的条件概率。
""",
            r"The answers are $\frac18$, $\frac38$, and $\frac47$.",
            r"答案分别为 $\frac18$、$\frac38$、$\frac47$。",
            r"""
There are $2^3=8$ equally likely sequences. Only one sequence is $HHH$, so $P(HHH)=1/8$. Exactly one head can occur in $HTT,THT,TTH$, so the probability is $3/8$.

Given at least one head, the all-tails sequence is excluded, leaving 7 equally likely sequences. At least two heads occur in $HHT,HTH,THH,HHH$, hence
$$P(\text{at least 2 H}\mid \text{at least 1 H})=\frac{4}{7}.$$
""",
            r"""
共有 $2^3=8$ 个等可能序列。只有 $HHH$ 一个序列对应三次正面，所以 $P(HHH)=1/8$。恰好一次正面有 $HTT,THT,TTH$ 三种，因此概率为 $3/8$。

已知至少一次正面时，排除 $TTT$，剩下 7 个等可能序列。至少两次正面对应 $HHT,HTH,THH,HHH$ 四种，所以
$$P(\text{至少 2 次正面}\mid \text{至少 1 次正面})=\frac{4}{7}.$$
""",
        ),
        add(
            base_problem(
                3,
                "Rain, traffic, and lateness by total probability",
                "下雨、拥堵与迟到的全概率计算",
                "probabilityExpectation",
                "Medium",
                ch1,
                "Chapter 1.4.5 solved problem 5",
                ["Bayes rule", "total probability", "conditional probability"],
            ),
            r"""
On a random day, it rains with probability $1/3$. Conditional on rain, heavy traffic occurs with probability $1/2$; conditional on no rain, heavy traffic occurs with probability $1/4$. The probability of being late is $1/2$ if it rains and traffic is heavy, $1/8$ if it neither rains nor has heavy traffic, and $1/4$ in the other two weather-traffic cases. Find:
(a) $P(R^c\cap T\cap L^c)$; (b) $P(L)$; (c) $P(R\mid L)$.
""",
            r"""
随机一天，下雨概率为 $1/3$。若下雨，严重拥堵概率为 $1/2$；若不下雨，严重拥堵概率为 $1/4$。若下雨且拥堵，迟到概率为 $1/2$；若不下雨且不拥堵，迟到概率为 $1/8$；另外两种天气-交通情形下迟到概率均为 $1/4$。求：
(a) $P(R^c\cap T\cap L^c)$；(b) $P(L)$；(c) $P(R\mid L)$。
""",
            r"The three probabilities are $\frac18$, $\frac{11}{48}$, and $\frac6{11}$.",
            r"三个概率分别为 $\frac18$、$\frac{11}{48}$、$\frac6{11}$。",
            r"""
For (a), multiply along the branch:
$$P(R^c\cap T\cap L^c)=P(R^c)P(T\mid R^c)P(L^c\mid R^c,T)=\frac23\cdot\frac14\cdot\frac34=\frac18.$$
For (b), sum the four late branches:
$$P(L)=\frac13\frac12\frac12+\frac13\frac12\frac14+\frac23\frac14\frac14+\frac23\frac34\frac18=\frac{11}{48}.$$
For (c),
$$P(R\cap L)=\frac13\frac12\frac12+\frac13\frac12\frac14=\frac18,$$
so
$$P(R\mid L)=\frac{P(R\cap L)}{P(L)}=\frac{1/8}{11/48}=\frac6{11}.$$
""",
            r"""
(a) 沿条件概率树相乘：
$$P(R^c\cap T\cap L^c)=P(R^c)P(T\mid R^c)P(L^c\mid R^c,T)=\frac23\cdot\frac14\cdot\frac34=\frac18.$$
(b) 把四个会迟到的分支相加：
$$P(L)=\frac13\frac12\frac12+\frac13\frac12\frac14+\frac23\frac14\frac14+\frac23\frac34\frac18=\frac{11}{48}.$$
(c) 先算
$$P(R\cap L)=\frac13\frac12\frac12+\frac13\frac12\frac14=\frac18,$$
于是
$$P(R\mid L)=\frac{P(R\cap L)}{P(L)}=\frac{1/8}{11/48}=\frac6{11}.$$
""",
        ),
        add(
            base_problem(
                4,
                "Bayes rule with a two-headed coin",
                "含双正面硬币的贝叶斯更新",
                "probabilityExpectation",
                "Easy",
                ch1,
                "Chapter 1.4.5 solved problem 6",
                ["Bayes rule", "law of total probability", "coin tosses"],
            ),
            r"""
A box contains two fair coins and one two-headed coin. A coin is chosen uniformly at random and tossed once. Find (a) the probability of observing heads; (b) the probability that the chosen coin was the two-headed coin given that heads was observed.
""",
            r"""
盒中有两枚公平硬币和一枚双正面硬币。随机等概率选一枚硬币并抛一次。求：(a) 出现正面的概率；(b) 已知出现正面时，选中双正面硬币的概率。
""",
            r"The answers are $P(H)=\frac23$ and $P(\text{two-headed}\mid H)=\frac12$.",
            r"答案为 $P(H)=\frac23$，且 $P(\text{双正面}\mid H)=\frac12$。",
            r"""
Let $C_F$ be choosing a fair coin and $C_D$ choosing the two-headed coin. Then
$$P(H)=P(H\mid C_F)P(C_F)+P(H\mid C_D)P(C_D)=\frac12\cdot\frac23+1\cdot\frac13=\frac23.$$
Bayes' rule gives
$$P(C_D\mid H)=\frac{P(H\mid C_D)P(C_D)}{P(H)}=\frac{1\cdot(1/3)}{2/3}=\frac12.$$
""",
            r"""
令 $C_F$ 表示选中公平硬币，$C_D$ 表示选中双正面硬币。则
$$P(H)=P(H\mid C_F)P(C_F)+P(H\mid C_D)P(C_D)=\frac12\cdot\frac23+1\cdot\frac13=\frac23.$$
由贝叶斯公式，
$$P(C_D\mid H)=\frac{P(H\mid C_D)P(C_D)}{P(H)}=\frac{1\cdot(1/3)}{2/3}=\frac12.$$
""",
        ),
        add(
            base_problem(
                5,
                "Joint PMF marginals and independence",
                "联合 PMF 的边缘分布与独立性",
                "probabilityExpectation",
                "Medium",
                ch5,
                "Chapter 5.1.6 solved problem 1",
                ["joint distribution", "marginal distribution", "independence"],
            ),
            r"""
Random variables $X$ and $Y$ have joint PMF:

|  | $Y=2$ | $Y=4$ | $Y=5$ |
|---|---:|---:|---:|
| $X=1$ | $1/12$ | $1/24$ | $1/24$ |
| $X=2$ | $1/6$ | $1/12$ | $1/8$ |
| $X=3$ | $1/4$ | $1/8$ | $1/12$ |

Find $P(X\le2,Y\le4)$, the marginal PMFs, $P(Y=2\mid X=1)$, and whether $X,Y$ are independent.
""",
            r"""
随机变量 $X,Y$ 的联合 PMF 如下：

|  | $Y=2$ | $Y=4$ | $Y=5$ |
|---|---:|---:|---:|
| $X=1$ | $1/12$ | $1/24$ | $1/24$ |
| $X=2$ | $1/6$ | $1/12$ | $1/8$ |
| $X=3$ | $1/4$ | $1/8$ | $1/12$ |

求 $P(X\le2,Y\le4)$、边缘 PMF、$P(Y=2\mid X=1)$，并判断 $X,Y$ 是否独立。
""",
            r"$P(X\le2,Y\le4)=\frac38$. The marginals are $P_X=(1/6,3/8,11/24)$ for $X=1,2,3$ and $P_Y=(1/2,1/4,1/4)$ for $Y=2,4,5$. Also $P(Y=2\mid X=1)=\frac12$, and the variables are not independent.",
            r"$P(X\le2,Y\le4)=\frac38$。$X=1,2,3$ 的边缘分布为 $(1/6,3/8,11/24)$，$Y=2,4,5$ 的边缘分布为 $(1/2,1/4,1/4)$。且 $P(Y=2\mid X=1)=\frac12$，二者不独立。",
            r"""
The requested joint event sums four cells:
$$\frac1{12}+\frac1{24}+\frac16+\frac1{12}=\frac38.$$
Row sums give
$$P_X(1)=\frac16,\quad P_X(2)=\frac38,\quad P_X(3)=\frac{11}{24},$$
and column sums give
$$P_Y(2)=\frac12,\quad P_Y(4)=\frac14,\quad P_Y(5)=\frac14.$$
For the conditional probability,
$$P(Y=2\mid X=1)=\frac{P(X=1,Y=2)}{P_X(1)}=\frac{1/12}{1/6}=\frac12.$$
Independence would require every cell to factor. But
$$P(X=2,Y=2)=\frac16\ne P_X(2)P_Y(2)=\frac38\cdot\frac12=\frac3{16},$$
so $X$ and $Y$ are not independent.
""",
            r"""
目标联合事件包含四个格子：
$$\frac1{12}+\frac1{24}+\frac16+\frac1{12}=\frac38.$$
行和给出
$$P_X(1)=\frac16,\quad P_X(2)=\frac38,\quad P_X(3)=\frac{11}{24},$$
列和给出
$$P_Y(2)=\frac12,\quad P_Y(4)=\frac14,\quad P_Y(5)=\frac14.$$
条件概率为
$$P(Y=2\mid X=1)=\frac{P(X=1,Y=2)}{P_X(1)}=\frac{1/12}{1/6}=\frac12.$$
若独立，每个格子都应等于边缘概率乘积。但
$$P(X=2,Y=2)=\frac16\ne P_X(2)P_Y(2)=\frac38\cdot\frac12=\frac3{16},$$
所以 $X$ 与 $Y$ 不独立。
""",
        ),
        add(
            base_problem(
                6,
                "Poisson thinning into buyers and non-buyers",
                "泊松顾客流的购买者与非购买者拆分",
                "probabilityExpectation",
                "Medium",
                ch5,
                "Chapter 5.1.6 solved problem 5",
                ["Poisson thinning", "joint distribution", "expectation"],
            ),
            r"""
The number of customers visiting a restaurant in a day is $N\sim Poisson(\lambda)$. Each customer buys a drink independently with probability $p$. Let $X$ be the number who buy drinks and $Y$ the number who do not, so $X+Y=N$. Find the marginal PMFs of $X,Y$, their joint PMF, whether they are independent, and $E[X^2Y^2]$.
""",
            r"""
某餐厅一天顾客数 $N\sim Poisson(\lambda)$。每位顾客独立地以概率 $p$ 买饮料。令 $X$ 为买饮料的人数，$Y$ 为不买饮料的人数，因此 $X+Y=N$。求 $X,Y$ 的边缘 PMF、联合 PMF、是否独立，以及 $E[X^2Y^2]$。
""",
            r"$X\sim Poisson(\lambda p)$ and $Y\sim Poisson(\lambda(1-p))$ are independent. Thus $E[X^2Y^2]=(\lambda p+(\lambda p)^2)(\lambda(1-p)+(\lambda(1-p))^2)$.",
            r"$X\sim Poisson(\lambda p)$，$Y\sim Poisson(\lambda(1-p))$，且二者独立。因此 $E[X^2Y^2]=(\lambda p+(\lambda p)^2)(\lambda(1-p)+(\lambda(1-p))^2)$。",
            r"""
Condition on $N=n$. Then $X\mid N=n\sim Binomial(n,p)$ and $Y=n-X$. Summing out $n$ gives the standard Poisson-thinning result:
$$P(X=x)=e^{-\lambda p}\frac{(\lambda p)^x}{x!},\qquad P(Y=y)=e^{-\lambda(1-p)}\frac{(\lambda(1-p))^y}{y!}.$$
For $x,y\ge0$,
$$P(X=x,Y=y)=P(N=x+y)\binom{x+y}{x}p^x(1-p)^y
=e^{-\lambda}\frac{(\lambda p)^x}{x!}\frac{(\lambda(1-p))^y}{y!}.$$
This factors into the two marginals, so $X$ and $Y$ are independent. Let $a=\lambda p$ and $b=\lambda(1-p)$. For a Poisson variable $Z$ with mean $m$, $E[Z^2]=m+m^2$, hence
$$E[X^2Y^2]=E[X^2]E[Y^2]=(a+a^2)(b+b^2).$$
""",
            r"""
在 $N=n$ 条件下，$X\mid N=n\sim Binomial(n,p)$，且 $Y=n-X$。对 $n$ 求和得到泊松拆分结论：
$$P(X=x)=e^{-\lambda p}\frac{(\lambda p)^x}{x!},\qquad P(Y=y)=e^{-\lambda(1-p)}\frac{(\lambda(1-p))^y}{y!}.$$
对 $x,y\ge0$，
$$P(X=x,Y=y)=P(N=x+y)\binom{x+y}{x}p^x(1-p)^y
=e^{-\lambda}\frac{(\lambda p)^x}{x!}\frac{(\lambda(1-p))^y}{y!}.$$
该式可分解为两个边缘分布的乘积，所以 $X,Y$ 独立。令 $a=\lambda p$、$b=\lambda(1-p)$。若 $Z$ 为均值 $m$ 的泊松变量，则 $E[Z^2]=m+m^2$，因此
$$E[X^2Y^2]=E[X^2]E[Y^2]=(a+a^2)(b+b^2).$$
""",
        ),
        add(
            base_problem(
                7,
                "Expected waiting time for two consecutive heads",
                "等待连续两次正面的期望抛掷次数",
                "probabilityExpectation",
                "Medium",
                ch5,
                "Chapter 5.1.6 solved problem 6",
                ["conditional expectation", "recursion", "coin tosses"],
            ),
            r"""
A biased coin has $P(H)=p$. It is tossed until two consecutive heads appear. Let $X$ be the total number of tosses. Find $E[X]$.
""",
            r"""
一枚偏硬币满足 $P(H)=p$。反复抛掷直到第一次出现连续两个正面。令 $X$ 为总抛掷次数，求 $E[X]$。
""",
            r"$E[X]=\frac{1+p}{p^2}$.",
            r"$E[X]=\frac{1+p}{p^2}$。",
            r"""
Let $\mu=E[X]$ and let $a$ be the expected remaining tosses after one head has just been observed. From the start,
$$\mu=1+(1-p)\mu+p a.$$
From the one-head state, the next toss either finishes or resets:
$$a=1+(1-p)\mu.$$
Substitute:
$$\mu=1+(1-p)\mu+p\bigl(1+(1-p)\mu\bigr)
=1+p+(1-p^2)\mu.$$
Thus $p^2\mu=1+p$, so
$$\mu=\frac{1+p}{p^2}.$$
""",
            r"""
令 $\mu=E[X]$，并令 $a$ 表示“刚看到一个正面后”的期望剩余抛掷次数。从起点出发，
$$\mu=1+(1-p)\mu+p a.$$
在已经看到一个正面的状态下，下一次抛掷要么成功结束，要么失败并重置：
$$a=1+(1-p)\mu.$$
代入得到
$$\mu=1+(1-p)\mu+p\bigl(1+(1-p)\mu\bigr)
=1+p+(1-p^2)\mu.$$
所以
$$p^2\mu=1+p,\qquad \mu=\frac{1+p}{p^2}.$$
""",
        ),
        add(
            base_problem(
                8,
                "CLT approximation for total passenger weight",
                "乘客总重量的中心极限定理近似",
                "probabilityExpectation",
                "Easy",
                ch7,
                "Chapter 7.1.3 solved problem 1",
                ["CLT", "normal approximation", "variance"],
            ),
            r"""
The weights of 100 passengers are i.i.d. with mean 170 pounds and standard deviation 30 pounds. Use the central limit theorem to approximate the probability that their total weight exceeds 18,000 pounds.
""",
            r"""
100 名乘客体重独立同分布，均值 170 磅、标准差 30 磅。用中心极限定理近似总重量超过 18,000 磅的概率。
""",
            f"The CLT approximation is $1-\\Phi(10/3)\\approx {p_plane:.6f}$.",
            f"CLT 近似结果为 $1-\\Phi(10/3)\\approx {p_plane:.6f}$。",
            r"""
Let $W=\sum_{i=1}^{100}X_i$. Then
$$E[W]=100\cdot170=17000,\qquad Var(W)=100\cdot30^2=90000,$$
so $\sigma_W=300$. By the CLT,
$$P(W>18000)\approx P\left(Z>\frac{18000-17000}{300}\right)=P(Z>10/3)=1-\Phi(10/3).$$
Numerically this is about $4.29\times10^{-4}$.
""",
            r"""
令 $W=\sum_{i=1}^{100}X_i$。则
$$E[W]=100\cdot170=17000,\qquad Var(W)=100\cdot30^2=90000,$$
所以 $\sigma_W=300$。由中心极限定理，
$$P(W>18000)\approx P\left(Z>\frac{18000-17000}{300}\right)=P(Z>10/3)=1-\Phi(10/3).$$
数值约为 $4.29\times10^{-4}$。
""",
        ),
        add(
            base_problem(
                9,
                "CLT planning for party sandwiches",
                "用 CLT 规划聚会三明治数量",
                "probabilityExpectation",
                "Medium",
                ch7,
                "Chapter 7.1.3 solved problem 3",
                ["CLT", "quantile", "normal approximation"],
            ),
            r"""
There are 64 guests. Each guest independently needs 0, 1, or 2 sandwiches with probabilities $1/4$, $1/2$, and $1/4$. How many sandwiches should be prepared so that the probability of no shortage is approximately at least 95%?
""",
            r"""
有 64 位客人。每位客人独立地需要 0、1、2 个三明治，概率分别为 $1/4$、$1/2$、$1/4$。为了使“不短缺”的概率近似至少为 95%，应准备多少个三明治？
""",
            r"Prepare 74 sandwiches.",
            r"应准备 74 个三明治。",
            r"""
For one guest, $E[X]=1$ and
$$E[X^2]=0^2\frac14+1^2\frac12+2^2\frac14=\frac32,$$
so $Var(X)=1/2$. For $Y=\sum_{i=1}^{64}X_i$,
$$E[Y]=64,\qquad Var(Y)=32,\qquad \sigma_Y=4\sqrt2.$$
Using the CLT, choose $y$ with
$$\Phi\left(\frac{y-64}{4\sqrt2}\right)\ge0.95.$$
Since $\Phi^{-1}(0.95)\approx1.645$,
$$y\ge64+1.645(4\sqrt2)\approx73.3.$$
The smallest integer meeting this target is 74.
""",
            r"""
对单个客人，$E[X]=1$，且
$$E[X^2]=0^2\frac14+1^2\frac12+2^2\frac14=\frac32,$$
所以 $Var(X)=1/2$。令 $Y=\sum_{i=1}^{64}X_i$，则
$$E[Y]=64,\qquad Var(Y)=32,\qquad \sigma_Y=4\sqrt2.$$
由 CLT，选择 $y$ 使
$$\Phi\left(\frac{y-64}{4\sqrt2}\right)\ge0.95.$$
由于 $\Phi^{-1}(0.95)\approx1.645$，
$$y\ge64+1.645(4\sqrt2)\approx73.3.$$
满足条件的最小整数为 74。
""",
        ),
        add(
            base_problem(
                10,
                "Sample size for an exponential sample mean",
                "指数样本均值所需样本量",
                "statistics",
                "Medium",
                ch7,
                "Chapter 7.1.3 solved problem 4",
                ["CLT", "sample mean", "sample size"],
            ),
            r"""
Let $X_1,\ldots,X_n$ be i.i.d. $Exponential(1)$ variables, and let $\bar X=n^{-1}\sum_i X_i$. Use the CLT to find how large $n$ should be so that $P(0.9\le \bar X\le1.1)\ge0.95$ approximately.
""",
            r"""
令 $X_1,\ldots,X_n$ 独立同分布且服从 $Exponential(1)$，并令 $\bar X=n^{-1}\sum_i X_i$。用 CLT 近似求使 $P(0.9\le \bar X\le1.1)\ge0.95$ 所需的样本量 $n$。
""",
            r"The CLT calculation gives $n\ge385$.",
            r"CLT 计算给出 $n\ge385$。",
            r"""
For $Exponential(1)$, $E[X_i]=1$ and $Var(X_i)=1$. Then
$$\frac{\bar X-1}{1/\sqrt n}\approx N(0,1).$$
Thus
$$P(0.9\le\bar X\le1.1)\approx P(-0.1\sqrt n\le Z\le0.1\sqrt n)=2\Phi(0.1\sqrt n)-1.$$
Require this to be at least $0.95$:
$$\Phi(0.1\sqrt n)\ge0.975.$$
Since $\Phi^{-1}(0.975)\approx1.96$, we need $\sqrt n\ge19.6$, hence $n\ge384.16$. The integer answer is $n\ge385$.
""",
            r"""
对 $Exponential(1)$，有 $E[X_i]=1$、$Var(X_i)=1$。因此
$$\frac{\bar X-1}{1/\sqrt n}\approx N(0,1).$$
于是
$$P(0.9\le\bar X\le1.1)\approx P(-0.1\sqrt n\le Z\le0.1\sqrt n)=2\Phi(0.1\sqrt n)-1.$$
要求该值至少为 $0.95$：
$$\Phi(0.1\sqrt n)\ge0.975.$$
由于 $\Phi^{-1}(0.975)\approx1.96$，需要 $\sqrt n\ge19.6$，即 $n\ge384.16$。整数样本量为 $n\ge385$。
""",
        ),
        add(
            base_problem(
                11,
                "Bias and MSE of the maximum uniform estimator",
                "均匀分布最大值估计量的偏差与 MSE",
                "statistics",
                "Medium",
                ch8,
                "Chapter 8.2.5 solved problem 3",
                ["estimator", "bias", "MSE", "uniform distribution"],
            ),
            r"""
Let $X_1,\ldots,X_n$ be a random sample from $Uniform(0,\theta)$, where $\theta$ is unknown. Define $\hat\Theta_n=\max_i X_i$. Find the bias and MSE of $\hat\Theta_n$, and decide whether it is consistent for $\theta$.
""",
            r"""
令 $X_1,\ldots,X_n$ 为来自 $Uniform(0,\theta)$ 的样本，其中 $\theta$ 未知。定义 $\hat\Theta_n=\max_i X_i$。求 $\hat\Theta_n$ 的偏差、MSE，并判断它是否为 $\theta$ 的一致估计量。
""",
            r"The bias is $-\theta/(n+1)$, the MSE is $\frac{2\theta^2}{(n+1)(n+2)}$, and the estimator is consistent.",
            r"偏差为 $-\theta/(n+1)$，MSE 为 $\frac{2\theta^2}{(n+1)(n+2)}$，该估计量是一致的。",
            r"""
For $M=\max_iX_i$,
$$P(M\le m)=\left(\frac{m}{\theta}\right)^n,\qquad 0\le m\le\theta.$$
Therefore
$$f_M(m)=\frac{n m^{n-1}}{\theta^n}.$$
Moments are
$$E[M]=\frac{n}{n+1}\theta,\qquad E[M^2]=\frac{n}{n+2}\theta^2.$$
Thus
$$Bias(M)=E[M]-\theta=-\frac{\theta}{n+1}.$$
Also
$$MSE(M)=E[(M-\theta)^2]=E[M^2]-2\theta E[M]+\theta^2=\frac{2\theta^2}{(n+1)(n+2)}.$$
This tends to 0 as $n\to\infty$, so $\hat\Theta_n$ is consistent.
""",
            r"""
令 $M=\max_iX_i$。则
$$P(M\le m)=\left(\frac{m}{\theta}\right)^n,\qquad 0\le m\le\theta.$$
因此
$$f_M(m)=\frac{n m^{n-1}}{\theta^n}.$$
可得矩：
$$E[M]=\frac{n}{n+1}\theta,\qquad E[M^2]=\frac{n}{n+2}\theta^2.$$
所以
$$Bias(M)=E[M]-\theta=-\frac{\theta}{n+1}.$$
并且
$$MSE(M)=E[(M-\theta)^2]=E[M^2]-2\theta E[M]+\theta^2=\frac{2\theta^2}{(n+1)(n+2)}.$$
该 MSE 随 $n\to\infty$ 收敛到 0，因此 $\hat\Theta_n$ 是一致估计量。
""",
        ),
        add(
            base_problem(
                12,
                "Normal-normal posterior update",
                "正态-正态模型的后验更新",
                "statistics",
                "Medium",
                ch9,
                "Chapter 9.1.10 solved problem 1",
                ["Bayesian inference", "normal distribution", "posterior"],
            ),
            r"""
Let $X\sim N(0,1)$ and suppose $Y\mid X=x\sim N(x,1)$. Show the posterior distribution of $X$ given $Y=y$.
""",
            r"""
令 $X\sim N(0,1)$，且 $Y\mid X=x\sim N(x,1)$。求给定 $Y=y$ 后 $X$ 的后验分布。
""",
            r"$X\mid Y=y\sim N(y/2,\,1/2)$.",
            r"$X\mid Y=y\sim N(y/2,\,1/2)$。",
            r"""
Up to a normalizing constant in $x$,
$$f_{X\mid Y}(x\mid y)\propto f_{Y\mid X}(y\mid x)f_X(x)
\propto \exp\left[-\frac{(y-x)^2}{2}\right]\exp\left[-\frac{x^2}{2}\right].$$
Combine the exponent:
$$-\frac12\{(y-x)^2+x^2\}=-x^2+xy-\frac{y^2}{2}
=-\left(x-\frac y2\right)^2+\text{constant in }y.$$
This is the kernel of a normal distribution with mean $y/2$ and variance $1/2$.
""",
            r"""
忽略只依赖于 $y$ 的归一化常数，
$$f_{X\mid Y}(x\mid y)\propto f_{Y\mid X}(y\mid x)f_X(x)
\propto \exp\left[-\frac{(y-x)^2}{2}\right]\exp\left[-\frac{x^2}{2}\right].$$
合并指数项：
$$-\frac12\{(y-x)^2+x^2\}=-x^2+xy-\frac{y^2}{2}
=-\left(x-\frac y2\right)^2+\text{只依赖于 }y\text{ 的常数}.$$
这是均值 $y/2$、方差 $1/2$ 的正态分布核。
""",
        ),
        add(
            base_problem(
                13,
                "Basic probabilities for a Poisson process",
                "泊松过程的基本区间概率",
                "probabilityExpectation",
                "Easy",
                ch11_poisson,
                "Chapter 11.1.5 solved problem 1",
                ["Poisson process", "independent increments"],
            ),
            r"""
Let $N(t)$ be a Poisson process with rate $\lambda=0.5$. Find: (a) the probability of no arrivals in $(3,5]$; (b) the probability of exactly one arrival in each of $(0,1]$, $(1,2]$, $(2,3]$, and $(3,4]$.
""",
            r"""
令 $N(t)$ 为速率 $\lambda=0.5$ 的泊松过程。求：(a) 区间 $(3,5]$ 中没有到达的概率；(b) 在 $(0,1]$、$(1,2]$、$(2,3]$、$(3,4]$ 每个区间中都恰有一次到达的概率。
""",
            f"The answers are $e^{{-1}}\\approx {math.exp(-1):.4f}$ and $[0.5e^{{-0.5}}]^4\\approx {p_poisson:.6f}$.",
            f"答案为 $e^{{-1}}\\approx {math.exp(-1):.4f}$ 和 $[0.5e^{{-0.5}}]^4\\approx {p_poisson:.6f}$。",
            r"""
The length of $(3,5]$ is 2, so the count has distribution $Poisson(0.5\cdot2)=Poisson(1)$. Thus
$$P(N(5)-N(3)=0)=e^{-1}.$$
Each unit interval has count $Poisson(0.5)$, and disjoint increments are independent. Therefore
$$P(\text{one in each of four intervals})=\left(e^{-0.5}\frac{0.5^1}{1!}\right)^4=[0.5e^{-0.5}]^4.$$
""",
            r"""
区间 $(3,5]$ 长度为 2，因此计数服从 $Poisson(0.5\cdot2)=Poisson(1)$。所以
$$P(N(5)-N(3)=0)=e^{-1}.$$
每个单位区间的计数服从 $Poisson(0.5)$，且不相交增量独立。因此
$$P(\text{四个区间各一次到达})=\left(e^{-0.5}\frac{0.5^1}{1!}\right)^4=[0.5e^{-0.5}]^4.$$
""",
        ),
        add(
            base_problem(
                14,
                "Merged Poisson processes and source attribution",
                "合并泊松过程与来源归因",
                "probabilityExpectation",
                "Medium",
                ch11_poisson,
                "Chapter 11.1.5 solved problem 5",
                ["Poisson process", "merging", "splitting"],
            ),
            r"""
Let $N_1(t)$ and $N_2(t)$ be independent Poisson processes with rates 1 and 2. Let $N(t)=N_1(t)+N_2(t)$. Find: (a) $P(N(1)=2,N(2)=5)$; (b) $P(N_1(1)=1\mid N(1)=2)$.
""",
            r"""
令 $N_1(t)$ 与 $N_2(t)$ 为相互独立的泊松过程，速率分别为 1 和 2。令 $N(t)=N_1(t)+N_2(t)$。求：(a) $P(N(1)=2,N(2)=5)$；(b) $P(N_1(1)=1\mid N(1)=2)$。
""",
            f"The answers are $\\frac{{3^5}}{{2!3!}}e^{{-6}}\\approx {p_merged:.5f}$ and $\\frac49$.",
            f"答案为 $\\frac{{3^5}}{{2!3!}}e^{{-6}}\\approx {p_merged:.5f}$ 和 $\\frac49$。",
            r"""
The merged process is Poisson with rate $1+2=3$. Independent increments give
$$P(N(1)=2,N(2)=5)=P(N(1)=2)P(N(2)-N(1)=3).$$
Thus
$$P=\left(e^{-3}\frac{3^2}{2!}\right)\left(e^{-3}\frac{3^3}{3!}\right)=\frac{3^5}{2!3!}e^{-6}.$$
For the source of two arrivals by time 1, each arrival belongs to process 1 with probability $1/(1+2)=1/3$. Conditional on $N(1)=2$,
$$N_1(1)\mid N(1)=2\sim Binomial(2,1/3),$$
so
$$P(N_1(1)=1\mid N(1)=2)=\binom21\frac13\frac23=\frac49.$$
""",
            r"""
合并过程是速率 $1+2=3$ 的泊松过程。由独立增量，
$$P(N(1)=2,N(2)=5)=P(N(1)=2)P(N(2)-N(1)=3).$$
因此
$$P=\left(e^{-3}\frac{3^2}{2!}\right)\left(e^{-3}\frac{3^3}{3!}\right)=\frac{3^5}{2!3!}e^{-6}.$$
在时刻 1 前的两次到达中，每次来自过程 1 的概率为 $1/(1+2)=1/3$。在 $N(1)=2$ 条件下，
$$N_1(1)\mid N(1)=2\sim Binomial(2,1/3),$$
所以
$$P(N_1(1)=1\mid N(1)=2)=\binom21\frac13\frac23=\frac49.$$
""",
        ),
        add(
            base_problem(
                15,
                "A linear combination of Brownian motion values",
                "布朗运动取值线性组合的概率",
                "probabilityExpectation",
                "Medium",
                ch11_brownian,
                "Chapter 11.4.3 solved problem 1",
                ["Brownian motion", "Gaussian process", "covariance"],
            ),
            r"""
Let $W(t)$ be standard Brownian motion. Find $P(W(1)+W(2)>2)$.
""",
            r"""
令 $W(t)$ 为标准布朗运动。求 $P(W(1)+W(2)>2)$。
""",
            f"The probability is $1-\\Phi(2/\\sqrt5)\\approx {p_bm:.4f}$.",
            f"概率为 $1-\\Phi(2/\\sqrt5)\\approx {p_bm:.4f}$。",
            r"""
Because Brownian motion is Gaussian, $X=W(1)+W(2)$ is normal. Its mean is 0. Its variance is
$$Var(W(1))+Var(W(2))+2Cov(W(1),W(2))=1+2+2\min(1,2)=5.$$
Therefore $X\sim N(0,5)$ and
$$P(W(1)+W(2)>2)=P\left(Z>\frac{2}{\sqrt5}\right)=1-\Phi(2/\sqrt5).$$
""",
            r"""
由于布朗运动是高斯过程，$X=W(1)+W(2)$ 服从正态分布。其均值为 0，方差为
$$Var(W(1))+Var(W(2))+2Cov(W(1),W(2))=1+2+2\min(1,2)=5.$$
因此 $X\sim N(0,5)$，从而
$$P(W(1)+W(2)>2)=P\left(Z>\frac{2}{\sqrt5}\right)=1-\Phi(2/\sqrt5).$$
""",
        ),
        add(
            base_problem(
                16,
                "Moments of exponentiated Brownian motion",
                "指数布朗运动的矩与协方差",
                "probabilityExpectation",
                "Hard",
                ch11_brownian,
                "Chapter 11.4.3 solved problem 3",
                ["Brownian motion", "lognormal distribution", "covariance"],
            ),
            r"""
Let $W(t)$ be standard Brownian motion and define $X(t)=\exp(W(t))$. Find $E[X(t)]$, $Var(X(t))$, and $Cov(X(s),X(t))$ for $0\le s\le t$.
""",
            r"""
令 $W(t)$ 为标准布朗运动，并定义 $X(t)=\exp(W(t))$。求 $E[X(t)]$、$Var(X(t))$，以及当 $0\le s\le t$ 时的 $Cov(X(s),X(t))$。
""",
            r"$E[X(t)]=e^{t/2}$, $Var(X(t))=e^{2t}-e^t$, and $Cov(X(s),X(t))=e^{(s+t)/2}(e^s-1)$ for $s\le t$.",
            r"$E[X(t)]=e^{t/2}$，$Var(X(t))=e^{2t}-e^t$，且当 $s\le t$ 时 $Cov(X(s),X(t))=e^{(s+t)/2}(e^s-1)$。",
            r"""
Since $W(t)\sim N(0,t)$, the normal MGF gives
$$E[e^{W(t)}]=e^{t/2},\qquad E[e^{2W(t)}]=e^{2t}.$$
Therefore
$$Var(X(t))=E[e^{2W(t)}]-E[e^{W(t)}]^2=e^{2t}-e^t.$$
For $0\le s\le t$, $W(s)+W(t)$ is normal with mean 0 and variance
$$Var(W(s))+Var(W(t))+2Cov(W(s),W(t))=s+t+2s=t+3s.$$
Thus
$$E[X(s)X(t)]=E[e^{W(s)+W(t)}]=e^{(t+3s)/2}.$$
Subtracting the product of means,
$$Cov(X(s),X(t))=e^{(t+3s)/2}-e^{s/2}e^{t/2}=e^{(s+t)/2}(e^s-1).$$
""",
            r"""
因为 $W(t)\sim N(0,t)$，由正态分布 MGF，
$$E[e^{W(t)}]=e^{t/2},\qquad E[e^{2W(t)}]=e^{2t}.$$
因此
$$Var(X(t))=E[e^{2W(t)}]-E[e^{W(t)}]^2=e^{2t}-e^t.$$
当 $0\le s\le t$ 时，$W(s)+W(t)$ 为均值 0 的正态变量，方差为
$$Var(W(s))+Var(W(t))+2Cov(W(s),W(t))=s+t+2s=t+3s.$$
所以
$$E[X(s)X(t)]=E[e^{W(s)+W(t)}]=e^{(t+3s)/2}.$$
减去均值乘积：
$$Cov(X(s),X(t))=e^{(t+3s)/2}-e^{s/2}e^{t/2}=e^{(s+t)/2}(e^s-1).$$
""",
        ),
    ]


def cache_public_pages() -> list[str]:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cached = []
    for url in PUBLIC_SOURCE_URLS:
        file_name = url.rstrip("/").split("/")[-1].replace(".php", ".html")
        output_path = CACHE_DIR / file_name
        if not output_path.exists():
            request = Request(url, headers={"User-Agent": "QuantGym source audit"})
            try:
                with urlopen(request, timeout=20) as response:
                    output_path.write_bytes(response.read())
            except URLError as exc:
                print(f"Warning: could not cache {url}: {exc}", file=sys.stderr)
                continue
        cached.append(rel(output_path))
    return cached


def write_manifest_entry(problem_count: int) -> None:
    manifest = read_json(MANIFEST_PATH, {"version": 1, "sources": []})
    sources = manifest.setdefault("sources", [])
    entry = {
        "slug": SLUG,
        "name": SOURCE_NAME,
        "type": "open-access-web-solved-example",
        "sourceUrl": SOURCE_URL,
        "sourcePageUrls": PUBLIC_SOURCE_URLS,
        "problemFile": f"{SLUG}/problems.json",
        "problemCount": problem_count,
        "lastImportedAt": GENERATED_AT,
        "rightsNote": "Public ProbabilityCourse in-chapter solved examples only; excludes the separately sold student solutions guide for odd-numbered end-of-chapter problems. Prompts and solutions are paraphrased/reviewed for QuantGym.",
    }
    for index, source in enumerate(sources):
        if source.get("slug") == SLUG:
            sources[index] = {**source, **entry}
            break
    else:
        sources.append(entry)
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def write_outputs(problem_list: list[dict], cached_sources: list[str]) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    problems_path = OUTPUT_DIR / "problems.json"
    metadata_path = OUTPUT_DIR / "metadata.json"
    for problem in problem_list:
        problem["sourceFiles"] = [*problem["sourceFiles"], *cached_sources]
        problem["answerSource"]["sourceFiles"] = [*problem["answerSource"]["sourceFiles"], *cached_sources]
    problems_path.write_text(json.dumps({"problems": problem_list}, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    metadata = {
        "slug": SLUG,
        "name": SOURCE_NAME,
        "type": "open-access-web-solved-example",
        "sourceUrl": SOURCE_URL,
        "sourcePageUrls": PUBLIC_SOURCE_URLS,
        "problemCount": len(problem_list),
        "generatedAt": GENERATED_AT,
        "cachedSourceFiles": cached_sources,
        "rightsNote": "Curated from public ProbabilityCourse in-chapter solved example pages. Excludes commercial student solutions guide content; entries are paraphrased and locally reviewed.",
    }
    metadata_path.write_text(json.dumps(metadata, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def read_json(path: Path, fallback):
    if not path.exists():
        return fallback
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return fallback


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


def rebuild_catalog() -> None:
    result = subprocess.run(["node", "scripts/build-problem-catalog.mjs"], cwd=PROJECT_ROOT)
    if result.returncode != 0:
        raise SystemExit(result.returncode)


def parse_args(argv: list[str]) -> dict[str, bool]:
    return {arg[2:]: True for arg in argv if arg.startswith("--")}


def main(argv: list[str]) -> int:
    options = parse_args(argv)
    problem_list = problems()
    validate(problem_list)
    cached_sources = cache_public_pages()
    write_outputs(problem_list, cached_sources)
    write_manifest_entry(len(problem_list))
    if options.get("rebuild"):
        rebuild_catalog()
    print(json.dumps({
        "source": SLUG,
        "problemCount": len(problem_list),
        "output": rel(OUTPUT_DIR / "problems.json"),
        "metadata": rel(OUTPUT_DIR / "metadata.json"),
        "cachedSourceFiles": cached_sources,
    }, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
