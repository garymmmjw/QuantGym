# QuantGuide Question

## 987. Continuous Blackjack

**Metadata**

- ID: `dNeIFDaDM9EPn7X4gFxl`
- URL: https://www.quantguide.io/questions/continuous-blackjack
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 4
- Companies: N/A
- Source: N/A
- Tags: Games
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-8 12:26:01 America/New_York
- Last Edited By: Gabe

### 题干

Two players, a gambler and dealer, play continuous blackjack. The gambler goes first and generates a uniformly random number in $(0,1)$. At any time, they can choose to stop or play again. If they play again, they generate another independent uniform random number in $(0,1)$. If the sum of the generated numbers exceeds $1$, the gambler busts and the dealer wins. Otherwise, if the gambler stops at some value $0 \leq  a \leq 1$, then the dealer begins generating independent uniform random numbers in $(0,1)$. The dealer keeps adding the values up until he either obtains a sum in the interval $(a,1)$ (in which case the dealer wins) or obtains a sum larger than $1$ (in which case the gambler wins).

$$$$

The strategy of the gambler is going to be to stop when the sum is at least $\alpha$ and hit (generate another random number) if the sum is below $\alpha$. The $\alpha$ that maximizes the probability of the gambler winning solves $e^{\alpha} = \dfrac{e + \alpha}{x + y\alpha}$ for integers $x$ and $y$. $e$ here is Euler's constant. Find $x^2 + y^2$.

### Hint

Find the functions $q(x)$ and $r(x)$ that respectively represent the gambler's probability of losing given that he stops at current sum $x$ and hits at current sum $x$. Then $\alpha$ satisfies $q(\alpha) = r(\alpha)$.

### 解答

What we need to do is find the functions $q(x)$ and $r(x)$ that respectively represent the gambler's probability of losing given that he stops at current sum $x$ and hits at current sum $x$. Let's first find $q(x)$.

$$$$

$q(x)$ is the probability that we lose given that stop at a sum $x$. The gambler loses if the successive drawings of the dealer produce a partial sum $s_{n_1}$ in the interval $(x,1)$. This would imply that there is a $n \geq 0$ such that $s_n \leq x$ but $x \leq s_{n+1} \leq 1$. We can sum over all cases of $n$ at the end. The probability that $s_n \leq x$ is a common question that has a known answer of $\dfrac{x^n}{n!}$. This can be seen by considering the volume of the region $\{0 \leq X_1 + \dots +X_n \leq x\}$. Then, the probability that the $(n+1)$st draw puts $s_{n+1}$ in the interval $(x,1)$, which is of length $1-x$, is $1-x$. Therefore, multiplying then, the probability that this happens with exactly $n+1$ random variables is $\dfrac{x^n}{n!}(1-x)$. Summing this over $n$ yields $$q(x) = \displaystyle \sum_{n=0}^{\infty} \dfrac{x^n}{n!}(1-x) = (1-x)e^x$$

$$$$

Now, to find $r(x)$, the probability of losing given you hit and the current sum is $x$, we need to consider two cases. If the current sum is $x$, then we automatically lose if we bust. We bust if the next draw is at least $1-x$, as the sum would be at least $1$, so the probability of this is $x$. Alternatively, by Law of Total Probability and conditioning on the fact that the next draw is at most $1-x$ (so we don't bust), we just integrate over $q$ from $x$ to $1$, as those are the possible values we can receive. Therefore, $$r(x) = \displaystyle \int_x^1 q(t)dt + x = x + e - (2-x)e^x$$

$$$$

Note that the function $q(x)$ is decreasing in $(0,1)$ and $r(x)$ is increasing in $(0,1)$. Therefore, $\alpha$ solves $q(\alpha) = r(\alpha)$, where we are indifferent to hitting or stopping. This means that $(1-\alpha)e^{\alpha} = \alpha + e - (2-\alpha)e^{\alpha}$, so $(3-2\alpha)e^{\alpha} = e + \alpha$, lastly implying that $e^{\alpha} = \dfrac{e+\alpha}{3-2\alpha}$. This means $x = 3$ and $y = -2$, so $x^2 + y^2 = 13$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "13"
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "dNeIFDaDM9EPn7X4gFxl",
    "internalDifficulty": 4,
    "isPremium": false,
    "isPublished": true,
    "lastEditedAt": "2023-9-8 12:26:01 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8044359,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Games"
      }
    ],
    "title": "Continuous Blackjack",
    "topic": "probability",
    "urlEnding": "continuous-blackjack",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "hard",
    "id": "dNeIFDaDM9EPn7X4gFxl",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Games"
      }
    ],
    "title": "Continuous Blackjack",
    "topic": "probability",
    "urlEnding": "continuous-blackjack"
  }
}
```
