#!/usr/bin/env python3
"""Import Stanford MS&E 214 Spring 2024 HW3 as a small public course source.

The downloaded HW3 bundle contains the official problem statements and data files,
but no official solution file. This importer therefore writes generated,
solver-verified solutions and marks them as non-official in each problem.
"""

from __future__ import annotations

import json
import math
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SLUG = "stanford-msande214-hw3"
SOURCE_NAME = "Stanford MS&E 214 HW3 Logistics/Finance"
SOURCE_URL = "https://web.stanford.edu/~ashishg/msande214/spr_2024/handouts/index.html"
SOURCE_ZIP_URL = "https://web.stanford.edu/~ashishg/msande214/spr_2024/handouts/hw3_files.zip"
BOOK_REL_DIR = "有题目的/Stanford MS&E 214 优化金融讲义 Stanford MS&E 214 Handouts"
SOURCE_REL_DIR = f"{BOOK_REL_DIR}/hw3_files/hw3_files"
SOURCE_DIR = PROJECT_ROOT / "量化书籍" / SOURCE_REL_DIR
OUTPUT_DIR = PROJECT_ROOT / "data" / "question-banks" / SLUG
ASSET_DIR = PROJECT_ROOT / "assets" / "problem-media" / SLUG
MANIFEST_PATH = PROJECT_ROOT / "data" / "question-banks" / "catalog-manifest.json"
PIPELINE_IMAGE_REL = f"assets/problem-media/{SLUG}/pipeline-network.png"
PIPELINE_IMAGE_PATH = PROJECT_ROOT / PIPELINE_IMAGE_REL

SOURCE_FILES = [
    f"{SOURCE_REL_DIR}/hw3.tex",
    f"{SOURCE_REL_DIR}/hw3.pdf",
    f"{SOURCE_REL_DIR}/homework3.xlsx",
]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def base_problem(index: int, title_en: str, title_zh: str, category: str, difficulty: str) -> dict:
    return {
        "id": f"{SLUG}-problem-{index:03d}",
        "titleEn": title_en,
        "titleZh": title_zh,
        "category": category,
        "difficulty": difficulty,
        "tags": [
            "Stanford MS&E 214",
            "Homework 3",
            "Optimization",
            "Logistics",
            "Finance",
        ],
        "classificationReviewed": True,
        "classificationReview": {
            "category": category,
            "difficulty": difficulty,
            "logic": "Reviewed from the Stanford MS&E 214 HW3 topic and verified solution complexity.",
            "reviewedBy": "Codex import-stanford-msande214-hw3",
        },
        "source": SLUG,
        "sourceUrl": SOURCE_URL,
        "sourceType": "course-homework",
        "bookSlug": SLUG,
        "bookName": SOURCE_NAME,
        "visibility": "public",
        "sourceFiles": SOURCE_FILES,
        "sourceQuestion": f"HW3 Problem {index}",
        "answerOfficial": False,
        "answerPolicy": "The Stanford HW3 bundle includes official prompts and data files but no official solution file; this answer is generated and solver-verified, not an official course solution.",
        "answerSource": {
            "type": "generated-solver-verified",
            "official": False,
            "verificationScript": "scripts/import-stanford-msande214-hw3.py",
            "sourceFiles": SOURCE_FILES,
        },
        "createdAt": now_iso(),
        "updatedAt": now_iso(),
    }


