# QuantGuide Question

## 328. Brownian Bridge

**Metadata**

- ID: `oKflYQXCmGhqBRq6Zald`
- URL: https://www.quantguide.io/questions/brownian-bridge
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Squarepoint Capital
- Source: og
- Tags: Stochastic Calculus, Conditional Expectation
- Premium: False
- Solution Free: False
- Version: 3
- Last Edited: 2023-11-5 00:02:40 America/New_York
- Last Edited By: Gabe

### 题干

Let $W_t$ be a standard Brownian Motion. We define the Brownian Bridge on $[0,1]$ as $X_t = W_t - tW_1$. Find $\mathbb{E}[X_{1/2} \mid X_{3/4} = 3]$.

### Hint

Write $X_s = W_s - sW_1 = \left(W_s - \dfrac{s}{t}W_t\right) + \dfrac{s}{t}(W_t - tW_1) = \left(W_s - \dfrac{s}{t}W_1\right) + \dfrac{s}{t}X_t$. What can you say about the distributions of the two terms? Compute the correlation of the terms.

### 解答

We will solve this more generally for $0 < s < t < 1$. Write $X_s = W_s - sW_1 = \left(W_s - \dfrac{s}{t}W_t\right) + \dfrac{s}{t}(W_t - tW_1) = \left(W_s - \dfrac{s}{t}W_1\right) + \dfrac{s}{t}X_t$. For fixed times, both of the terms are normally distributed. Furthermore, $$\text{Cov}\left(W_s - \dfrac{s}{t}W_t, X_t\right) = \text{Cov}\left(W_s - \dfrac{s}{t}W_t, W_t - tW_1\right) = \text{Cov}(W_s,W_t) - t\text{Cov}(W_s,W_1) - \dfrac{s}{t}\text{Cov}(W_t,W_t) + s\text{Cov}(W_t,W_1)$$ $$= s - st - s + st = 0$$

Therefore, we have that $W_s - \dfrac{s}{t}W_t$ and $X_t$ are independent, as they are uncorrelated normals. Thus, $\mathbb{E}\left[W_s - \dfrac{s}{t}W_t \mid X_t\right] = \mathbb{E}[W_s] - \dfrac{s}{t}\mathbb{E}[W_t] = 0$. Using this, we can find that $$\mathbb{E}[X_s \mid X_t] = \mathbb{E}\left[\left(W_s - \dfrac{s}{t}W_1\right) + \dfrac{s}{t}X_t \mid X_t\right] = \dfrac{s}{t}X_t$$ We obtain this from the fact that the first term vanishes by the above and that $X_t$ is known in the second term. In particular, we have that $s = 1/2, t = 3/4,$ and $X_t = 3$, so our answer is $\dfrac{2}{3} \cdot 3 = 2$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2"
    ],
    "companies": [
      {
        "company": "Squarepoint Capital"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "oKflYQXCmGhqBRq6Zald",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 00:02:40 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2535728,
    "source": "og",
    "status": "published",
    "tags": [
      {
        "tag": "Stochastic Calculus"
      },
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Brownian Bridge",
    "topic": "probability",
    "urlEnding": "brownian-bridge",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "Squarepoint Capital"
      }
    ],
    "difficulty": "medium",
    "id": "oKflYQXCmGhqBRq6Zald",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Stochastic Calculus"
      },
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Brownian Bridge",
    "topic": "probability",
    "urlEnding": "brownian-bridge"
  }
}
```
