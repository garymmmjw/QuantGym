# QuantGuide Question

## 243. Extra Coin

**Metadata**

- ID: `Efzssyka4QdCsOCIxTaQ`
- URL: https://www.quantguide.io/questions/extra-coin
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Jane Street, Citadel, DE Shaw, WorldQuant, Akuna, SIG, Goldman Sachs, Hudson River Trading, Virtu Financial
- Source: N/A
- Tags: Conditional Probability, Discrete Random Variables
- Premium: True
- Solution Free: False
- Version: 4
- Last Edited: 2023-11-5 00:21:34 America/New_York
- Last Edited By: Gabe

### 题干

Alice has $n+1$ fair coins and Bob has $n$ fair coins. What is the probability that Alice will flip more heads than Bob if both flip all of their coins?

### Hint

This can be solved with symmetry. How can you compare the number of heads in Alice's first $n$
 coins and Bob's $n$ coins? What does this tell you about Alice's $n+1$th coin?

### 解答

This can be solved with symmetry. Let us compare the number of heads in Alice's first $n$
 coins and Bob's $n$ coins. There are three possible outcomes. Let $E_1$ be the event that Alice has strictly more heads than Bob; $E_2$ be the event that Alice and Bob have the same number of heads; $E_3$ be the event that Alice has fewer heads than Bob. By symmetry, $P(E_1) = P(E_3) = x$ and $P(E_2) = y$. Since $\sum_{\omega \in \Omega} P(\omega) = 1$, $2x+y=1$. For $E_1$, Alice will always have more heads than Bob, regardless of Alice's final coin result. Furthermore, for $E_3$, Alice will never have more heads than Bob, regardless of Alice's final coin result. Thus, only event $E_2$ depends on Alice's $n+1$th coin flip, in which Alice will win half the time (with a result of heads). Thus, Alice's total probability of winning is: $x + 0.5y = x+(1-2x) = \frac{1}{2}.$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0.5"
    ],
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "Citadel"
      },
      {
        "company": "DE Shaw"
      },
      {
        "company": "WorldQuant"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "SIG"
      },
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "Hudson River Trading"
      },
      {
        "company": "Virtu Financial"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "Efzssyka4QdCsOCIxTaQ",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 00:21:34 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1921926,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Extra Coin",
    "topic": "probability",
    "urlEnding": "extra-coin",
    "version": 4
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "Citadel"
      },
      {
        "company": "DE Shaw"
      },
      {
        "company": "WorldQuant"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "SIG"
      },
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "Hudson River Trading"
      },
      {
        "company": "Virtu Financial"
      }
    ],
    "difficulty": "easy",
    "id": "Efzssyka4QdCsOCIxTaQ",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Extra Coin",
    "topic": "probability",
    "urlEnding": "extra-coin"
  }
}
```
