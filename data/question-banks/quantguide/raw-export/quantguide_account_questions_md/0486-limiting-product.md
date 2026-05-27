# QuantGuide Question

## 486. Limiting Product

**Metadata**

- ID: `qBucigRK7NodtL1JCkVH`
- URL: https://www.quantguide.io/questions/limiting-product
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: MSE
- Tags: Limit Theorems
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 14:01:04 America/New_York
- Last Edited By: Gabe

### 题干

Let $X_1,X_2,\dots$ be a sequence of IID Unif$(0,1)$ random variables. Let $Y_n = (X_1X_2\dots X_n)^{\frac{1}{n}}$. It can be shown easily that this limit exists almost surely. Compute $\displaystyle \lim_{n \rightarrow \infty} Y_n$. The answer is in the form $e^a$ for some $a$. Find $a$.

### Hint

Take the logarithm of both sides. Use the fact that if $X \sim \text{Unif}(0,1)$, then $-\log(X) \sim \text{Exp}(1)$.

### 解答

We know that $\log(Y_n) = \dfrac{1}{n}\displaystyle \sum_{k=1}^n \log(X_k)$. As $-\log(X_k) \sim \text{Unif}(0,1)$, which has mean $1$, we can quickly see $\mathbb{E}[\log(X_k)] = -1$, which is finite. Therefore, the Strong Law of Large Numbers applies. We thus get that $$\log(Y_n) = \dfrac{\displaystyle \sum_{k=1}^n \log(X_k)}{n} \rightarrow \mathbb{E}[\log(X_1)] = -1$$ where the convergence above is almost surely. Therefore, this means $Y_n$ converges to $e^{-1}$ almost surely, so $a = -1$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "-1"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "qBucigRK7NodtL1JCkVH",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 14:01:04 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3865835,
    "source": "MSE",
    "status": "published",
    "tags": [
      {
        "tag": "Limit Theorems"
      }
    ],
    "title": "Limiting Product",
    "topic": "probability",
    "urlEnding": "limiting-product"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "qBucigRK7NodtL1JCkVH",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Limit Theorems"
      }
    ],
    "title": "Limiting Product",
    "topic": "probability",
    "urlEnding": "limiting-product"
  }
}
```
