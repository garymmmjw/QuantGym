# QuantGuide Question

## 493. Integral Variance V

**Metadata**

- ID: `fj2osNU45l0e41HRCBvZ`
- URL: https://www.quantguide.io/questions/integral-variance-v
- Topic: pure math
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Goldman Sachs
- Source: 150 q
- Tags: Stochastic Calculus
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-7 12:30:47 America/New_York
- Last Edited By: Gabe

### 题干

Let $W_t$ be a standard Brownian Motion. Compute the variance of $X_t = \displaystyle \int_0^t sdW_s$ as a function of $t$. The answer will be in the form $kt^3$ for a constant $t$.  Find $k$.

### Hint

As this integrand is a deterministic function $f(s)$, the integral is normally distributed with mean $0$ and variance $\displaystyle \int_0^t (f(s))^2 ds$.

### 解答

As this integrand is a deterministic function $f(s)$, the integral is normally distributed with mean $0$ and variance $\displaystyle \int_0^t (f(s))^2 ds$. In this case, $f(s) = s$, so the variance is $\displaystyle \int_0^t s^2 ds = \dfrac{t^3}{3}$. This implies $k = \dfrac{1}{3}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/3"
    ],
    "companies": [
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "fj2osNU45l0e41HRCBvZ",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 12:30:47 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3923036,
    "source": "150 q",
    "status": "published",
    "tags": [
      {
        "tag": "Stochastic Calculus"
      }
    ],
    "title": "Integral Variance V",
    "topic": "pure math",
    "urlEnding": "integral-variance-v",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "easy",
    "id": "fj2osNU45l0e41HRCBvZ",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Stochastic Calculus"
      }
    ],
    "title": "Integral Variance V",
    "topic": "pure math",
    "urlEnding": "integral-variance-v"
  }
}
```
