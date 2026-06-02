#!/usr/bin/env python3
"""Import a curated set of Boyd/Vandenberghe public additional exercises.

The official cvxbook page links to a public GitHub repository of additional
exercises. The repository README says the public repo has no solutions and that
instructors can request solutions by email. This importer therefore uses only
selected public exercise prompts and writes generated, locally reviewed,
non-official bilingual answers.
"""

from __future__ import annotations

import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SLUG = "boyd-cvxbook-additional-exercises"
SOURCE_NAME = "Boyd Convex Optimization Additional Exercises"
SOURCE_URL = "https://web.stanford.edu/~boyd/cvxbook/"
REPO_URL = "https://github.com/cvxgrp/cvxbook_additional_exercises"
REPO_DIR = PROJECT_ROOT / "artifacts" / "source-research-report" / "downloads" / "boyd-convex-optimization" / "cvxbook_additional_exercises"
SOURCE_PDF = REPO_DIR / "additional_exercises.pdf"
OUTPUT_DIR = PROJECT_ROOT / "data" / "question-banks" / SLUG
MANIFEST_PATH = PROJECT_ROOT / "data" / "question-banks" / "catalog-manifest.json"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


GENERATED_AT = now_iso()


def rel(path: Path) -> str:
    return str(path.relative_to(PROJECT_ROOT))


def repo_commit() -> str:
    if not (REPO_DIR / ".git").exists():
        return ""
    result = subprocess.run(["git", "-C", str(REPO_DIR), "rev-parse", "HEAD"], capture_output=True, text=True)
    return result.stdout.strip() if result.returncode == 0 else ""


