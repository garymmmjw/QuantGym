# QuantGuide Question

## 162. Squared GBM

**Metadata**

- ID: `oGg5lFlnq2QoZGNEqNyV`
- URL: https://www.quantguide.io/questions/squared-gbm
- Topic: pure math
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: mse, edited
- Tags: Stochastic Calculus
- Premium: True
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-30 23:18:05 America/New_York
- Last Edited By: Gabe

### 题干

Let $S_t$ be a geometric Brownian Motion with drift and volatility parameters both $1$. Furthermore, let $S_0 = 1$. Find $\mathbb{E}[S_2^2]$. The answer is in the form $e^k$ for a constant $k$. Find $k$.

### Hint

The SDE that $S_t$ satisfies is $dS_t = S_t(dt + dW_t)$ by plugging in $\mu = \sigma = 1$. Use Ito's Lemma to compute $dS_t^2$ by applying it to $f(x) = x^2$. 

### 解答

The SDE that $S_t$ satisfies is $dS_t = S_t(dt + dW_t)$ by plugging in $\mu = \sigma = 1$. Use Ito's Lemma to compute $dS_t^2$ by applying it to $f(x) = x^2$. This yields that $$df(S_t) = dS_t^2 = 2S_t dS_t + \dfrac{1}{2} \cdot 2 d[S,S]_t$$ The quadratic variation of $S_t$ is simply just $$d[S,S]_t = S_t^2(dt + dW_t)(dt + dW_t) = S_t^2 dt$$ Plugging $dS_t$ and $d[S,S]_t$ in, we get that $$dS_t^2 = 2S_t \cdot S_t(dt + dW_t) + S_t^2dt = S_t^2(3dt + 2dW_t)$$ Therefore, we see that $S_t^2$ satisfies the same SDE as $S_t$ but with $\mu' = 3$ and $\sigma' = 2$. 

$$$$

For a GBM $S_t$ with drift $\mu$ and volatility $\sigma$, $\mathbb{E}[S_t] = S_0 e^{\mu t}$ We have that $S_0^2 = 1$ as well. Furthermore, as $S_t^2$ is also a GBM with $\mu' = 3$ and $\sigma' = 2$, plugging these in, we quickly see that $$\mathbb{E}[S_2^2] = 1 \cdot e^{3 \cdot 2} = e^6$$ Therefore, $k = 6$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "6"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "oGg5lFlnq2QoZGNEqNyV",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 23:18:05 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1223817,
    "source": "mse, edited",
    "status": "published",
    "tags": [
      {
        "tag": "Stochastic Calculus"
      }
    ],
    "title": "Squared GBM",
    "topic": "pure math",
    "urlEnding": "squared-gbm",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "oGg5lFlnq2QoZGNEqNyV",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Stochastic Calculus"
      }
    ],
    "title": "Squared GBM",
    "topic": "pure math",
    "urlEnding": "squared-gbm"
  }
}
```