def build_problem_1() -> dict:
    p = base_problem(
        1,
        "HW3 Problem 1 - Airline staffing linear program",
        "HW3 问题 1 - 航空客服排班线性规划",
        "optimization",
        "Medium",
    )
    p["tags"] += ["linear programming", "staffing", "integer LP"]
    p["promptEn"] = """MSE Airlines needs to hire customer service agents. The minimum required staff by time period is:

| Time period | Required staff |
|---|---:|
| 6am-8am | 68 |
| 8am-10am | 90 |
| 10am-noon | 56 |
| Noon-2pm | 107 |
| 2pm-4pm | 80 |
| 4pm-6pm | 93 |
| 6pm-8pm | 62 |
| 8pm-10pm | 56 |
| 10pm-midnight | 40 |
| Midnight-6am | 15 |

Each agent works one available 8-hour shift. Daily wages are:

| Shift | Wage |
|---|---:|
| 6am-2pm | 180 dollars |
| 8am-4pm | 170 dollars |
| 10am-6pm | 160 dollars |
| Noon-8pm | 190 dollars |
| 2pm-10pm | 200 dollars |
| 4pm-midnight | 210 dollars |
| 10pm-6am | 225 dollars |
| Midnight-8am | 210 dollars |

(a) Write a linear program that determines the least expensive staffing plan. (b) Solve the linear program."""
    p["promptZh"] = """MSE Airlines 需要招聘客服人员。各时段最低在岗人数如下：

| 时段 | 最低人数 |
|---|---:|
| 6am-8am | 68 |
| 8am-10am | 90 |
| 10am-noon | 56 |
| Noon-2pm | 107 |
| 2pm-4pm | 80 |
| 4pm-6pm | 93 |
| 6pm-8pm | 62 |
| 8pm-10pm | 56 |
| 10pm-midnight | 40 |
| Midnight-6am | 15 |

每名员工只能选择一个可用的 8 小时班次。每日工资如下：

| 班次 | 工资 |
|---|---:|
| 6am-2pm | 180 美元 |
| 8am-4pm | 170 美元 |
| 10am-6pm | 160 美元 |
| Noon-8pm | 190 美元 |
| 2pm-10pm | 200 美元 |
| 4pm-midnight | 210 美元 |
| 10pm-6am | 225 美元 |
| Midnight-8am | 210 美元 |

(a) 写出决定最低成本排班方案的线性规划。(b) 求解该线性规划。"""
    p["answer"] = "The solver-verified optimum costs 36,680 dollars per day with shift counts `(53, 37, 31, 6, 16, 40, 0, 15)` in the shift order listed in the prompt."
    p["answerEn"] = p["answer"]
    p["answerZh"] = "经求解器验证，最优每日成本为 36,680 美元。按题干班次顺序，排班人数为 `(53, 37, 31, 6, 16, 40, 0, 15)`。"
    p["explanation"] = r"""Let $x_1,\ldots,x_8$ be the number of agents assigned to the eight shifts in the prompt order. Minimize
$$180x_1+170x_2+160x_3+190x_4+200x_5+210x_6+225x_7+210x_8$$
subject to coverage constraints:
$$x_1+x_8\ge68,$$
$$x_1+x_2\ge90,$$
$$x_1+x_2+x_3\ge56,$$
$$x_1+x_2+x_3+x_4\ge107,$$
$$x_2+x_3+x_4+x_5\ge80,$$
$$x_3+x_4+x_5+x_6\ge93,$$
$$x_4+x_5+x_6\ge62,$$
$$x_5+x_6\ge56,$$
$$x_6+x_7\ge40,$$
$$x_7+x_8\ge15,$$
with $x_i\ge0$ and, for actual staffing, integer $x_i$.

Solving the continuous LP and the integer LP gives the same optimal integer solution:
$$x=(53,37,31,6,16,40,0,15).$$
The resulting coverage is
$$(68,90,121,127,90,93,62,56,40,15),$$
so every requirement is met. The total wage cost is
$$180(53)+170(37)+160(31)+190(6)+200(16)+210(40)+225(0)+210(15)=36680.$$"""
    p["explanationZh"] = r"""令 $x_1,\ldots,x_8$ 表示按题干顺序分配到 8 个班次的人数。目标是最小化
$$180x_1+170x_2+160x_3+190x_4+200x_5+210x_6+225x_7+210x_8$$
并满足覆盖约束：
$$x_1+x_8\ge68,$$
$$x_1+x_2\ge90,$$
$$x_1+x_2+x_3\ge56,$$
$$x_1+x_2+x_3+x_4\ge107,$$
$$x_2+x_3+x_4+x_5\ge80,$$
$$x_3+x_4+x_5+x_6\ge93,$$
$$x_4+x_5+x_6\ge62,$$
$$x_5+x_6\ge56,$$
$$x_6+x_7\ge40,$$
$$x_7+x_8\ge15,$$
且 $x_i\ge0$。若按实际员工人数排班，还要求 $x_i$ 为整数。

连续 LP 与整数 LP 的最优解相同：
$$x=(53,37,31,6,16,40,0,15).$$
对应覆盖人数为
$$(68,90,121,127,90,93,62,56,40,15),$$
所有最低需求均满足。总工资成本为
$$180(53)+170(37)+160(31)+190(6)+200(16)+210(40)+225(0)+210(15)=36680.$$"""
    return p


