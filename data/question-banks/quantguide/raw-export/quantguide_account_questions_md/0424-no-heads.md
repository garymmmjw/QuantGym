# QuantGuide Question

## 424. No Heads

**Metadata**

- ID: `iLQVvya6TEBArbsD41Bj`
- URL: https://www.quantguide.io/questions/no-heads
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Discrete Random Variables, Conditional Probability
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-8-26 14:31:22 America/New_York
- Last Edited By: Gabe

### 题干

Let $N \sim \text{Poisson}(2)$. We flip a fair coin $N$ times. Find the probability that no heads are obtained by the end of $N$ flips. Your answer should be in the form $e^{a}$ for a rational number $a$. Find $a$.

### Hint

Condition on the value of $N$. What is the probability of this event given $N = n$?

### 解答

Let $H$ be the number of heads obtained. We know that give $N = n$, we flip the coin $n$ times. The probability that none of the coins appear heads in $n$ flips is $\left(\dfrac{1}{2}\right)^n$. Therefore, this is $\mathbb{P}[H = 0 \mid N = n].$

$$$$

We want $\mathbb{P}[H = 0] = \displaystyle \sum_{n=0}^{\infty} \mathbb{P}[H = 0 \mid N = n]\mathbb{P}[N = n]$ by Law of Total Probability. We know $\mathbb{P}[N = n] = \dfrac{2^n}{n!}e^{-2}$ by our known distribution of $N$. We just calculated the other term above, so $\mathbb{P}[H = 0] = \displaystyle \sum_{n = 0}^{\infty} \dfrac{1}{2^n} \cdot \dfrac{2^n}{n!}e^{-2} = e^{-2} \displaystyle \sum_{n=0}^{\infty} \dfrac{1}{n!}$. This remaining sum is just the Taylor expansion of $e$, so $\mathbb{P}[H = 0] = e^{-1}$. This means $a = -1$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "-1"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "iLQVvya6TEBArbsD41Bj",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 14:31:22 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3408615,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Discrete Random Variables"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "No Heads",
    "topic": "probability",
    "urlEnding": "no-heads",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "iLQVvya6TEBArbsD41Bj",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Discrete Random Variables"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "No Heads",
    "topic": "probability",
    "urlEnding": "no-heads"
  }
}
```
