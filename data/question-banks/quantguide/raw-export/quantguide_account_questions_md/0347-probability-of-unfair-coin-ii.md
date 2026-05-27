# QuantGuide Question

## 347. Probability of Unfair Coin II

**Metadata**

- ID: `pYwoj1oikYhStFSvLK3K`
- URL: https://www.quantguide.io/questions/probability-of-unfair-coin-ii
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Jane Street, DRW, SIG, Hudson River Trading, Citadel, Akuna, WorldQuant, Two Sigma, Five Rings, TransMarket Group
- Source: N/A
- Tags: Conditional Probability
- Premium: True
- Solution Free: False
- Version: 5
- Last Edited: 2023-11-8 09:55:37 America/New_York
- Last Edited By: Gabe

### 题干

Flip $98$ fair coins, one double-headed coin, and 1 double-tailed coin and observe the first coin tossed. A coin is selected uniformly at random and you see it shows heads. What is the probability that this coin is the double-headed coin?

### Hint

Let $D$ be the event that the double-headed coin is selected and $H$ be the event that the coin showed heads. You want $\mathbb{P}[D \mid H]$. Can you use Bayes' Rule to compute this?

### 解答

Let $D$ be the event that we select the double-headed coin and $H$ be the event that the coin showed heads. We want $\mathbb{P}[D \mid H]$. By Bayes' Rule, we have that $\mathbb{P}[D \mid H] = \dfrac{\mathbb{P}[H \mid D]\mathbb{P}[D]}{\mathbb{P}[H]}$. For the denominator, we should condition on the ways a head could be obtained. There are three types of coins: the fair coins, the double-headed coin, and the double-tailed coin. Let $F$ be the event of selecting a fair coin and $T$ be the event of selecting the double-tailed coin. We have that $\mathbb{P}[H \mid T] = 0$ since this coin has no heads on it. We know $\mathbb{P}[H \mid F] = \dfrac{1}{2}$ since it is fair and $\mathbb{P}[F] = \dfrac{98}{100}$ since 98 of the coins are fair. Lastly, $\mathbb{P}[H \mid D] = 1$ since both sides are heads and $\mathbb{P}[D] = \dfrac{1}{100}$ as there is only $1$ of them. Combining all of this, $$\mathbb{P}[D \mid H] = \dfrac{\frac{1}{100} \cdot 1}{\frac{1}{100} \cdot 1 + \frac{98}{100} \cdot \frac{1}{2} + 0} = \dfrac{1}{50}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/50"
    ],
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "DRW"
      },
      {
        "company": "SIG"
      },
      {
        "company": "Hudson River Trading"
      },
      {
        "company": "Citadel"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "WorldQuant"
      },
      {
        "company": "Two Sigma"
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
    "id": "pYwoj1oikYhStFSvLK3K",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-8 09:55:37 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2658235,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Probability of Unfair Coin II",
    "topic": "probability",
    "urlEnding": "probability-of-unfair-coin-ii",
    "version": 5
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "DRW"
      },
      {
        "company": "SIG"
      },
      {
        "company": "Hudson River Trading"
      },
      {
        "company": "Citadel"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "WorldQuant"
      },
      {
        "company": "Two Sigma"
      },
      {
        "company": "Five Rings"
      },
      {
        "company": "TransMarket Group"
      }
    ],
    "difficulty": "easy",
    "id": "pYwoj1oikYhStFSvLK3K",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Probability of Unfair Coin II",
    "topic": "probability",
    "urlEnding": "probability-of-unfair-coin-ii"
  }
}
```