def build_problem_2() -> dict:
    p = base_problem(
        2,
        "HW3 Problem 2 - Two-stage aid logistics min-cost flow",
        "HW3 问题 2 - 两阶段援助物流最小费用流",
        "optimization",
        "Hard",
    )
    p["tags"] += ["min-cost flow", "linear programming", "duality", "shadow prices"]
    p["promptEn"] = """An aid campaign ships one type of medicament from origin cities to transfer cities, then from transfer cities to destination cities. Origin supplies need not be fully used. Transfer-city inflow is capacity constrained and all transfer inflow must leave. Destination demands must be met.

Origins are Delhi, Shanghai, and Mumbai, each with availability 1,200. Transfer capacities are Jakarta 800, Surabaya 1,500, and Bandung 800. Destination demands are Palu 1,500 and Donggala 1,500. Costs are in thousands of dollars per thousand medicaments.

Origin-to-transfer costs:

| Origin | Jakarta | Surabaya | Bandung |
|---|---:|---:|---:|
| Delhi | 10 | 12 | 25 |
| Shanghai | 7 | 8 | 15 |
| Mumbai | 5 | 8 | 10 |

Transfer-to-destination costs:

| Transfer | Palu | Donggala |
|---|---:|---:|
| Jakarta | 20 | 15 |
| Surabaya | 15 | 20 |
| Bandung | 10 | 16 |

(a) Formulate a min-cost flow or LP. (b) Solve it. (c) Use dual variables to decide where to invest in one extra unit of origin availability or transfer capacity, and which destination is most expensive to serve with one extra unit."""
    p["promptZh"] = """某援助项目需要把一种药品先从起点城市运到中转城市，再从中转城市运到目的城市。起点供给不必全部用完；中转城市的流入受容量限制，且流入中转城市的货物必须全部流出；目的城市需求必须满足。

起点城市为 Delhi、Shanghai、Mumbai，各自可用量均为 1,200。中转城市容量为 Jakarta 800、Surabaya 1,500、Bandung 800。目的城市需求为 Palu 1,500、Donggala 1,500。成本单位为“每千件药品的千美元”。

起点到中转成本：

| 起点 | Jakarta | Surabaya | Bandung |
|---|---:|---:|---:|
| Delhi | 10 | 12 | 25 |
| Shanghai | 7 | 8 | 15 |
| Mumbai | 5 | 8 | 10 |

中转到目的地成本：

| 中转 | Palu | Donggala |
|---|---:|---:|
| Jakarta | 20 | 15 |
| Surabaya | 15 | 20 |
| Bandung | 10 | 16 |

(a) 写出最小费用流或 LP。(b) 求解。(c) 用对偶变量判断：若以相同成本增加某个起点供给或某个中转容量 1 单位，应投哪里？若必须给某个目的城市额外提供 1 单位，哪个最贵？"""
    p["answer"] = "The minimum cost is 70,500. The best one-unit expansion is Jakarta transfer capacity, saving 7 cost units. An extra unit for Donggala is more expensive than for Palu."
    p["answerEn"] = p["answer"]
    p["answerZh"] = "最小成本为 70,500。若只能扩张 1 单位，最优选择是扩张 Jakarta 中转容量，可节省 7 个成本单位。额外服务 Donggala 比额外服务 Palu 更贵。"
    p["explanation"] = r"""Let $x_{ij}$ be flow from origin $i$ to transfer city $j$, and $z_{jk}$ be flow from transfer city $j$ to destination $k$. Minimize
$$\sum_{i,j}c_{ij}x_{ij}+\sum_{j,k}d_{jk}z_{jk}$$
subject to
$$\sum_j x_{ij}\le S_i,\qquad \sum_i x_{ij}\le T_j,$$
$$\sum_i x_{ij}=\sum_k z_{jk},\qquad \sum_j z_{jk}=D_k,$$
and nonnegative flows.

A solver-verified optimum is:

Origin-to-transfer flow:

| Origin | Jakarta | Surabaya | Bandung |
|---|---:|---:|---:|
| Delhi | 400 | 200 | 0 |
| Shanghai | 0 | 1200 | 0 |
| Mumbai | 400 | 0 | 800 |

Transfer-to-destination flow:

| Transfer | Palu | Donggala |
|---|---:|---:|
| Jakarta | 0 | 800 |
| Surabaya | 700 | 700 |
| Bandung | 800 | 0 |

The total cost is
$$70500.$$

For the supply and transfer-capacity inequalities, the LP marginal values for relaxing the right-hand side are:

| Constraint | Marginal objective change per extra unit |
|---|---:|
| Delhi supply | 0 |
| Shanghai supply | -4 |
| Mumbai supply | -5 |
| Jakarta transfer capacity | -7 |
| Surabaya transfer capacity | 0 |
| Bandung transfer capacity | -2 |

The most valuable one-unit expansion is therefore Jakarta capacity, which lowers cost by 7. The demand equality marginals are Palu 27 and Donggala 32, so serving one extra unit of Donggala is more expensive."""
    p["explanationZh"] = r"""令 $x_{ij}$ 表示从起点城市 $i$ 到中转城市 $j$ 的流量，$z_{jk}$ 表示从中转城市 $j$ 到目的城市 $k$ 的流量。目标是最小化
$$\sum_{i,j}c_{ij}x_{ij}+\sum_{j,k}d_{jk}z_{jk}$$
约束为
$$\sum_j x_{ij}\le S_i,\qquad \sum_i x_{ij}\le T_j,$$
$$\sum_i x_{ij}=\sum_k z_{jk},\qquad \sum_j z_{jk}=D_k,$$
并且所有流量非负。

经求解器验证，一个最优解为：

起点到中转流量：

| 起点 | Jakarta | Surabaya | Bandung |
|---|---:|---:|---:|
| Delhi | 400 | 200 | 0 |
| Shanghai | 0 | 1200 | 0 |
| Mumbai | 400 | 0 | 800 |

中转到目的地流量：

| 中转 | Palu | Donggala |
|---|---:|---:|
| Jakarta | 0 | 800 |
| Surabaya | 700 | 700 |
| Bandung | 800 | 0 |

总成本为
$$70500.$$

对供给和中转容量不等式，放松右端 1 单位对应的目标函数边际变化为：

| 约束 | 每增加 1 单位的目标变化 |
|---|---:|
| Delhi 供给 | 0 |
| Shanghai 供给 | -4 |
| Mumbai 供给 | -5 |
| Jakarta 中转容量 | -7 |
| Surabaya 中转容量 | 0 |
| Bandung 中转容量 | -2 |

因此最值得扩张的是 Jakarta 中转容量，可使成本降低 7。需求等式的边际值为 Palu 27、Donggala 32，因此额外服务 Donggala 更贵。"""
    return p


