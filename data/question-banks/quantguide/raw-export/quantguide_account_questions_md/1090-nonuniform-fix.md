# QuantGuide Question

## 1090. Non-Uniform Fix

**Metadata**

- ID: `wXTgapGFLt0Beu8JemcA`
- URL: https://www.quantguide.io/questions/nonuniform-fix
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Hudson River Trading, Citadel, Squarepoint Capital, DRW, Goldman Sachs
- Source: common
- Tags: Expected Value, Conditional Expectation, Continuous Random Variables
- Premium: True
- Solution Free: False
- Version: 5
- Last Edited: 2023-11-7 12:26:47 America/New_York
- Last Edited By: Gabe

### 题干

Let $T, X_1,X_2,\dots \sim \text{Beta}(12,8)$ IID. Then, let $N = \text{min}\{n \in \mathbb{N} : X_n > T\}$. Find $\mathbb{E}[N]$. If this is not finite, enter $-1$.

### Hint

Condition on $T = t$ and use Law of Total Expectation.

### 解答

We can generalize this to any non-negative continuous distribution $F(x)$ with PDF $f(x)$. Suppose $T = t$. Then on any trial, there is a probability $1 - F(t)$ of $X_i > t$. Therefore, $N \mid T = t \sim \text{Geom}(1 - F(t))$. Using the Law of Total Expectation, we get $$\mathbb{E}[N] = \mathbb{E}[\mathbb{E}[N \mid T]] = \mathbb{E}\left[\dfrac{1}{1 - F(T)}\right] = \int_0^{\infty} \dfrac{f(t)}{1 - F(t)}dt = -\ln(1 - F(t))\Big|_0^{\infty} = \infty$$ This means the answer is $-1$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "-1"
    ],
    "companies": [
      {
        "company": "Hudson River Trading"
      },
      {
        "company": "Citadel"
      },
      {
        "company": "Squarepoint Capital"
      },
      {
        "company": "DRW"
      },
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "wXTgapGFLt0Beu8JemcA",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 12:26:47 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8924531,
    "source": "common",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Non-Uniform Fix",
    "topic": "probability",
    "urlEnding": "nonuniform-fix",
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
        "company": "Squarepoint Capital"
      },
      {
        "company": "DRW"
      },
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "medium",
    "id": "wXTgapGFLt0Beu8JemcA",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Non-Uniform Fix",
    "topic": "probability",
    "urlEnding": "nonuniform-fix"
  }
}
```
