#!/usr/bin/env python3
from __future__ import annotations

import re
from pathlib import Path

import fitz


PROJECT_ROOT = Path(__file__).resolve().parents[1]
BOOK_DIR = PROJECT_ROOT / "量化书籍" / "有题目的" / "红宝书 Quant Job Interview Questions And Answers"
PDF_PATH = BOOK_DIR / "红宝书Quant Job Interview Questions And Answers (2008, CreateSpace) - libgen.li.pdf"
TEX_PATHS = [
    BOOK_DIR / "quant_red_book.tex",
    BOOK_DIR / "quant_red_book_zh.tex",
]
OUTPUT_DIR = PROJECT_ROOT / "assets" / "problem-media" / "red-book" / "pdf-extracted"
ASSET_PREFIX = "assets/problem-media/red-book/pdf-extracted"

AUTO_IMAGE_RE = re.compile(
    r"\n\n\\begin\{center\}\n% quantgym-auto-image:red-book-figure-[^\n]+\n"
    r"(?:\\includegraphics[^\n]+\n)+\\end\{center\}",
    re.M,
)

FIGURES = {
    "2.8": {
        "page": 84,
        "clip": (68, 86, 350, 260),
        "filename": "figure-2-8-volatility-smile.png",
        "comment": "red-book-figure-2-8",
    },
    "2.9": {
        "page": 85,
        "clip": (68, 44, 350, 214),
        "filename": "figure-2-9-volatility-skew.png",
        "comment": "red-book-figure-2-9",
    },
    "2.10": {
        "page": 86,
        "clip": (68, 44, 350, 232),
        "filename": "figure-2-10-jump-diffusion-smile.png",
        "comment": "red-book-figure-2-10",
    },
    "2.11": {
        "page": 87,
        "clip": (68, 44, 350, 250),
        "filename": "figure-2-11-heston-smile.png",
        "comment": "red-book-figure-2-11",
    },
    "2.12": {
        "page": 88,
        "clip": (68, 44, 350, 232),
        "filename": "figure-2-12-variance-gamma-smile.png",
        "comment": "red-book-figure-2-12",
    },
    "2.1": {
        "page": 46,
        "clip": (64, 42, 352, 292),
        "filename": "figure-2-1-vanilla-call.png",
        "comment": "red-book-figure-2-1",
    },
    "2.2": {
        "page": 49,
        "clip": (64, 40, 352, 292),
        "filename": "figure-2-2-barrier-call.png",
        "comment": "red-book-figure-2-2",
    },
    "2.3": {
        "page": 57,
        "clip": (64, 40, 352, 292),
        "filename": "figure-2-3-digital-call.png",
        "comment": "red-book-figure-2-3",
    },
    "6.1": {
        "page": 231,
        "clip": (88, 286, 340, 546),
        "filename": "figure-6-1-contour.png",
        "comment": "red-book-figure-6-1",
    },
}


def main() -> None:
    if not PDF_PATH.exists():
        raise FileNotFoundError(PDF_PATH)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    image_paths = extract_figures()
    for tex_path in TEX_PATHS:
        repair_and_insert(tex_path, image_paths)
    print(f"extracted figures={len(image_paths)}, output={OUTPUT_DIR}")


def extract_figures() -> dict[str, str]:
    doc = fitz.open(PDF_PATH)
    image_paths: dict[str, str] = {}
    for figure, item in FIGURES.items():
        page = doc[int(item["page"]) - 1]
        rect = fitz.Rect(*item["clip"])
        output_path = OUTPUT_DIR / str(item["filename"])
        pix = page.get_pixmap(matrix=fitz.Matrix(4, 4), clip=rect, alpha=False)
        pix.save(output_path)
        image_paths[figure] = f"{ASSET_PREFIX}/{item['filename']}"
    return image_paths


def image_block(figure: str, image_paths: dict[str, str]) -> str:
    item = FIGURES[figure]
    return (
        "\n\n\\begin{center}\n"
        f"% quantgym-auto-image:{item['comment']}\n"
        f"\\includegraphics[width=0.82\\linewidth]{{{image_paths[figure]}}}\n"
        "\\end{center}"
    )