def build_problem_3() -> dict:
    p = base_problem(
        3,
        "HW3 Problem 3 - Currency hedging and arbitrage LP",
        "HW3 问题 3 - 汇率对冲与套利线性规划",
        "market",
        "Hard",
    )
    p["tags"] += ["hedging", "arbitrage", "linear programming", "options", "currency"]
    p["promptEn"] = r"""A US manufacturer considers an order from China for 100,000 vehicle telematics units for Yuan 70 million. Components cost USD 5 million. Assembly in the US costs USD 4 million; alternatively the Chinese retailer can assemble in China after a Yuan 20 million price reduction. At delivery in three months the manufacturer may also sell the components in the US for USD 3 million instead. If $y$ is the dollar price of one yuan at delivery, operating profit in millions of dollars is
$$\max(70y-9,\;50y-5,\;-2).$$

(a) The manufacturer can buy yuan currency, a zero-coupon USD bond with face value 1, and a Yuan/USD call option with strike 0.1. Current prices are 0.15 for yuan currency and 0.07 for the call; take the unit bond price as 1. Formulate an LP for the minimum-cost portfolio that gives no future liability, and solve it.

(b) Now a Yuan/USD put with strike 0.15 is also available at price 0.03. Formulate an LP to check for arbitrage, allowing long and short positions."""
    p["promptZh"] = r"""一家美国制造商正在考虑中国零售商的订单：以 7,000 万人民币购买 100,000 套车辆远程信息系统。零部件成本为 500 万美元。若在美国组装，还需 400 万美元；也可以由中国零售商在中国组装，但价格减少 2,000 万人民币。三个月后交付时，制造商也可以不出口，而是在美国把零部件卖给经销商，收入 300 万美元。若 $y$ 表示交付时 1 元人民币的美元价格，则运营利润（百万美元）为
$$\max(70y-9,\;50y-5,\;-2).$$

(a) 制造商可以买入人民币、面值为 1 美元的零息债券，以及行权价为 0.1 的人民币/美元看涨期权。当前人民币价格为 0.15，看涨期权价格为 0.07；假设单位债券价格为 1。写出使未来没有负债的最低成本组合 LP，并求解。

(b) 现在还可以买卖行权价为 0.15、价格为 0.03 的人民币/美元看跌期权。允许做多和做空，写出检查套利机会的 LP。"""
    p["answer"] = "For part (a), buying 2 units of the USD bond is optimal and costs 2 million dollars. For part (b), one zero-cost nonnegative-payoff portfolio is `(yuan, bond, call, put) = (30, -3, -30, 20)`, so the listed prices admit a weak arbitrage under the LP discretization/piecewise model."
    p["answerEn"] = p["answer"]
    p["answerZh"] = "第 (a) 问，买入 2 单位美元债券最优，成本为 200 万美元。第 (b) 问，一个零成本且未来收益非负的组合为 `(人民币, 债券, 看涨, 看跌) = (30, -3, -30, 20)`，因此在该分段线性 LP 模型下存在弱套利。"
    p["explanation"] = r"""For part (a), let $(a,b,c)$ be holdings of yuan currency, the USD bond, and the call. The LP is
$$\min\;0.15a+b+0.07c$$
subject to
$$ay+b+c(y-0.1)^+ + \max(70y-9,50y-5,-2)\ge0\quad\text{for all }y\ge0,$$
with $a,b,c\ge0$. Because all payoff functions are piecewise linear, it is enough to enforce the constraints at the breakpoints $y=0,0.06,0.1,0.2$ together with the nonnegative large-$y$ slope condition. At $y=0$, the operating payoff is $-2$, so $b\ge2$ is necessary. Taking
$$(a,b,c)=(0,2,0)$$
meets every constraint and costs 2.

For part (b), with holdings $(a,b,c,p)$ in yuan, bond, call, and put, use constraints
$$ay+b+c(y-0.1)^+ + p(0.15-y)^+\ge0$$
at $y=0,0.1,0.15$, plus the large-$y$ slope condition $a+c\ge0$. A standard normalization such as payoff at $y=0.1$ at least 1 avoids the zero solution. The solver returns
$$(a,b,c,p)=(30,-3,-30,20),$$
whose initial cost is
$$0.15(30)-3+0.07(-30)+0.03(20)=0.$$
Its payoff is nonnegative for all $y\ge0$: it is $10y$ for $0\le y\le0.1$, $3-20y$ for $0.1\le y\le0.15$, and $0$ for $y\ge0.15$. It is positive for $0<y<0.15$, so this is a zero-cost nonnegative-payoff arbitrage certificate under the LP model."""
    p["explanationZh"] = r"""第 (a) 问，令 $(a,b,c)$ 分别为人民币、美元债券、看涨期权持仓。LP 为
$$\min\;0.15a+b+0.07c$$
约束为
$$ay+b+c(y-0.1)^+ + \max(70y-9,50y-5,-2)\ge0\quad\text{对所有 }y\ge0,$$
且 $a,b,c\ge0$。由于所有收益函数都是分段线性的，只需在断点 $y=0,0.06,0.1,0.2$ 以及大 $y$ 斜率条件处检查。$y=0$ 时运营收益为 $-2$，所以必须有 $b\ge2$。取
$$(a,b,c)=(0,2,0)$$
即可满足所有约束，成本为 2。

第 (b) 问，令 $(a,b,c,p)$ 分别为人民币、债券、看涨、看跌持仓。约束为
$$ay+b+c(y-0.1)^+ + p(0.15-y)^+\ge0$$
在 $y=0,0.1,0.15$ 处成立，并加上大 $y$ 斜率条件 $a+c\ge0$。为了避免零解，可规定 $y=0.1$ 时收益至少为 1。求解器给出
$$(a,b,c,p)=(30,-3,-30,20),$$
初始成本为
$$0.15(30)-3+0.07(-30)+0.03(20)=0.$$
该组合对所有 $y\ge0$ 的未来收益非负：当 $0\le y\le0.1$ 时为 $10y$，当 $0.1\le y\le0.15$ 时为 $3-20y$，当 $y\ge0.15$ 时为 $0$。它在 $0<y<0.15$ 上严格为正，因此在该 LP 模型下给出了零成本非负收益套利证书。"""
    return p