def base_problem(index: int, exercise: str, title_en: str, title_zh: str, difficulty: str, tags: list[str]) -> dict:
    local_files = [rel(SOURCE_PDF)] if SOURCE_PDF.exists() else []
    return {
        "id": f"{SLUG}-problem-{index:03d}",
        "titleEn": title_en,
        "titleZh": title_zh,
        "category": "optimization",
        "difficulty": difficulty,
        "tags": [
            "Boyd Vandenberghe",
            "Convex Optimization",
            "additional exercises",
            *tags,
        ],
        "classificationReviewed": True,
        "classificationReview": {
            "category": "optimization",
            "difficulty": difficulty,
            "logic": "Curated from the public Boyd/Vandenberghe additional exercises and reviewed for convex optimization topic fit.",
            "reviewedBy": "Codex import-boyd-cvxbook-additional-exercises",
        },
        "source": SLUG,
        "sourceUrl": REPO_URL,
        "sourceType": "open-access-exercise-with-generated-answer",
        "bookSlug": SLUG,
        "bookName": SOURCE_NAME,
        "visibility": "public",
        "sourceFiles": [REPO_URL, SOURCE_URL, *local_files],
        "sourceQuestion": f"Additional Exercises {exercise}",
        "answerOfficial": False,
        "answerPolicy": "The public additional-exercises repository provides exercises and data but no public solutions. This answer is generated and locally reviewed, not an official Boyd/Vandenberghe solution.",
        "answerSource": {
            "type": "generated-reviewed",
            "official": False,
            "verificationScript": "scripts/import-boyd-cvxbook-additional-exercises.py",
            "sourceFiles": [REPO_URL, SOURCE_URL, *local_files],
        },
        "rightsReview": {
            "status": "public-additional-exercises",
            "note": "The additional-exercises PDF states the exercises may be used with source acknowledgement; public repository has no solutions, so generated answers are marked non-official.",
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
            base_problem(1, "1.1", "Convex optimization true-or-false basics", "凸优化基础判断题", "Easy", ["true false", "convex optimization"]),
            r"""
Decide whether each statement is true or false.

(a) Least squares is a special case of convex optimization.
(b) In broad terms, convex optimization problems can often be solved efficiently.
(c) Almost any practical problem one wants to solve is convex.
(d) Convex optimization problems are attractive because they always have a unique solution.
""",
            r"""
判断下列说法真假。

(a) 最小二乘是凸优化的特例。
(b) 大体而言，凸优化问题通常可以高效求解。
(c) 几乎所有实际想解的问题都是凸的。
(d) 凸优化吸引人的原因是它们总有唯一解。
""",
            "The answers are: (a) true, (b) true, (c) false, (d) false.",
            "答案为：(a) 真，(b) 真，(c) 假，(d) 假。",
            r"""
Least squares minimizes a convex quadratic objective, so it is convex. Convex problems have strong algorithmic and modeling structure, so many important classes can be solved efficiently. But most arbitrary practical problems are not convex without modeling work or relaxation. Finally, convexity does not imply uniqueness: a flat objective over a convex feasible region can have many optima.
""",
            r"""
最小二乘最小化凸二次目标，因此是凸优化。凸问题有强算法结构和建模结构，许多重要类别可高效求解。但任意实际问题并不天然都是凸的，往往需要建模、近似或松弛。最后，凸性不意味着唯一解：若目标函数在某个凸可行区域上是平的，就可能有多个最优解。
""",
        ),
        add(
            base_problem(2, "1.2", "Dominated designs in device sizing", "器件尺寸设计中的支配关系", "Easy", ["Pareto dominance", "feasibility"]),
            r"""
A device-sizing problem minimizes power subject to area at most 50 plus other constraints. Four feasible-for-other-constraints designs have:

| Design | Power | Area |
|---|---:|---:|
| A | 10 | 50 |
| B | 8 | 55 |
| C | 10 | 45 |
| D | 11 | 50 |

Decide whether: (a) B is better than A; (b) C is better than A; (c) D cannot be optimal.
""",
            r"""
某器件尺寸设计问题要在面积不超过 50 以及其他约束下最小化功耗。四个满足其他约束的候选设计如下：

| 设计 | 功耗 | 面积 |
|---|---:|---:|
| A | 10 | 50 |
| B | 8 | 55 |
| C | 10 | 45 |
| D | 11 | 50 |

判断：(a) B 是否优于 A；(b) C 是否优于 A；(c) D 是否不可能最优。
""",
            "The answers are: (a) false, (b) true, (c) true.",
            "答案为：(a) 假，(b) 真，(c) 真。",
            r"""
B has lower power but violates the area constraint, so it is not a feasible improvement over A. C has the same power as A and smaller area, so it weakly dominates A and is better on the constrained resource. D has the same area as A but strictly larger power, so A dominates D; D cannot be optimal in a power-minimization problem.
""",
            r"""
B 的功耗更低，但面积为 55，违反面积约束，因此不能说它优于可行的 A。C 与 A 功耗相同但面积更小，因此弱支配 A，并在受限资源上更好。D 与 A 面积相同但功耗更高，被 A 严格支配，所以在最小化功耗的问题中不可能最优。
""",
        ),
        add(
            base_problem(3, "2.1", "Image of an affine equality set", "仿射等式集合的仿射像", "Medium", ["affine set", "linear map"]),
            r"""
Show that the set
$$\{Ax+b\mid Fx=g\}$$
is affine, where $A\in\mathbb R^{m\times n}$, $b\in\mathbb R^m$, $F\in\mathbb R^{p\times n}$, and $g\in\mathbb R^p$.
""",
            r"""
证明集合
$$\{Ax+b\mid Fx=g\}$$
是仿射集，其中 $A\in\mathbb R^{m\times n}$、$b\in\mathbb R^m$、$F\in\mathbb R^{p\times n}$、$g\in\mathbb R^p$。
""",
            "It is affine because affine combinations of any two represented points remain represented by a point satisfying the same linear equality.",
            "它是仿射集，因为任意两个可表示点的仿射组合仍可由满足同一线性等式的点表示。",
            r"""
Take two points $y_1=Ax_1+b$ and $y_2=Ax_2+b$ with $Fx_1=g$ and $Fx_2=g$. For any $\theta\in\mathbb R$,
$$\theta y_1+(1-\theta)y_2=A(\theta x_1+(1-\theta)x_2)+b.$$
Let $x_\theta=\theta x_1+(1-\theta)x_2$. Then
$$Fx_\theta=\theta Fx_1+(1-\theta)Fx_2=\theta g+(1-\theta)g=g.$$
So every affine combination stays in the set. This is exactly the affine-set closure property.
""",
            r"""
取两个点 $y_1=Ax_1+b$、$y_2=Ax_2+b$，其中 $Fx_1=g$、$Fx_2=g$。对任意 $\theta\in\mathbb R$，
$$\theta y_1+(1-\theta)y_2=A(\theta x_1+(1-\theta)x_2)+b.$$
令 $x_\theta=\theta x_1+(1-\theta)x_2$，则
$$Fx_\theta=\theta Fx_1+(1-\theta)Fx_2=\theta g+(1-\theta)g=g.$$
所以任意仿射组合仍在集合内，这正是仿射集的闭包性质。
""",
        ),
        add(
            base_problem(4, "2.6", "Convexity of correlation-matrix families", "相关矩阵族的凸性", "Medium", ["PSD cone", "correlation matrix", "linear constraints"]),
            r"""
Determine whether each subset of $\mathbb S^n$ is convex:

(a) correlation matrices $C_n=\{C\succeq0\mid C_{ii}=1,\ i=1,\ldots,n\}$;
(b) nonnegative correlation matrices $\{C\in C_n\mid C_{ij}\ge0\}$;
(c) highly correlated correlation matrices $\{C\in C_n\mid C_{ij}\ge0.8\}$.
""",
            r"""
判断下列 $\mathbb S^n$ 子集是否凸：

(a) 相关矩阵 $C_n=\{C\succeq0\mid C_{ii}=1,\ i=1,\ldots,n\}$；
(b) 非负相关矩阵 $\{C\in C_n\mid C_{ij}\ge0\}$；
(c) 高相关矩阵 $\{C\in C_n\mid C_{ij}\ge0.8\}$。
""",
            "All three sets are convex.",
            "三个集合都是凸集。",
            r"""
The PSD cone is convex. The constraints $C_{ii}=1$ are affine equalities, and inequalities such as $C_{ij}\ge0$ or $C_{ij}\ge0.8$ are linear halfspace constraints. Intersections of convex sets, affine sets, and halfspaces are convex. Therefore (a), (b), and (c) are all convex.
""",
            r"""
PSD 锥是凸的。约束 $C_{ii}=1$ 是仿射等式；$C_{ij}\ge0$ 或 $C_{ij}\ge0.8$ 是线性半空间约束。凸集、仿射集和半空间的交仍是凸集。因此 (a)、(b)、(c) 都是凸的。
""",
        ),
        add(
            base_problem(5, "2.8", "Convexity of ratio and product sets in the positive quadrant", "正象限中比值与乘积集合的凸性", "Medium", ["convex set", "positive quadrant", "epigraph"]),
            r"""
Determine whether each set is convex:

(a) $\{(x,y)\in\mathbb R^2_{++}\mid x/y\le1\}$;
(b) $\{(x,y)\in\mathbb R^2_{++}\mid x/y\ge1\}$;
(c) $\{(x,y)\in\mathbb R^2_+\mid xy\le1\}$;
(d) $\{(x,y)\in\mathbb R^2_+\mid xy\ge1\}$.
""",
            r"""
判断下列集合是否凸：

(a) $\{(x,y)\in\mathbb R^2_{++}\mid x/y\le1\}$；
(b) $\{(x,y)\in\mathbb R^2_{++}\mid x/y\ge1\}$；
(c) $\{(x,y)\in\mathbb R^2_+\mid xy\le1\}$；
(d) $\{(x,y)\in\mathbb R^2_+\mid xy\ge1\}$。
""",
            "The answers are: (a) convex, (b) convex, (c) not convex, (d) convex.",
            "答案为：(a) 凸，(b) 凸，(c) 非凸，(d) 凸。",
            r"""
For positive $y$, $x/y\le1$ is the halfspace $x\le y$, and $x/y\ge1$ is the halfspace $x\ge y$, each intersected with the convex positive quadrant. Hence (a) and (b) are convex.

For (c), $(2,0.4)$ and $(0.4,2)$ both satisfy $xy\le1$, but their midpoint $(1.2,1.2)$ has product $1.44>1$, so the set is not convex.

For (d), $xy\ge1$ in the nonnegative quadrant implies $x>0$ and $y\ge1/x$. Since $1/x$ is convex on $x>0$, this is the epigraph of a convex function, hence convex.
""",
            r"""
当 $y>0$ 时，$x/y\le1$ 等价于半空间 $x\le y$，$x/y\ge1$ 等价于半空间 $x\ge y$，再与凸的正象限相交。因此 (a)、(b) 凸。

对 (c)，点 $(2,0.4)$ 与 $(0.4,2)$ 都满足 $xy\le1$，但中点 $(1.2,1.2)$ 的乘积为 $1.44>1$，所以集合非凸。

对 (d)，在非负象限中 $xy\ge1$ 意味着 $x>0$ 且 $y\ge1/x$。函数 $1/x$ 在 $x>0$ 上是凸函数，因此该集合是凸函数上图，故为凸集。
""",
        ),
        add(
            base_problem(6, "2.9", "Union and difference of a square and a disk", "正方形与圆盘的并集和差集", "Medium", ["convex set", "set operations"]),
            r"""
Let $S=\{x\in\mathbb R^2\mid 0\le x_i\le1,\ i=1,2\}$ be the unit square in the first quadrant, and let $D=\{x\in\mathbb R^2\mid \|x\|_2\le1\}$ be the unit disk centered at the origin. Decide whether each set is convex: (a) $S\cap D$; (b) $S\cup D$; (c) $S\setminus D$.
""",
            r"""
令 $S=\{x\in\mathbb R^2\mid 0\le x_i\le1,\ i=1,2\}$ 为第一象限单位正方形，$D=\{x\in\mathbb R^2\mid \|x\|_2\le1\}$ 为原点单位圆盘。判断：(a) $S\cap D$；(b) $S\cup D$；(c) $S\setminus D$ 是否凸。
""",
            "The answers are: (a) convex, (b) convex, (c) not convex.",
            "答案为：(a) 凸，(b) 凸，(c) 非凸。",
            r"""
The intersection of two convex sets is convex, so $S\cap D$ is convex.

The union is also convex in this special geometry. If a convex combination of a point in $D$ and a point in $S$ has both coordinates nonnegative, then both coordinates are at most 1 and the point lies in $S$. If one coordinate is negative, the point remains inside the unit disk along the rounded boundary portion. Equivalently, $S\cup D$ is the unit disk plus the square corner bounded by the tangent points $(1,0)$ and $(0,1)$, which is convex.

The difference $S\setminus D$ is not convex: $(1,0.1)$ and $(0.1,1)$ lie outside the disk but in $S$, while their midpoint $(0.55,0.55)$ lies inside the disk and is removed.
""",
            r"""
两个凸集的交仍是凸集，因此 $S\cap D$ 凸。

该并集在这个特殊几何中也是凸的。若 $D$ 中一点与 $S$ 中一点的凸组合两个坐标都非负，则两个坐标都不超过 1，因此该点在 $S$ 中；若某个坐标为负，则该点仍位于单位圆盘的圆弧侧。等价地看，$S\cup D$ 是单位圆盘加上由切点 $(1,0)$、$(0,1)$ 围出的正方形角区域，整体为凸。

$S\setminus D$ 非凸：$(1,0.1)$ 与 $(0.1,1)$ 都在 $S$ 中且在圆盘外，但中点 $(0.55,0.55)$ 位于圆盘内，被差集删除。
""",
        ),
        add(
            base_problem(7, "2.10", "Polynomial coefficient set with uniform bounds", "带一致界的多项式系数集合", "Medium", ["linear inequalities", "polynomial", "convex set"]),
            r"""
For $p(t)=a_1+a_2t+\cdots+a_kt^{k-1}$, decide whether the coefficient set
$$\{a\in\mathbb R^k\mid p(0)=1,\ |p(t)|\le1\text{ for all }\alpha\le t\le\beta\}$$
is convex.
""",
            r"""
对 $p(t)=a_1+a_2t+\cdots+a_kt^{k-1}$，判断系数集合
$$\{a\in\mathbb R^k\mid p(0)=1,\ |p(t)|\le1\text{ 对所有 }\alpha\le t\le\beta\}$$
是否凸。
""",
            "The set is convex.",
            "该集合是凸集。",
            r"""
For each fixed $t$, $p(t)$ is affine in the coefficient vector $a$. The constraint $p(0)=1$ is affine. The bound $|p(t)|\le1$ is equivalent to two affine inequalities,
$$p(t)\le1,\qquad -p(t)\le1,$$
for every $t\in[\alpha,\beta]$. An arbitrary intersection of affine halfspaces and an affine equality set is convex.
""",
            r"""
对每个固定的 $t$，$p(t)$ 都是系数向量 $a$ 的仿射函数。约束 $p(0)=1$ 是仿射等式。界约束 $|p(t)|\le1$ 等价于对每个 $t\in[\alpha,\beta]$ 都有两个仿射不等式：
$$p(t)\le1,\qquad -p(t)\le1.$$
任意多个仿射半空间与仿射等式集合的交仍为凸集。
""",
        ),
        add(
            base_problem(8, "2.14", "Minimal and minimum elements under componentwise order", "分量偏序下的极小元与最小元", "Easy", ["partial order", "minimal element", "Pareto"]),
            r"""
Let $S=\{(0,2),(1,1),(2,3),(1,2),(4,0)\}$. Minimum and minimal are defined with respect to the nonnegative orthant order: $u\preceq v$ when $u_i\le v_i$ for both coordinates. Decide whether:
(a) $(0,2)$ is the minimum element;
(b) $(0,2)$ is a minimal element;
(c) $(2,3)$ is a minimal element;
(d) $(1,1)$ is a minimal element.
""",
            r"""
令 $S=\{(0,2),(1,1),(2,3),(1,2),(4,0)\}$。最小元和极小元均相对于非负正交锥偏序定义：当两个坐标都满足 $u_i\le v_i$ 时，$u\preceq v$。判断：
(a) $(0,2)$ 是否为最小元；
(b) $(0,2)$ 是否为极小元；
(c) $(2,3)$ 是否为极小元；
(d) $(1,1)$ 是否为极小元。
""",
            "The answers are: (a) false, (b) true, (c) false, (d) true.",
            "答案为：(a) 假，(b) 真，(c) 假，(d) 真。",
            r"""
A minimum element must be componentwise no larger than every other point. $(0,2)$ is not no larger than $(1,1)$ because $2>1$, so it is not a minimum.

A point is minimal if no other distinct point is componentwise no larger. No listed point has first coordinate $\le0$ and second coordinate $\le2$, so $(0,2)$ is minimal. But $(0,2)\preceq(2,3)$ and the points differ, so $(2,3)$ is not minimal. Finally, no listed point is componentwise no larger than $(1,1)$, so $(1,1)$ is minimal.
""",
            r"""
最小元必须在两个坐标上都不大于集合中所有其他点。$(0,2)$ 并不小于等于 $(1,1)$，因为第二个坐标 $2>1$，所以它不是最小元。

极小元要求不存在另一个不同点在所有坐标上都不大于它。列表中没有点同时满足第一坐标 $\le0$、第二坐标 $\le2$，所以 $(0,2)$ 是极小元。但 $(0,2)\preceq(2,3)$ 且两点不同，所以 $(2,3)$ 不是极小元。最后，列表中没有点在分量上不大于 $(1,1)$，所以 $(1,1)$ 是极小元。
""",
        ),
        add(
            base_problem(9, "2.15", "Basic polar-set calculations", "极集的基础计算", "Hard", ["polar set", "dual norm", "simplex"]),
            r"""
For a set $C\subseteq\mathbb R^n$, its polar is
$$C^\circ=\{y\mid y^Tx\le1\ \text{for all }x\in C\}.$$
Answer the following: (a) why is $C^\circ$ convex even if $C$ is not? (b) what is the polar of a cone? (c) what is the polar of the unit ball of a norm $\|\cdot\|$? (d) what is the polar of the simplex $\{x\mid \mathbf1^Tx=1,\ x\succeq0\}$?
""",
            r"""
对集合 $C\subseteq\mathbb R^n$，其极集定义为
$$C^\circ=\{y\mid y^Tx\le1\ \text{对所有 }x\in C\}.$$
回答：(a) 为什么即使 $C$ 非凸，$C^\circ$ 仍凸？(b) 锥的极集是什么？(c) 范数 $\|\cdot\|$ 单位球的极集是什么？(d) 单纯形 $\{x\mid \mathbf1^Tx=1,\ x\succeq0\}$ 的极集是什么？
""",
            r"$C^\circ$ is an intersection of halfspaces. A cone polar is the negative dual cone $\{y\mid y^Tx\le0,\ \forall x\in C\}$. A norm unit ball polar is the dual-norm unit ball. The simplex polar is $\{y\mid \max_i y_i\le1\}$.",
            r"$C^\circ$ 是半空间交。锥的极集是负对偶锥 $\{y\mid y^Tx\le0,\ \forall x\in C\}$。范数单位球的极集是对偶范数单位球。单纯形的极集是 $\{y\mid \max_i y_i\le1\}$。",
            r"""
For each fixed $x\in C$, the constraint $y^Tx\le1$ is a halfspace in $y$. Therefore $C^\circ$ is an intersection of halfspaces and is convex.

If $C$ is a cone and $y^Tx\le1$ for all $x\in C$, then for any $t\ge0$, $t x\in C$, so $t y^Tx\le1$ for all $t$. This is possible only when $y^Tx\le0$ for all $x\in C$. Hence $C^\circ=-C^*$ under the convention $C^*=\{y\mid y^Tx\ge0,\ \forall x\in C\}$.

For a norm unit ball $B=\{x\mid\|x\|\le1\}$, the polar is
$$B^\circ=\{y\mid \sup_{\|x\|\le1}y^Tx\le1\}=\{y\mid\|y\|_*\le1\}.$$
For the simplex, maximizing $y^Tx$ over probability vectors puts all mass on the largest component, so the condition is $\max_i y_i\le1$.
""",
            r"""
对每个固定的 $x\in C$，约束 $y^Tx\le1$ 是关于 $y$ 的半空间。因此 $C^\circ$ 是半空间交，必为凸集。

若 $C$ 是锥且对所有 $x\in C$ 有 $y^Tx\le1$，则对任意 $t\ge0$，$tx\in C$，所以 $t y^Tx\le1$ 对所有 $t$ 成立。这只有在 $y^Tx\le0$ 时才可能。因此在 $C^*=\{y\mid y^Tx\ge0,\ \forall x\in C\}$ 的约定下，$C^\circ=-C^*$。

若 $B=\{x\mid\|x\|\le1\}$ 是范数单位球，则
$$B^\circ=\{y\mid \sup_{\|x\|\le1}y^Tx\le1\}=\{y\mid\|y\|_*\le1\}.$$
对单纯形，在线性函数 $y^Tx$ 上最大化会把全部权重放在最大分量上，因此条件为 $\max_i y_i\le1$。
""",
        ),
        add(
            base_problem(10, "2.16", "Dual cones in two dimensions", "二维空间中的对偶锥", "Medium", ["dual cone", "second-order cone", "subspace"]),
            r"""
Describe the dual cone $K^*=\{y\mid y^Tx\ge0\ \text{for all }x\in K\}$ for each cone:
(a) $K=\{0\}$;
(b) $K=\mathbb R^2$;
(c) $K=\{(x_1,x_2)\mid |x_1|\le x_2\}$;
(d) $K=\{(x_1,x_2)\mid x_1+x_2=0\}$.
""",
            r"""
对下列锥，描述对偶锥 $K^*=\{y\mid y^Tx\ge0\ \text{对所有 }x\in K\}$：
(a) $K=\{0\}$；
(b) $K=\mathbb R^2$；
(c) $K=\{(x_1,x_2)\mid |x_1|\le x_2\}$；
(d) $K=\{(x_1,x_2)\mid x_1+x_2=0\}$。
""",
            r"The duals are: (a) $\mathbb R^2$; (b) $\{0\}$; (c) the same cone $\{y\mid |y_1|\le y_2\}$; (d) the orthogonal line $\{t(1,1)\mid t\in\mathbb R\}$.",
            r"对偶锥为：(a) $\mathbb R^2$；(b) $\{0\}$；(c) 同一个锥 $\{y\mid |y_1|\le y_2\}$；(d) 正交直线 $\{t(1,1)\mid t\in\mathbb R\}$。",
            r"""
For $K=\{0\}$, the inequality $y^T0\ge0$ imposes no restriction, so $K^*=\mathbb R^2$. For $K=\mathbb R^2$, requiring $y^Tx\ge0$ for every $x$ and for $-x$ forces $y=0$.

The cone $\{(x_1,x_2)\mid |x_1|\le x_2\}$ is the two-dimensional second-order cone and is self-dual.

For the line $K=\{t(1,-1)\mid t\in\mathbb R\}$, the inequality must hold for both $t$ and $-t$, so $y^T(1,-1)=0$. Thus $y_1-y_2=0$, i.e. $K^*=\{t(1,1)\mid t\in\mathbb R\}$.
""",
            r"""
当 $K=\{0\}$ 时，约束 $y^T0\ge0$ 不限制 $y$，所以 $K^*=\mathbb R^2$。当 $K=\mathbb R^2$ 时，要求对所有 $x$ 和 $-x$ 都有 $y^Tx\ge0$，只能推出 $y=0$。

锥 $\{(x_1,x_2)\mid |x_1|\le x_2\}$ 是二维二阶锥，它自对偶。

对直线 $K=\{t(1,-1)\mid t\in\mathbb R\}$，不等式必须对 $t$ 和 $-t$ 同时成立，因此 $y^T(1,-1)=0$。所以 $y_1-y_2=0$，即 $K^*=\{t(1,1)\mid t\in\mathbb R\}$。
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
    commit = repo_commit()
    (OUTPUT_DIR / "problems.json").write_text(json.dumps({"problems": problem_list}, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    metadata = {
        "slug": SLUG,
        "name": SOURCE_NAME,
        "type": "open-access-exercise-with-generated-answer",
        "sourceUrl": SOURCE_URL,
        "repoUrl": REPO_URL,
        "repoCommit": commit,
        "sourcePdfPath": rel(SOURCE_PDF) if SOURCE_PDF.exists() else "",
        "problemCount": len(problem_list),
        "generatedAt": GENERATED_AT,
        "rightsNote": "Official public additional-exercises repository. The PDF permits use with acknowledgement; public repo has no solutions, so answers are generated/reviewed and non-official.",
    }
    (OUTPUT_DIR / "metadata.json").write_text(json.dumps(metadata, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def write_manifest_entry(problem_count: int) -> None:
    manifest = read_json(MANIFEST_PATH, {"version": 1, "sources": []})
    sources = manifest.setdefault("sources", [])
    entry = {
        "slug": SLUG,
        "name": SOURCE_NAME,
        "type": "open-access-exercise-with-generated-answer",
        "sourceUrl": SOURCE_URL,
        "repoUrl": REPO_URL,
        "repoCommit": repo_commit(),
        "sourcePdfPath": rel(SOURCE_PDF) if SOURCE_PDF.exists() else "",
        "problemFile": f"{SLUG}/problems.json",
        "problemCount": problem_count,
        "lastImportedAt": GENERATED_AT,
        "rightsNote": "Official public additional exercises; generated non-official answers because public repository has no solutions.",
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
    if not SOURCE_PDF.exists():
        print(f"Warning: missing cached source PDF: {SOURCE_PDF}", file=sys.stderr)
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
        "sourcePdfPath": rel(SOURCE_PDF) if SOURCE_PDF.exists() else "",
        "repoCommit": repo_commit(),
    }, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