def repair_and_insert(tex_path: Path, image_paths: dict[str, str]) -> None:
    text = tex_path.read_text(encoding="utf8")
    text = AUTO_IMAGE_RE.sub("", text)
    if tex_path.name.endswith("_zh.tex"):
        text = repair_chinese(text, image_paths)
    else:
        text = repair_english(text, image_paths)
    tex_path.write_text(text, encoding="utf8")


def repair_english(text: str, image_paths: dict[str, str]) -> str:
    fig21 = image_block("2.1", image_paths)
    fig22 = image_block("2.2", image_paths)
    fig23 = image_block("2.3", image_paths)
    fig61 = image_block("6.1", image_paths)

    text = sub_literal(
        r"Figure 2\.1 shows the value of vanilla call options.*?Sketch the value of a vanilla call/put option as a function of volatility\.",
        (
            "Figure 2.1 shows the value of vanilla call options with 1 year, 6 months and 1 day to expiry. "
            "It is unlikely you will sketch these graphs perfectly in an interview, however there are a few important features that should be preserved:"
            f"{fig21}\n\n"
            "\\begin{itemize}\n"
            "\\item The vanilla call option value is monotone increasing in spot.\n"
            "\\item The value is a convex function of spot, that is the price lies above all of the possible tangent lines.\n"
            "\\item A vanilla call option on a non-dividend paying stock with longer time to expiry than an equivalent option is always worth at least as much.\n"
            "\\end{itemize}\n\n"
            "As the last bullet point suggests, the option value decreases as time to expiry decreases and the value approaches its payoff. "
            "Here are some possible related questions: sketch the value of a vanilla put option as a function of spot; sketch the value of a digital call/put option as a function of spot; sketch the value of a vanilla call/put option as a function of volatility."
        ),
        text,
        re.S,
    )

    text = sub_literal(
        r"After recognising the first option as a down-and-\s*out call.*?\n\na \. j i",
        (
            "After recognising the first option as a down-and-out call, the value should look something similar to the increasing line in Figure 2.2, "
            "which is a sketch of a 1 year call with barrier at 95. The key features are zero value for spot below the barrier, increasing value with spot, "
            "and similarity to a vanilla call option when far from the barrier."
            f"{fig22}\n\n"
            "The second option in Figure 2.2 is a down-and-in call with the same parameters. The two option values when added together should look the same as a vanilla call option: out + in = vanilla."
        ),
        text,
        re.S,
    )

    text = sub_literal(
        r"For a sketch of a vanilla call see Figure 2\.1.*?(?=\n\n\\subsection\{Question 2\.25\})",
        (
            "For a sketch of a vanilla call see Figure 2.1 and for a digital call see Figure 2.3. When relating the two graphs the key features are:"
            f"{fig21}{fig23}\n\n"
            "\\begin{itemize}\n"
            "\\item As spot increases, the slope of the call option price increases until it approaches a constant slope of 1.\n"
            "\\item The digital call option price flattens out as the option approaches deep in-the-money, because the digital payoff is capped at 1.\n"
            "\\item A vanilla call option price is convex; a digital call price is not. The digital call looks like a cumulative distribution function.\n"
            "\\end{itemize}\n\n"
            "Here is a related question: plot a digital put on the same graph as a digital call. For what value of spot will the two lines intersect?"
        ),
        text,
        re.S,
    )
    text = ensure_existing_answer_images_english(text, image_paths)

    text = sub_literal(
        r"\n,\n\nue \| \| ciate oral.*?Given the four models above, you have to use one\. What criteria would you use to pick a model\? O\n\n(?=\\subsection\{Question 2\.60\})",
        "\n\n",
        text,
        re.S,
    )
    text = insert_incomplete_market_questions_english(text, image_paths)

    text = text.replace(
        "Evaluate 10.@) l (l+2+2?) (Hint: use contour integration.)",
        "Evaluate $\\int_0^\\infty \\frac{\\log(x)}{1+x+x^2}\\,dx$. (Hint: use contour integration.)",
    )
    text = sub_literal(
        r"Consider the contour C' formed by taking a loop around the branch cut on the negative real axis and a larger circle, as in the Figure 6\.1\. Ficure 6\.1\. Contour formed by taking a loop around the branch cut on the negative real axis\.",
        (
            "Consider the contour C formed by taking a loop around the branch cut on the negative real axis and a larger circle, as in Figure 6.1."
            f"{fig61}"
        ),
        text,
    )
    text = sub_literal(
        r"\n\nCHAPTER 7\s+Coding in C\+\+.*?(?=\n\\section\{Chapter 7\})",
        "\n\n",
        text,
        re.S,
    )
    text = sub_literal(
        r"\n\nCHAPTER 8\s+Logic/Brainteasers.*?(?=\n\\section\{Chapter 8\})",
        "\n\n",
        text,
        re.S,
    )
    return text