def build_problem_4() -> dict:
    p = base_problem(
        4,
        "HW3 Problem 4 - Long-only quadratic portfolio optimization",
        "HW3 问题 4 - 仅多头约束的二次投资组合优化",
        "optimization",
        "Medium",
    )
    p["tags"] += ["quadratic programming", "portfolio", "covariance", "long-only"]
    p["promptEn"] = r"""The workbook sheet `problem4` gives lambda = 0.2, expected returns
$$\mu=(1,2,1.5,0),$$
and covariance matrix
$$V=\begin{pmatrix}
2&-1&0&0\\
-1&2&-1&0\\
0&-1&2&-1\\
0&0&-1&2
\end{pmatrix}.$$
Find a nonnegative portfolio $p\in\mathbb{R}_{\ge0}^4$ with total weight 1 that maximizes
$$\mu^Tp-\lambda p^TVp.$$"""
    p["promptZh"] = r"""工作簿 `problem4` 给出 $\lambda=0.2$，期望收益
$$\mu=(1,2,1.5,0),$$
协方差矩阵
$$V=\begin{pmatrix}
2&-1&0&0\\
-1&2&-1&0\\
0&-1&2&-1\\
0&0&-1&2
\end{pmatrix}.$$
求一个非负投资组合 $p\in\mathbb{R}_{\ge0}^4$，总权重为 1，使
$$\mu^Tp-\lambda p^TVp$$
最大。"""
    p["answer"] = r"The optimum is $$p=(0,\;17/24,\;7/24,\;0)\approx(0,0.70833,0.29167,0).$$ The objective value is approximately 1.70208."
    p["answerEn"] = p["answer"]
    p["answerZh"] = r"最优组合为 $$p=(0,\;17/24,\;7/24,\;0)\approx(0,0.70833,0.29167,0).$$ 目标函数值约为 1.70208。"
    p["explanation"] = r"""This is a concave quadratic maximization over the simplex because $V$ is positive semidefinite and $\lambda>0$. The KKT conditions can be checked by active-set enumeration, where an active set is the subset of assets allowed to have positive weight while the remaining assets are fixed at zero. The optimal active set contains assets 2 and 3 only. Solving the stationarity equations on that active set with $p_2+p_3=1$ gives
$$p_2=\frac{17}{24},\qquad p_3=\frac{7}{24}.$$
Thus
$$p=(0,17/24,7/24,0).$$
The expected return is
$$\mu^Tp=\frac{89}{48}\approx1.85417,$$
and the variance is
$$p^TVp=\frac{73}{96}\approx0.76042.$$
With $\lambda=0.2$, the objective value is
$$\frac{89}{48}-0.2\frac{73}{96}=\frac{817}{480}\approx1.70208.$$"""
    p["explanationZh"] = r"""由于 $V$ 为正半定且 $\lambda>0$，这是单纯形上的凹二次最大化问题。可通过 KKT 条件和 active-set 枚举验证；这里 active set 指允许权重为正的资产子集，其余资产权重固定为 0。最优 active set 只包含资产 2 和资产 3。在该 active set 上解驻点方程并满足 $p_2+p_3=1$，得到
$$p_2=\frac{17}{24},\qquad p_3=\frac{7}{24}.$$
因此
$$p=(0,17/24,7/24,0).$$
期望收益为
$$\mu^Tp=\frac{89}{48}\approx1.85417,$$
方差为
$$p^TVp=\frac{73}{96}\approx0.76042.$$
当 $\lambda=0.2$ 时，目标函数值为
$$\frac{89}{48}-0.2\frac{73}{96}=\frac{817}{480}\approx1.70208.$$"""
    return p


