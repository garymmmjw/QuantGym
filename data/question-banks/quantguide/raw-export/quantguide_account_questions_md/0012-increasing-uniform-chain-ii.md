# QuantGuide Question

## 12. Increasing Uniform Chain II

**Metadata**

- ID: `8pWeZ0YqlbMw9IAAHk4I`
- URL: https://www.quantguide.io/questions/increasing-uniform-chain-ii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: Hudson River Trading, Citadel, Akuna, JP Morgan, Goldman Sachs, Vatic Labs, Five Rings
- Source: hrt
- Tags: Expected Value, Discrete Random Variables
- Premium: True
- Solution Free: True
- Version: 5
- Last Edited: 2023-10-29 10:58:04 America/New_York
- Last Edited By: Gabe

### 题干

Let $X_1,X_2,\dots \sim \text{Unif}(0,1)$ IID. Let $N$ be the first index $n$ where $X_n \neq \text{max}\{X_1,\dots, X_n\}$. Find $\mathbb{E}[N]$. The answer will be in the form $a + be$ for integers $a$ and $b$. Note here that $e$ is Euler's constant. Find $a + b$.

### Hint

Use the tail-sum formula for non-negative integer-valued random variables $\mathbb{E}[N] = \displaystyle \sum_{n=0}^{\infty} \mathbb{P}[N > n]$. What does the event $\{N > n\}$ mean in terms of the $X_i$ random variables?

### 解答

We can use the tail-sum formula for non-negative integer-valued random variables $\mathbb{E}[N] = \displaystyle \sum_{n=0}^{\infty} \mathbb{P}[N > n]$. Clearly $\mathbb{P}[N > 0] = \mathbb{P}[N > 1] = 1$, as we need at least $2$ random variables to compare to get one that is not the max. Suppose that $n \geq 2$. Then the event $\{N > n\}$ means that $X_1 < X_2 < \dots < X_n$, which occurs with probability $\dfrac{1}{n!}$, as this is one specific ordering of the indices among $n!$ possible orderings. Therefore, $\mathbb{P}[N > n] = \dfrac{1}{n!}$. In particular, this holds for $n = 0,1$ as well, which is ideal. Summing up, $$\mathbb{E}[N] = \displaystyle \sum_{n=0}^{\infty} \dfrac{1}{n!} = e$$ The answer is therefore $0 + 1 = 1$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1"
    ],
    "companies": [
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
        "company": "JP Morgan"
      },
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "Vatic Labs"
      },
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "8pWeZ0YqlbMw9IAAHk4I",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": true,
    "lastEditedAt": "2023-10-29 10:58:04 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 64313,
    "source": "hrt",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Increasing Uniform Chain II",
    "topic": "probability",
    "urlEnding": "increasing-uniform-chain-ii",
    "version": 5
  },
  "list_summary": {
    "companies": [
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
        "company": "JP Morgan"
      },
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "Vatic Labs"
      },
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "medium",
    "id": "8pWeZ0YqlbMw9IAAHk4I",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Increasing Uniform Chain II",
    "topic": "probability",
    "urlEnding": "increasing-uniform-chain-ii"
  }
}
```