def repair_chinese(text: str, image_paths: dict[str, str]) -> str:
    fig21 = image_block("2.1", image_paths)
    fig22 = image_block("2.2", image_paths)
    fig23 = image_block("2.3", image_paths)
    fig61 = image_block("6.1", image_paths)

    text = sub_literal(
        r"图 2\.1 显示了距离到期日为 1 年 6 个月 1 天的普通看涨期权的价值.*?将普通看涨/看跌期权的价值绘制为波动率的函数。",
        (
            "图 2.1 显示了距离到期日为 1 年、6 个月和 1 天的普通看涨期权价值。面试中不必画得完全精确，但应保留几个关键特征："
            f"{fig21}\n\n"
            "\\begin{itemize}\n"
            "\\item 普通看涨期权价值随现货价格单调递增。\n"
            "\\item 价值是现货价格的凸函数，即价格位于所有可能切线之上。\n"
            "\\item 对不支付股息的股票，到期时间更长的同类普通看涨期权价值至少同样高。\n"
            "\\end{itemize}\n\n"
            "最后一点也说明，随着到期时间缩短，期权价值会下降并接近其到期收益。相关问题包括：画出普通看跌期权、数字看涨/看跌期权相对于现货的价值，或画出普通看涨/看跌期权相对于波动率的价值。"
        ),
        text,
        re.S,
    )

    text = sub_literal(
        r"在将第一个期权识别为下跌看涨期权后.*?\n\n一个。我",
        (
            "在将第一个期权识别为 down-and-out call 后，其价值应类似于图 2.2 中的上升曲线；该图展示了障碍为 95 的一年期看涨期权。关键特征是：低于障碍时价值为零，价值随现货增加，并且远离障碍时接近普通看涨期权。"
            f"{fig22}\n\n"
            "图 2.2 中的第二个期权是参数相同的 down-and-in call。两个期权价值相加应与普通看涨期权一致：out + in = vanilla。"
        ),
        text,
        re.S,
    )

    text = sub_literal(
        r"对于普通呼叫的草图，请参见图 2\.1.*?(?=\n\n\\subsection\{问题 2\.25\})",
        (
            "普通看涨期权可参考图 2.1，数字看涨期权可参考图 2.3。比较两张图时，关键特征是："
            f"{fig21}{fig23}\n\n"
            "\\begin{itemize}\n"
            "\\item 随着现货价格上升，普通看涨期权价格的斜率上升，并逐渐接近常数斜率 1。\n"
            "\\item 数字看涨期权价格在深度实值时趋于平坦，因为数字收益被上限 1 截断。\n"
            "\\item 普通看涨期权价格是凸的；数字看涨期权价格不是凸的，它更像累计分布函数。\n"
            "\\end{itemize}\n\n"
            "相关问题：把数字看跌期权和数字看涨期权画在同一张图上，它们在什么现货价格处相交？"
        ),
        text,
        re.S,
    )
    text = ensure_existing_answer_images_chinese(text, image_paths)

    text = sub_literal(
        r"\n,\n\n呃\| \| ciate 口头.*?您会使用什么标准来选择模型？氧\n\n(?=\\subsection\{问题 2\.60\})",
        "\n\n",
        text,
        re.S,
    )
    text = insert_incomplete_market_questions_chinese(text, image_paths)

    text = text.replace(
        "Evaluate 10.@) l (l+2+2?)（提示：使用轮廓积分。）",
        "计算 $\\int_0^\\infty \\frac{\\log(x)}{1+x+x^2}\\,dx$。（提示：使用围道积分。）",
    )
    text = sub_literal(
        r"考虑通过围绕负实轴上的分支切割和一个更大的圆取一个环而形成的轮廓 C'，如图 6\.1 所示。图 6\.1。通过围绕负实轴上的分支切割形成一个环而形成的轮廓。",
        (
            "考虑由围绕负实轴分支割线的一条环路和一个更大圆组成的轮廓 C，如图 6.1 所示。"
            f"{fig61}"
        ),
        text,
    )
    text = sub_literal(
        r"\n\n第 7 章\s*C\+\+ 编码.*?(?=\n\\section\{第7章\})",
        "\n\n",
        text,
        re.S,
    )
    text = sub_literal(
        r"\n\n第 8 章\s*逻辑/脑筋急转弯.*?(?=\n\\section\{第8章\})",
        "\n\n",
        text,
        re.S,
    )
    return text