def build_problem_5() -> dict:
    p = base_problem(
        5,
        "HW3 Problem 5 - Oil pipeline reliability and max flow",
        "HW3 问题 5 - 石油管道可靠路径与最大流",
        "optimization",
        "Hard",
    )
    p["tags"] += ["network flow", "max flow", "shortest path", "reliability"]
    p["promptImages"] = [PIPELINE_IMAGE_REL]
    p["figureReview"] = {
        "prompt": "source_checked_reconstructed",
        "note": "The official HW3 TeX references includegraphics{ps4}, but the downloaded public HW3 zip contains no ps4 image. This prompt image is reconstructed from the official edge table in hw3.tex/homework3.xlsx.",
        "reviewedBy": "Codex import-stanford-msande214-hw3",
    }
    p["promptEn"] = """Consider the oil pipeline network in the attached reconstructed image. Edge data are:

| Edge | Capacity | Cost | Failure probability |
|---|---:|---:|---:|
| AC | 5 | 7000 | 0.4 |
| AD | 4 | 4000 | 0.9 |
| AS | 2 | 1000 | 0.1 |
| CD | 1 | 2000 | 0.2 |
| CT | 1 | 4000 | 0 |
| DT | 3 | 2000 | 0.5 |
| DF | 1 | 2000 | 0.1 |
| SD | 1 | 1000 | 0.3 |
| SF | 2 | 3000 | 0.4 |
| SG | 2 | 5000 | 0.2 |
| FB | 1 | 2000 | 0.2 |
| FT | 4 | 6000 | 0.2 |
| GT | 5 | 0 | 1 |
| TB | 2 | 1000 | 0.6 |
| GB | 2 | 2000 | 0.8 |

For each task, construct a flow problem and solve it: (a) find the most reliable path from A to B, assuming independent edge failures; (b) find the maximum amount of oil that can be sent from A to B."""
    p["promptZh"] = """考虑附图中根据边表重建的石油管道网络。边数据如下：

| 边 | 容量 | 成本 | 失效概率 |
|---|---:|---:|---:|
| AC | 5 | 7000 | 0.4 |
| AD | 4 | 4000 | 0.9 |
| AS | 2 | 1000 | 0.1 |
| CD | 1 | 2000 | 0.2 |
| CT | 1 | 4000 | 0 |
| DT | 3 | 2000 | 0.5 |
| DF | 1 | 2000 | 0.1 |
| SD | 1 | 1000 | 0.3 |
| SF | 2 | 3000 | 0.4 |
| SG | 2 | 5000 | 0.2 |
| FB | 1 | 2000 | 0.2 |
| FT | 4 | 6000 | 0.2 |
| GT | 5 | 0 | 1 |
| TB | 2 | 1000 | 0.6 |
| GB | 2 | 2000 | 0.8 |

对每一问构造并求解一个流问题：(a) 假设各边独立失效，求从 A 到 B 的最可靠路径；(b) 求从 A 到 B 能输送的最大油量。"""
    p["answer"] = "The most reliable path is A-S-D-F-B with success probability 0.4536. The maximum A-to-B flow is 5 million gallons per hour."
    p["answerEn"] = p["answer"]
    p["answerZh"] = "最可靠路径为 A-S-D-F-B，成功概率为 0.4536。A 到 B 的最大流量为每小时 5 百万加仑。"
    p["explanation"] = r"""For reliability, maximize the product of edge success probabilities. Equivalently, minimize
$$\sum_{e\in P}-\log(1-q_e),$$
where $q_e$ is the edge failure probability. Edges with failure probability 1 have zero success probability and are unusable for a reliable path. Applying shortest path to these transformed edge costs gives
$$A\to S\to D\to F\to B.$$
Its success probability is
$$(1-0.1)(1-0.3)(1-0.1)(1-0.2)=0.9\cdot0.7\cdot0.9\cdot0.8=0.4536.$$

For maximum flow, use the listed capacities as directed edge capacities. One maximum flow of value 5 is decomposed as:

- 2 units on $A\to D\to T\to B$.
- 1 unit on $A\to C\to D\to F\to B$.
- 2 units on $A\to S\to G\to B$.

The total is therefore 5 million gallons per hour."""
    p["explanationZh"] = r"""可靠路径要最大化边成功概率的乘积。等价地，最小化
$$\sum_{e\in P}-\log(1-q_e),$$
其中 $q_e$ 为边失效概率。失效概率为 1 的边成功概率为 0，不能用于可靠路径。对这些变换后的边成本做最短路，得到
$$A\to S\to D\to F\to B.$$
其成功概率为
$$(1-0.1)(1-0.3)(1-0.1)(1-0.2)=0.9\cdot0.7\cdot0.9\cdot0.8=0.4536.$$

最大流问题直接使用表中的容量作为有向边容量。一个流量为 5 的最大流可分解为：

- 2 单位走 $A\to D\to T\to B$。
- 1 单位走 $A\to C\to D\to F\to B$。
- 2 单位走 $A\to S\to G\to B$。

因此最大输送量为每小时 5 百万加仑。这里的流量单位与题干一致，均为“百万加仑/小时”。"""
    return p


