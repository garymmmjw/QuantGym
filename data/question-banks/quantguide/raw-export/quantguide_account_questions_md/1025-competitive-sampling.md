# QuantGuide Question

## 1025. Competitive Sampling

**Metadata**

- ID: `QzjQwEvmp7tNX71pOcZu`
- URL: https://www.quantguide.io/questions/competitive-sampling
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: TQD
- Tags: Games, Conditional Probability, Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-10-31 22:38:28 America/New_York
- Last Edited By: Gabe

### 题干

You and your opponent each draw a number from $U(0, 1)$ without revealing it. You each have the option to redraw and keep that value instead, and the other person doesn't know which choice they made. The person with the higher number wins. The optimal strategy is of the form reroll if the number is less than $k$. Find $k$ to $3$ decimal places.

### Hint

Remember that the goal is not to maximize the expected value of your draw but the probability of winning.

### 解答

To find the nash equilibrium, suppose you reroll if your number is less than $p$, and your opponent rerolls if theirs is less than $q$. To compute your chance of winning, consider the cases: $\\$
$\text{Case} \hspace{2pt} 1$: Both players reroll with probability $pq$. At this point, both players are equally likely to win so the chance of winning is $0.5$. $\\$
$\text{Case} \hspace{2pt}  2$: You reroll but your opponent doesn't with probability $p(1-q)$. Conditional on your opponent not rerolling, the expected value of their number is $\dfrac{1+q}{2}$, so your chance of winning is $1 - \dfrac{1+q}{2} = \dfrac{1-q}{2}$. $\\$
$\text{Case}  \hspace{2pt} 3$: You don't reroll but your opponent does. This happens with probability $q(1-p)$ and your probability of winning is $\dfrac{1+p}{2}$. $\\$
$\text{Case}  \hspace{2pt} 4$: Neither player rerolls with probability $(1-p)(1-q)$. We consider subcases where $p \leq q$ and $p > q$. If $p \leq q$, conditional on neither player rerolling, there is a $\dfrac{1-q}{1-p}$ chance that both players' numbers are greater than $q$, and there is a $0.5$ chance of winning from there. Otherwise, you lose. Hence, the probability of winning is $\dfrac{1-q}{2(1-p)}$. Similarly, if $p > q$, your probability of winning is $1 - \dfrac{1-p}{2(1-q)} = \dfrac{1-p-2q}{2(1-q)}$. $\\$

Combining this, the probability of winning is a piecewise function $\\$
$$\left\{
    \begin{array}{lr}
        \frac{1}{2} \left(pq + p(1-q)^2 + q(1-p^2) + (1-q)^2 \right), & \text{if } p \leq q \\
        \frac{1}{2} \left(pq + p(1-q)^2 + q(1-p^2) + (1-p)(1-p-2q) \right), & \text{if } p > q
    \end{array}
\right\}$$ $\\$
Taking the derivative with respect to $p$ and setting them to $0$, we find that the optimal response to a given $l$ satisfies $\\$
$$\left\{
    \begin{array}{lr}
        q + (1-q)^2 - 2pq = 0, & \text{if } p \leq q \\
        3q + (1-q)^2 - 2pq - 2(1-p) = 0, & \text{if } p > q
    \end{array}
\right\}$$ $\\$
Since the game is symmetric, $p = q$, and we may solve the resulting constraints by plugging in $q$, from which we obtain $p = \dfrac{\sqrt{5} - 1}{2} \approx 0.382$. Note that we couldn't have done this from the beginning, as we need to make sure your opponent can't exploit the strategy by choosing a different value.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0.382"
    ],
    "companies": [],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "QzjQwEvmp7tNX71pOcZu",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-31 22:38:28 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8323898,
    "source": "TQD",
    "status": "published",
    "tags": [
      {
        "tag": "Games"
      },
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Competitive Sampling",
    "topic": "probability",
    "urlEnding": "competitive-sampling",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "hard",
    "id": "QzjQwEvmp7tNX71pOcZu",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Games"
      },
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Competitive Sampling",
    "topic": "probability",
    "urlEnding": "competitive-sampling"
  }
}
```