def ensure_existing_answer_images_english(text: str, image_paths: dict[str, str]) -> str:
    text = text.replace(
        "should be preserved:\n\n\\begin{itemize}",
        f"should be preserved:{image_block('2.1', image_paths)}\n\n\\begin{{itemize}}",
        1,
    )
    text = text.replace(
        "and similarity to a vanilla call option when far from the barrier.\n\nThe second option",
        f"and similarity to a vanilla call option when far from the barrier.{image_block('2.2', image_paths)}\n\nThe second option",
        1,
    )
    text = text.replace(
        "as in Figure 6.1.\n\n",
        f"as in Figure 6.1.{image_block('6.1', image_paths)}\n\n",
        1,
    )
    return text


def ensure_existing_answer_images_chinese(text: str, image_paths: dict[str, str]) -> str:
    text = text.replace(
        "应保留几个关键特征：\n\n\\begin{itemize}",
        f"应保留几个关键特征：{image_block('2.1', image_paths)}\n\n\\begin{{itemize}}",
        1,
    )
    text = text.replace(
        "远离障碍时接近普通看涨期权。\n\n图 2.2 中",
        f"远离障碍时接近普通看涨期权。{image_block('2.2', image_paths)}\n\n图 2.2 中",
        1,
    )
    text = text.replace(
        "如图 6.1 所示。\n\n",
        f"如图 6.1 所示。{image_block('6.1', image_paths)}\n\n",
        1,
    )
    return text


def insert_incomplete_market_questions_english(text: str, image_paths: dict[str, str]) -> str:
    block = incomplete_market_questions_english(image_paths)
    text = sub_literal(
        r"\n+\\subsection\{Question 2\.58\}.*?(?=\n\\subsection\{Question 2\.60\})",
        "\n\n" + block + "\n",
        text,
        re.S,
    )
    if "\\subsection{Question 2.58}" not in text and "\\subsection{Question 2.60}" in text:
        text = text.replace("\\subsection{Question 2.60}", block + "\n\n\\subsection{Question 2.60}", 1)
    return text


def insert_incomplete_market_questions_chinese(text: str, image_paths: dict[str, str]) -> str:
    block = incomplete_market_questions_chinese(image_paths)
    text = sub_literal(
        r"\n+\\subsection\{问题 2\.58\}.*?(?=\n\\subsection\{问题 2\.60\})",
        "\n\n" + block + "\n",
        text,
        re.S,
    )
    if "\\subsection{问题 2.58}" not in text and "\\subsection{问题 2.60}" in text:
        text = text.replace("\\subsection{问题 2.60}", block + "\n\n\\subsection{问题 2.60}", 1)
    return text