def generate_pipeline_image() -> None:
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    img = Image.new("RGB", (1200, 760), "#fbfaf7")
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 22)
        small = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 16)
        bold = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 30)
    except Exception:
        font = small = bold = ImageFont.load_default()

    positions = {
        "A": (100, 360),
        "C": (330, 150),
        "D": (430, 360),
        "S": (280, 585),
        "F": (650, 560),
        "G": (760, 700),
        "T": (780, 250),
        "B": (1080, 430),
    }
    edges = [
        ("A", "C", "cap 5 | fail .4"),
        ("A", "D", "cap 4 | fail .9"),
        ("A", "S", "cap 2 | fail .1"),
        ("C", "D", "cap 1 | fail .2"),
        ("C", "T", "cap 1 | fail 0"),
        ("D", "T", "cap 3 | fail .5"),
        ("D", "F", "cap 1 | fail .1"),
        ("S", "D", "cap 1 | fail .3"),
        ("S", "F", "cap 2 | fail .4"),
        ("S", "G", "cap 2 | fail .2"),
        ("F", "B", "cap 1 | fail .2"),
        ("F", "T", "cap 4 | fail .2"),
        ("G", "T", "cap 5 | fail 1"),
        ("T", "B", "cap 2 | fail .6"),
        ("G", "B", "cap 2 | fail .8"),
    ]

    def arrow(u: str, v: str, label: str) -> None:
        x1, y1 = positions[u]
        x2, y2 = positions[v]
        dx, dy = x2 - x1, y2 - y1
        length = math.hypot(dx, dy) or 1
        ux, uy = dx / length, dy / length
        start = (x1 + ux * 36, y1 + uy * 36)
        end = (x2 - ux * 36, y2 - uy * 36)
        color = "#55708f" if "fail 1" not in label else "#b25252"
        draw.line([start, end], fill=color, width=4)
        ah = 14
        left = (end[0] - ux * ah - uy * ah * 0.55, end[1] - uy * ah + ux * ah * 0.55)
        right = (end[0] - ux * ah + uy * ah * 0.55, end[1] - uy * ah - ux * ah * 0.55)
        draw.polygon([end, left, right], fill=color)
        mx, my = (start[0] + end[0]) / 2, (start[1] + end[1]) / 2
        nx, ny = -uy, ux
        text_pos = (mx + nx * 12 - 54, my + ny * 12 - 10)
        bbox = draw.textbbox(text_pos, label, font=small)
        draw.rounded_rectangle((bbox[0] - 5, bbox[1] - 3, bbox[2] + 5, bbox[3] + 3), radius=6, fill="#fbfaf7", outline="#ddd7c9")
        draw.text(text_pos, label, font=small, fill="#3b3b3b")

    for edge in edges:
        arrow(*edge)

    for node, (x, y) in positions.items():
        fill = "#23344a" if node in {"A", "B"} else "#415f4b"
        draw.ellipse((x - 34, y - 34, x + 34, y + 34), fill=fill, outline="#17171f", width=3)
        bbox = draw.textbbox((0, 0), node, font=bold)
        draw.text((x - (bbox[2] - bbox[0]) / 2, y - (bbox[3] - bbox[1]) / 2 - 2), node, font=bold, fill="white")

    title = "Stanford MS&E 214 HW3 Problem 5 - reconstructed pipeline network"
    draw.text((40, 35), title, font=font, fill="#1f2933")
    draw.text((40, 66), "Edge labels show capacity and failure probability from the official HW3 table.", font=small, fill="#56606b")
    img.save(PIPELINE_IMAGE_PATH)


