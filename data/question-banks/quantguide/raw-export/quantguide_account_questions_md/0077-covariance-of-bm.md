# QuantGuide Question

## 77. Covariance of BM

**Metadata**

- ID: `2pTKGkPVhfmZmyZhVIGr`
- URL: https://www.quantguide.io/questions/covariance-of-bm
- Topic: pure math
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: standard question
- Tags: Stochastic Calculus, Covariance
- Premium: True
- Solution Free: False
- Version: 3
- Last Edited: 2023-9-30 23:22:18 America/New_York
- Last Edited By: Gabe

### 题干

Let $W_t$ be a standard Brownian Motion. Compute $\text{Cov}(W_1,W_2)$.

### Hint

The trick to compute to write $W_2 = (W_2 - W_1) + W_1$.

### 解答

We will do this more generally for any $0 \leq s \leq t$. In other words, we want to compute $\text{Cov}(W_s,W_t)$ for any $s \leq t$. Using our standard expansion of covariance, $$\text{Cov}(W_s,W_t) = \text{E}[W_sW_t] - \mathbb{E}[W_s]\mathbb{E}[W_t]$$ The mean of Brownian Motion at any time is $0$, as $W_t \sim N(0,t)$, so the second term vanishes. The trick to compute the first term is to write $W_t = (W_t - W_s) + W_s$. We do this because of the fact that $W_t - W_s$ is independent of $W_s$. Therefore, $$\mathbb{E}[W_sW_t] = \mathbb{E}[W_s( (W_t - W_s) + W_s)] = \mathbb{E}[W_s(W_t - W_s)] + \mathbb{E}[W_s^2]$$

The first term above is just $\mathbb{E}[W_s]\mathbb{E}[W_t - W_s] = 0$ by the independence of $W_s$ and $W_t - W_s$. The other term is just $s$. This is because the mean of $W_s$ is $0$, so $\mathbb{E}[W_s^2] = \text{Var}(W_s)$. Therefore, $\text{Cov}(W_s,W_t) = s$ for $0 \leq s \leq t$. In this case $s = 1$ and $t = 2$, so our answer is $1$.

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
    "id": "2pTKGkPVhfmZmyZhVIGr",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 23:22:18 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 528584,
    "randomizable": "",
    "source": "standard question",
    "status": "published",
    "tags": [
      {
        "tag": "Stochastic Calculus"
      },
      {
        "tag": "Covariance"
      }
    ],
    "title": "Covariance of BM",
    "topic": "pure math",
    "urlEnding": "covariance-of-bm",
    "version": 3
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "2pTKGkPVhfmZmyZhVIGr",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Stochastic Calculus"
      },
      {
        "tag": "Covariance"
      }
    ],
    "title": "Covariance of BM",
    "topic": "pure math",
    "urlEnding": "covariance-of-bm"
  }
}
```