def incomplete_market_questions_english(image_paths: dict[str, str]) -> str:
    return (
        r"""\subsection{Question 2.58}

\begin{problembox}
What is implied volatility and a volatility skew/smile?

\end{problembox}

\solution
Implied volatility is simply the volatility implied from the market price of an option, using some model. It is usually calculated by taking the option's price and finding the volatility in the Black-Scholes formula that returns the same price. For example, consider an at-the-money European call option with 1 year to expiry, spot value 100 and a risk-free rate of 5\%. If the market price of this option is \$6.80, then the implied volatility will be 15\%.

If one calculates the implied volatility of options with the same expiry date but different strike prices and plots the volatilities, there is often a smile or skew shape. A volatility smile will look something like Figure 2.8.
"""
        + image_block("2.8", image_paths)
        + r"""

There are many possible explanations for why some markets exhibit volatility smiles. One possible explanation is that the market is more likely to move up or down by a large amount than is assumed within the Black-Scholes model. Hence the smile reflects the market's view of the imperfections in the Black-Scholes model.

A volatility skew is similar to a smile, but it is only downward sloping, compared to the more symmetric smile. A volatility skew could look something like Figure 2.9.
"""
        + image_block("2.9", image_paths)
        + r"""

For a detailed discussion of volatility smiles and skews see Chapter 18 of [6].

Here are some possible related questions:
\begin{itemize}
\item Which shape will the implied volatility take for equity markets, skew or smile? Explain.
\item When did the volatility smile first appear in the equity market and why?
\item If the market was pricing options incorrectly and the smile was not a persistent feature, describe an arbitrage opportunity.
\end{itemize}

\subsection{Question 2.59}

\begin{problembox}
What differing models can be used to price exotic foreign exchange options consistently with market smiles? What are the pros and cons of each?

\end{problembox}

\solution
There are many different option pricing models that capture some of the features of market smiles. The large number of models makes it too difficult to cover them all in detail, so we focus our answer on four popular models: jump diffusion, stochastic volatility, Variance Gamma and local volatility. For details of the first three models we refer the reader to [6]; see Chapter 22 of [20] for local volatility.

Jump diffusion models have the foreign exchange rate moving as geometric Brownian motion with an added random jump component. The jump component is usually a Poisson process. If $S_t$ is the exchange rate, we could have
\[
\frac{dS_t}{S_t}=\mu dt+\sigma dW_t+(J-1)dN_t,
\]
where $J$ is a random jump size (J could be log-normally distributed, for example) and $N_t$ is the Poisson process. Jump diffusion models produce what is known as a floating smile. This means that the smile moves when spot moves, so that the bottom of the smile will remain at-the-money. As floating smiles are a feature of foreign exchange markets this is an advantage of jump diffusion models.
"""
        + image_block("2.10", image_paths)
        + r"""

One disadvantage of a jump-diffusion model is that the smiles produced flatten with maturity quickly; this is not observed in most markets. See Figure 2.10 for an example in which the smile has largely disappeared after 2 years.

Stochastic volatility models take both the foreign exchange rate and volatility process to be stochastic. There are many popular forms for the volatility process; the Heston model, for example, uses
\[
\frac{dS_t}{S_t}=\mu dt+\sqrt{V_t}\,dW_t^{(1)}, \qquad
dV_t=\kappa(\theta-V_t)dt+\sigma_V\sqrt{V_t}\,dW_t^{(2)},
\]
where $\theta$ is the long term average volatility, $\kappa$ is the rate at which the process reverts to its mean, $\sigma_V$ is the volatility of volatility, and $W_t^{(1)}$ and $W_t^{(2)}$ are Brownian motions with correlation $\rho$.
"""
        + image_block("2.11", image_paths)
        + r"""

Stochastic volatility models also produce a floating smile and their smile shape can be easily changed by tweaking the parameters. For example, skew can be introduced by having $\rho$ non-zero, the flattening out of the smile can be adjusted by the mean reversion parameter $\kappa$, etc. Figure 2.11 shows an example smile from the Heston model.

Having the flexibility of changing the smile shape has its disadvantages in that all these parameters need to be fitted in a stable and consistent way with the market, which is not a straightforward task.

Variance Gamma models take the foreign exchange rate and time as a random process. The idea is that foreign exchange rates move when market information arrives and this information arrival is itself a random process. For example, if a large amount of information is arriving then we can expect high volatility, however on a day with minimal information arrival we can expect low volatility. To define a Variance Gamma model we let $b(t;\theta,\sigma)$ be a Brownian motion, i.e.
\[
db_t=\theta dt+\sigma dW_t,
\]
and we let
\[
X(t;\sigma,\nu,\theta)=b(T_t;\theta,\sigma),
\]
where $T_t$ is the time $t$ value of a Gamma process with variance rate $\nu$.
"""
        + image_block("2.12", image_paths)
        + r"""

Variance Gamma smiles are similar to jump diffusion smiles, compare Figure 2.10 and Figure 2.12. The smiles tend to flatten out over time as the model becomes more similar to a pure diffusive model.

Local volatility models derive the volatility surface from quoted market prices and then use this surface to price more exotic instruments. It turns out that under risk-neutrality there is a unique diffusion process consistent with market prices. The unique volatility function $\sigma(S_t,t)$ is known as the local volatility function.

Once this local volatility surface has been found, exotic instruments can be priced consistently with market prices. The problem however, is that the volatility surface is the market's current view of volatility and this will change in the future, meaning the exotic options will no longer be consistent with market prices.

Here are some possible related questions:
\begin{itemize}
\item Which of the above models are incomplete and why?
\item Discuss the features of equity and interest rate smiles as compared to foreign exchange smiles.
\item Given the four models above, you have to use one. What criteria would you use to pick a model?
\end{itemize}"""
    )


