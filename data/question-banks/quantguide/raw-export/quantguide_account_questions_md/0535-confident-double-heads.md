# QuantGuide Question

## 535. Confident Double Heads

**Metadata**

- ID: `Fu3TBGAnFKDBPJ3bxr7f`
- URL: https://www.quantguide.io/questions/confident-double-heads
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: DRW, SIG, WorldQuant, Five Rings, Akuna, TransMarket Group
- Source: JHU Qual
- Tags: Conditional Probability
- Premium: True
- Solution Free: False
- Version: 6
- Last Edited: 2023-11-8 09:55:20 America/New_York
- Last Edited By: Gabe

### 题干

A bag has $19$ fair coins and one double-headed coin. We pick a coin uniformly at random from the bag. What is the minimum number of times this coin would need to appear heads in a row to be at least $95\%$ certain that the coin we have is the double-headed coin? 

### Hint

Use Bayes' Rule to get the probability that given we observe $n$ consecutive heads, our coin is the double-headed coin. 

### 解答

Let $p_n$ be the probability that given we observe $n$ consecutive heads, our coin is the double-headed coin. Let $H_n$ be the event that $n$ consecutive heads are observed and $D$ be the event that we selected the double-headed coin. We want $p_n = \mathbb{P}[D \mid H_n] = \dfrac{\mathbb{P}[D \cap H_n]}{\mathbb{P}[H_n]}$ by the definition of conditional probability. On the numerator, we can use the definition of conditional probability again to receive $\mathbb{P}[D \mid H_n] = \mathbb{P}[H_n \mid D]\mathbb{P}[D]$. The probability of selecting the double-headed coin is $\dfrac{1}{20}$. Given we select the double-headed coin, we will flip any amount of heads consecutively with probability $1$, so $\mathbb{P}[H_n \mid D] = 1$. 

$$$$

On the denominator, we need to condition on whether or not we receive the double-headed coin. Thus, $$\mathbb{P}[H_n] = \mathbb{P}[H_n \mid D]\mathbb{P}[D] + \mathbb{P}[H_n \mid D^c]\mathbb{P}[D^c]$$ We already calculated the first term in the numerator. For the second term, we know $\mathbb{P}[D^c] = 1 - \mathbb{P}[D] = \dfrac{19}{20}$. Then, $\mathbb{P}[H_n \mid D^c] = \dfrac{1}{2^n}$, as we flip a heads on a fair coin with probability $\dfrac{1}{2}$ in each turn. Therefore, $\mathbb{P}[H_n] = \dfrac{1}{20} + \dfrac{19}{20 \cdot 2^n}$. Therefore, $p_n = \dfrac{\frac{1}{20}}{\frac{1}{20} + \frac{19}{20 \cdot 2^n}} = \dfrac{1}{1 + \frac{19}{2^n}}$. Our goal is to find the smallest $n$ such that $p_n > \dfrac{19}{20}$.

$$$$

This means that $\dfrac{1}{1 + \frac{19}{2^n}} > \dfrac{19}{20}$. Multiplying by the denominator on both sides yields $1 > \dfrac{19}{20} + \dfrac{361}{20 \cdot 2^n}$. Multiplying by $20 \cdot 2^n$ on both sides yields $2^n > 361$, which occurs for $n \geq 9$. This means $9$ times is the minimum number we need.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "9"
    ],
    "companies": [
      {
        "company": "DRW"
      },
      {
        "company": "SIG"
      },
      {
        "company": "WorldQuant"
      },
      {
        "company": "Five Rings"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "TransMarket Group"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "Fu3TBGAnFKDBPJ3bxr7f",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-8 09:55:20 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4253172,
    "source": "JHU Qual",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Confident Double Heads",
    "topic": "probability",
    "urlEnding": "confident-double-heads",
    "version": 6
  },
  "list_summary": {
    "companies": [
      {
        "company": "DRW"
      },
      {
        "company": "SIG"
      },
      {
        "company": "WorldQuant"
      },
      {
        "company": "Five Rings"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "TransMarket Group"
      }
    ],
    "difficulty": "easy",
    "id": "Fu3TBGAnFKDBPJ3bxr7f",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Confident Double Heads",
    "topic": "probability",
    "urlEnding": "confident-double-heads"
  }
}
```
