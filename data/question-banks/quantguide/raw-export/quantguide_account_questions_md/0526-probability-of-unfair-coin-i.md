# QuantGuide Question

## 526. Probability of Unfair Coin I

**Metadata**

- ID: `SSZdcFIAKrnDpD9dT1Gr`
- URL: https://www.quantguide.io/questions/probability-of-unfair-coin-i
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Two Sigma, WorldQuant, SIG, Akuna, Citadel, Hudson River Trading, DRW, Jane Street, Five Rings, TransMarket Group
- Source: N/A
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 9
- Last Edited: 2023-11-8 09:55:29 America/New_York
- Last Edited By: Gabe

### 题干

Among $1000$ coins, $999$ are fair and $1$ has heads on both sides. You randomly choose a coin and flip it $10$ times. Miraculously, all $10$ flips turns up heads. What is the probability that you chose the unfair coin?

### Hint

How can Bayes' theorem be used to solve this problem?

### 解答

We can use Bayes' theorem to solve this problem. Let $U$ be the probability that the coin is unfair, and $H$ be the probability that the ten tosses turn up heads. Intuitively, $P(H \vert U) = 1$ and $P(A)=\frac{1}{1000}$ as given in the problem. With these, we can solve for $P(U \vert H):$

$$ P(U \vert H) = \frac{P(H \vert U) P(U)}{P(H)} \newline = \frac{P(H \vert U) P(U)}{P(H \vert U) P(U) + P(H \vert U^c) P(U^c)} \newline = \frac{\frac{1}{1000} \times 1}{\frac{1}{1000} \times 1 + \frac{999}{1000} \times \frac{1}{1024}} = \dfrac{1024}{2023} \approx 0.5$$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1024/2023"
    ],
    "companies": [
      {
        "company": "Two Sigma"
      },
      {
        "company": "WorldQuant"
      },
      {
        "company": "SIG"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "Citadel"
      },
      {
        "company": "Hudson River Trading"
      },
      {
        "company": "DRW"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "Five Rings"
      },
      {
        "company": "TransMarket Group"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "SSZdcFIAKrnDpD9dT1Gr",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-8 09:55:29 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4203402,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Probability of Unfair Coin I",
    "topic": "probability",
    "urlEnding": "probability-of-unfair-coin-i",
    "version": 9
  },
  "list_summary": {
    "companies": [
      {
        "company": "Two Sigma"
      },
      {
        "company": "WorldQuant"
      },
      {
        "company": "SIG"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "Citadel"
      },
      {
        "company": "Hudson River Trading"
      },
      {
        "company": "DRW"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "Five Rings"
      },
      {
        "company": "TransMarket Group"
      }
    ],
    "difficulty": "easy",
    "id": "SSZdcFIAKrnDpD9dT1Gr",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Probability of Unfair Coin I",
    "topic": "probability",
    "urlEnding": "probability-of-unfair-coin-i"
  }
}
```
