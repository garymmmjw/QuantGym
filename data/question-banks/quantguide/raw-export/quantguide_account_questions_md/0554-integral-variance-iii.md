# QuantGuide Question

## 554. Integral Variance III

**Metadata**

- ID: `AMUM43ZoMsyN27Xbwteq`
- URL: https://www.quantguide.io/questions/integral-variance-iii
- Topic: pure math
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: 150 question
- Tags: Stochastic Calculus
- Premium: True
- Solution Free: False
- Version: 3
- Last Edited: 2023-11-7 12:30:35 America/New_York
- Last Edited By: Gabe

### 题干

Let $W_t$ be a standard Brownian Motion. Compute $\text{Var}\left(\displaystyle \int_0^t W_s^2 dW_s\right)$. The answer will be in the form $kt^3$ for a constant $k$. Find $k$.

### Hint

As $W_s^2$ is square-integrable, adapted, and continuous almost surely, $\displaystyle \int_0^t W_s^2 dW_s$ is a martingale with mean $0$. Use Ito Isometry for the second moment.

### 解答

As $W_s^2$ is square-integrable, adapted, and continuous almost surely, $\displaystyle \int_0^t W_s^2 dW_s$ is a martingale with mean $0$. By Ito Isometry, we have that $$\mathbb{E}\left[\left(\displaystyle \int_0^t W_s^2dW_s \right)^2\right] = \displaystyle \int_0^t \mathbb{E}[(W_s^2)^2] ds = \displaystyle \int_0^t \mathbb{E}[W_s^4] ds$$ As $W_s \sim N(0,s)$, $W_s = \sqrt{s} Z$, where $Z \sim N(0,1)$. In particular, since $\mathbb{E}[Z^4] = 3$, $\mathbb{E}[W_s^4] = \mathbb{E}[(\sqrt{s} Z)^4] = 3s^2$. Now, we evaluate evaluate that integral to simply be $\displaystyle \int_0^t 3s^2 ds = t^3$. As we already know the integral is mean $0$, $t^3$ is also the variance, so $k = 1$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "AMUM43ZoMsyN27Xbwteq",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 12:30:35 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4422075,
    "source": "150 question",
    "status": "published",
    "tags": [
      {
        "tag": "Stochastic Calculus"
      }
    ],
    "title": "Integral Variance III",
    "topic": "pure math",
    "urlEnding": "integral-variance-iii",
    "version": 3
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "AMUM43ZoMsyN27Xbwteq",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Stochastic Calculus"
      }
    ],
    "title": "Integral Variance III",
    "topic": "pure math",
    "urlEnding": "integral-variance-iii"
  }
}
```