def incomplete_market_questions_chinese(image_paths: dict[str, str]) -> str:
    return (
        r"""\subsection{问题 2.58}

\begin{problembox}
什么是隐含波动率以及波动率偏斜/微笑？

\end{problembox}

\solution
隐含波动率就是在某个定价模型下，由期权市场价格反推出的波动率。通常的做法是把期权价格代入 Black-Scholes 公式，寻找能返回同一价格的波动率。例如，考虑一个平值欧式看涨期权，到期时间 1 年，现货价格 100，无风险利率为 5\%。如果该期权的市场价格是 \$6.80，那么隐含波动率就是 15\%。

如果对相同到期日、不同执行价的期权分别计算隐含波动率并画图，曲线通常会呈现微笑或偏斜形状。波动率微笑大致如图 2.8 所示。
"""
        + image_block("2.8", image_paths)
        + r"""

市场出现波动率微笑有很多可能解释。其中一种解释是，市场认为标的价格大幅上涨或下跌的概率高于 Black-Scholes 模型的假设。因此，微笑反映了市场对 Black-Scholes 模型缺陷的看法。

波动率偏斜与微笑类似，但它主要是向下倾斜，而不是相对对称的微笑。波动率偏斜大致如图 2.9 所示。
"""
        + image_block("2.9", image_paths)
        + r"""

关于波动率微笑和偏斜的详细讨论可参见 [6] 第 18 章。

相关问题包括：
\begin{itemize}
\item 股票市场中的隐含波动率通常呈偏斜还是微笑？请解释。
\item 股票市场中的波动率微笑最早何时出现，为什么？
\item 如果市场对期权定价有误，且微笑不是持久特征，请描述一个套利机会。
\end{itemize}

\subsection{问题 2.59}

\begin{problembox}
有哪些不同模型可以用来给外汇奇异期权定价，并且与市场微笑保持一致？各自的优缺点是什么？

\end{problembox}

\solution
很多期权定价模型都能捕捉市场微笑的一部分特征。模型数量很多，不可能逐一详细介绍，因此这里集中讨论四类常用模型：跳扩散、随机波动率、Variance Gamma 和局部波动率。前三类模型的细节可参见 [6]；局部波动率可参见 [20] 第 22 章。

跳扩散模型令外汇汇率按几何布朗运动演化，同时加入随机跳跃成分。跳跃成分通常是泊松过程。如果 $S_t$ 是汇率，可以写成
\[
\frac{dS_t}{S_t}=\mu dt+\sigma dW_t+(J-1)dN_t,
\]
其中 $J$ 是随机跳跃幅度（例如可以服从对数正态分布），$N_t$ 是泊松过程。跳扩散模型会产生所谓的浮动微笑：现货移动时，微笑也随之移动，使微笑底部保持在平值附近。外汇市场具有浮动微笑特征，因此这是跳扩散模型的一个优点。
"""
        + image_block("2.10", image_paths)
        + r"""

跳扩散模型的一个缺点是，生成的微笑会随着期限快速变平，这在多数市场中并不常见。图 2.10 展示了一个例子，其中 2 年后微笑几乎已经消失。

随机波动率模型把外汇汇率和波动率过程都设为随机。波动率过程有很多常见形式，例如 Heston 模型使用
\[
\frac{dS_t}{S_t}=\mu dt+\sqrt{V_t}\,dW_t^{(1)}, \qquad
dV_t=\kappa(\theta-V_t)dt+\sigma_V\sqrt{V_t}\,dW_t^{(2)},
\]
其中 $\theta$ 是长期平均波动率，$\kappa$ 是均值回复速度，$\sigma_V$ 是波动率的波动率，$W_t^{(1)}$ 和 $W_t^{(2)}$ 是相关系数为 $\rho$ 的布朗运动。
"""
        + image_block("2.11", image_paths)
        + r"""

随机波动率模型也会产生浮动微笑，并且可以通过调整参数方便地改变微笑形状。例如，令 $\rho$ 非零可以引入偏斜；均值回复参数 $\kappa$ 可以调节微笑变平的速度。图 2.11 展示了 Heston 模型产生的一个微笑示例。

这种灵活性也带来缺点：所有参数都必须以稳定且与市场一致的方式拟合，而这并不简单。

Variance Gamma 模型把外汇汇率和时间都视为随机过程。直觉是，外汇汇率在市场信息到达时发生变化，而信息到达本身也是随机过程。例如，信息大量到达时波动率较高；信息很少时波动率较低。定义 Variance Gamma 模型时，令 $b(t;\theta,\sigma)$ 是带漂移和波动率的布朗运动，即
\[
db_t=\theta dt+\sigma dW_t,
\]
并令
\[
X(t;\sigma,\nu,\theta)=b(T_t;\theta,\sigma),
\]
其中 $T_t$ 是方差率为 $\nu$ 的 Gamma 过程在时间 $t$ 的取值。
"""
        + image_block("2.12", image_paths)
        + r"""

Variance Gamma 微笑与跳扩散微笑类似，可比较图 2.10 和图 2.12。随着期限增加，微笑倾向于变平，因为模型会变得更接近纯扩散模型。

局部波动率模型从市场报价推导波动率曲面，再用该曲面为更复杂的奇异产品定价。在风险中性条件下，存在唯一一个与市场价格一致的扩散过程。这个唯一的波动率函数 $\sigma(S_t,t)$ 称为局部波动率函数。

一旦得到局部波动率曲面，就可以用它为奇异产品定价，并与当前市场价格保持一致。但问题在于，波动率曲面只是市场当前对波动率的看法，未来会发生变化，因此奇异期权之后可能不再与市场价格一致。

相关问题包括：
\begin{itemize}
\item 上述哪些模型是不完备的？为什么？
\item 比较股票和利率市场微笑与外汇微笑的特征。
\item 如果必须从上述四个模型中选择一个，你会用什么标准？
\end{itemize}"""
    )


def sub_literal(pattern: str, replacement: str, text: str, flags: int = 0) -> str:
    return re.sub(pattern, lambda _match: replacement, text, flags=flags)


if __name__ == "__main__":
    main()
