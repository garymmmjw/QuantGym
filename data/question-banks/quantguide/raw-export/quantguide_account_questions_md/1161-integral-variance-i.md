# QuantGuide Question

## 1161. Integral Variance I

**Metadata**

- ID: `PBcfbK8eHQXOq7wR7z31`
- URL: https://www.quantguide.io/questions/integral-variance-i
- Topic: pure math
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Goldman Sachs
- Source: 150 problems
- Tags: Stochastic Calculus
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-7 12:30:23 America/New_York
- Last Edited By: Gabe

### 题干

Let $W_t$ be a standard Brownian Motion. Find $\text{Var}\left(\displaystyle \int_0^t W_s ds\right)$ as a function of $t$. The answer is in the form $kt^3$ for a constant $k$. Find $k$.

### Hint

Apply integration by parts and the fact that the integrand is "nice" in the Ito Integral

### 解答

Using integration by parts, we see that $$\displaystyle \int_0^t W_sds = sW_s\Big|_0^t - \int_0^t sdW_s = t 
\int_0^t dW_s - \int_0^t sdW_s = \int_0^t (t-s)dW_s$$ The second equality comes from writing $W_t = \displaystyle \int_0^t dW_s$. Now, if $f(t)$ is a deterministic square-integrable function, then the stochastic integral $\displaystyle \int_0^t f(s)dW_s$ is known to be normal with mean $0$ and variance $\displaystyle \int_0^t |f(s)|^2 ds$. This is the Ito Isometry. This theorem applies here to the function $f(s) = t - s$, so the variance of the integral is just $$\displaystyle \int_0^t (t-s)^2 ds = \dfrac{t^3}{3}$$ This means that $k = \dfrac{1}{3}$. 

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
    "difficulty": "medium",
    "hasEdits": false,
    "id": "PBcfbK8eHQXOq7wR7z31",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 12:30:23 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9642244,
    "source": "150 problems",
    "status": "published",
    "tags": [
      {
        "tag": "Stochastic Calculus"
      }
    ],
    "title": "Integral Variance I",
    "topic": "pure math",
    "urlEnding": "integral-variance-i",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "medium",
    "id": "PBcfbK8eHQXOq7wR7z31",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Stochastic Calculus"
      }
    ],
    "title": "Integral Variance I",
    "topic": "pure math",
    "urlEnding": "integral-variance-i"
  }
}
```
