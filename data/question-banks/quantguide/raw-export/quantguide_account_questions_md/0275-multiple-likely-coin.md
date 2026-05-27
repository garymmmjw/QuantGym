# QuantGuide Question

## 275. Multiple Likely Coin

**Metadata**

- ID: `0jcfsDnktp7H8ceufLws`
- URL: https://www.quantguide.io/questions/multiple-likely-coin
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: original
- Tags: Conditional Probability
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-27 14:17:53 America/New_York
- Last Edited By: Gabe

### 题干

Coins $1$ and $2$ are weighted such that Coin $1$ has probability $0 < p_1 < 1$ of landing heads up and Coin $2$ has probability $0 < p_2 < 1$ of landing heads up. It is known that $p_1 + p_2 = 1$ and that $p_2 > p_1$. One of the coins is chosen randomly and then flipped twice. Both of the flips resulted in heads. If we know that it is now $4$ times as likely that we chose Coin $2$ as opposed to Coin $1$ given this information, find $p_2$.

### Hint

Let $C_2$ denote the event we selected Coin 2, $C_1$ denote the event we selected Coin 1, and $H$ denote the event we flipped 2 heads from the two flips. The information in the question says that $\mathbb{P}[C_2 \mid H] = 4\mathbb{P}[C_1 \mid H]$.

### 解答

We are going to solve this more generally for $k > 1$ times as likely. We are given that if there we select a coin at random and we receive $2$ heads, then it is $k$ times as likely that we picked Coin 2 than Coin 1. Thus, if we let $C_2$ denote the event we selected Coin 2, $C_1$ denote the event we selected Coin 1, and $H$ denote the event we flipped 2 heads from the two flips, $\mathbb{P}[C_2 \mid H] = k\mathbb{P}[C_1 \mid H]$ Writing this with conditional probability formula on both sides, we get the equality $$\dfrac{\mathbb{P}[C_2H]}{\mathbb{P}[H]} = \dfrac{\mathbb{P}[C_1H]}{\mathbb{P}[H]}$$ Cancellation of denominators gives $\mathbb{P}[C_2H] = k\mathbb{P}[C_1H]$. Rewriting with conditional probability again on both sides yields $$\mathbb{P}[H \mid C_2]\mathbb{P}[C_2] = k\mathbb{P}[H \mid C_1]\mathbb{P}[C_1]$$ However, since the two coins are selected at random, $\mathbb{P}[C_1] = \mathbb{P}[C_2]$. Thus, we have $\mathbb{P}[H \mid C_2] = k\mathbb{P}[H \mid C_1]$. This is now is a very workable expression. Now that each flip is independent, so $\mathbb{P}[H \mid C_2]$ is just the probability of a heads on Coin $2$ squared, which is just $p_2^2$. Similarly, since $p_1 + p_2 = 1$, $p_1 = 1-p_2$. Thus, the probability of 2 heads on Coin 1 is given by $(1-p_2)^2$. Therefore, we now have the equality $p_2^2 = k(1-p_2)^2 \implies p_2^2 = kp_2^2 - 2kp_2 + k$. Rearranging to get $0$ on a side, we get $(k-1)p_2^2 - 2kp_2 + k = 0$. This is a polynomial in $p_2$. We use the quadratic formula to solve: $$p_2 = \dfrac{-(-2k) \pm \sqrt{(-2k)^2 - 4(k-1)(k)}}{2(k-1)} = \dfrac{2k \pm \sqrt{4k}}{2(k-1)}$$ Notice that we must use the $-$ branch of the square root here, as $2k > 2(k-1)$, so $\dfrac{2k}{2(k-1)} > 1$, and a probability can not be larger than 1. Thus, we use the $-$ branch as our valid branch to solve for $p_2$, and we get that $p_2 = \dfrac{k-\sqrt{k}}{k-1}$. Plugging in $k = 4$, we obtain $p_2 = \dfrac{2}{3}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2/3"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "0jcfsDnktp7H8ceufLws",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-27 14:17:53 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2114492,
    "randomizable": "",
    "source": "original",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Multiple Likely Coin",
    "topic": "probability",
    "urlEnding": "multiple-likely-coin",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "0jcfsDnktp7H8ceufLws",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Multiple Likely Coin",
    "topic": "probability",
    "urlEnding": "multiple-likely-coin"
  }
}
```