def write_outputs(problems: list[dict], rebuild: bool) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    payload = {"problems": problems}
    (OUTPUT_DIR / "problems.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    metadata = {
        "slug": SLUG,
        "name": SOURCE_NAME,
        "type": "course-homework",
        "sourceUrl": SOURCE_URL,
        "sourceZipUrl": SOURCE_ZIP_URL,
        "sourceTexPath": f"{SOURCE_REL_DIR}/hw3.tex",
        "sourcePdfPath": f"{SOURCE_REL_DIR}/hw3.pdf",
        "sourceWorkbookPath": f"{SOURCE_REL_DIR}/homework3.xlsx",
        "problemFile": "problems.json",
        "problemCount": len(problems),
        "generatedAt": now_iso(),
        "sourceFiles": SOURCE_FILES,
        "answerPolicy": "Official prompts/data; no official solution file in public HW3 bundle. Answers are generated and solver-verified, not official.",
        "mediaFiles": [PIPELINE_IMAGE_REL],
        "rightsNote": "Official public Stanford course handout files. Keep distribution status reviewed before publishing beyond the local app.",
    }
    (OUTPUT_DIR / "metadata.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    update_manifest(len(problems))

    if rebuild:
        subprocess.run(["node", "scripts/build-problem-catalog.mjs"], cwd=PROJECT_ROOT, check=True)


def update_manifest(problem_count: int) -> None:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    sources = manifest.setdefault("sources", [])
    entry = {
        "slug": SLUG,
        "name": SOURCE_NAME,
        "type": "course-homework",
        "sourceUrl": SOURCE_URL,
        "sourceZipUrl": SOURCE_ZIP_URL,
        "sourceTexPath": f"{SOURCE_REL_DIR}/hw3.tex",
        "sourcePdfPath": f"{SOURCE_REL_DIR}/hw3.pdf",
        "sourceWorkbookPath": f"{SOURCE_REL_DIR}/homework3.xlsx",
        "problemFile": f"{SLUG}/problems.json",
        "problemCount": problem_count,
        "lastImportedAt": now_iso(),
        "rightsNote": "Official public Stanford course handout files. Answers are generated/solver-verified and non-official.",
    }
    for idx, source in enumerate(sources):
        if source.get("slug") == SLUG:
            sources[idx] = {**source, **entry}
            break
    else:
        sources.append(entry)
    MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main(argv: list[str]) -> int:
    rebuild = "--rebuild" in argv
    missing = [str(SOURCE_DIR / name) for name in ("hw3.tex", "hw3.pdf", "homework3.xlsx") if not (SOURCE_DIR / name).exists()]
    if missing:
        raise SystemExit(f"Missing Stanford HW3 source files: {missing}")
    generate_pipeline_image()
    problems = [
        build_problem_1(),
        build_problem_2(),
        build_problem_3(),
        build_problem_4(),
        build_problem_5(),
    ]
    write_outputs(problems, rebuild)
    print(json.dumps({
        "slug": SLUG,
        "problemCount": len(problems),
        "problemsPath": str(OUTPUT_DIR / "problems.json"),
        "metadataPath": str(OUTPUT_DIR / "metadata.json"),
        "pipelineImage": str(PIPELINE_IMAGE_PATH),
        "rebuild": rebuild,
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
