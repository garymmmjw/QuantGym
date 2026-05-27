# QuantGuide Question

## 35. St. Petersburg Paradox

**Metadata**

- ID: `hwr2d4o0olnymkne8ebN`
- URL: https://www.quantguide.io/questions/petersburg-paradox
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Virtu Financial, Squarepoint Capital, IMC, Akuna, Goldman Sachs, Belvedere Trading
- Source: classic
- Tags: Expected Value, Discrete Random Variables
- Premium: False
- Solution Free: False
- Version: 7
- Last Edited: 2023-11-7 13:29:09 America/New_York
- Last Edited By: Gabe

### 题干

Suppose you are offered to play a game where you flip a fair coin until you obtain a heads for the first time. If the first heads occurs on the $n$th flip, you are paid out $\$2^n$. What is the fair value of this game? If your answer is infinite, enter $-1$.

### Hint

The number of flips needed to see the first heads is $N \sim \text{Geom}(1/2)$. We are looking for $\mathbb{E}[2^N]$, which is our expected payout.

### 解答

The number of flips needed to see the first heads is $N \sim \text{Geom}(1/2)$. We are looking for $\mathbb{E}[2^N]$, which is our expected payout. Namely, $$\displaystyle \mathbb{E}[2^N] = \displaystyle \sum_{n=1}^{\infty} 2^n \mathbb{P}[N = n] = \sum_{n=1}^{\infty} 2^n \cdot \left(\dfrac{1}{2^n}\right) = \sum_{n=1}^{\infty} 1 = \infty$$ Therefore, the answer is infinite, meaning the input is $-1$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "-1"
    ],
    "companies": [
      {
        "company": "Virtu Financial"
      },
      {
        "company": "Squarepoint Capital"
      },
      {
        "company": "IMC"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "Belvedere Trading"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "hwr2d4o0olnymkne8ebN",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 13:29:09 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 252193,
    "source": "classic",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "St. Petersburg Paradox",
    "topic": "probability",
    "urlEnding": "petersburg-paradox",
    "version": 7
  },
  "list_summary": {
    "companies": [
      {
        "company": "Virtu Financial"
      },
      {
        "company": "Squarepoint Capital"
      },
      {
        "company": "IMC"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "Belvedere Trading"
      }
    ],
    "difficulty": "easy",
    "id": "hwr2d4o0olnymkne8ebN",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "St. Petersburg Paradox",
    "topic": "probability",
    "urlEnding": "petersburg-paradox"
  }
}
```
