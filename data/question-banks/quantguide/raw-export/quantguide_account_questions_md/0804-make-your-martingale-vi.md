# QuantGuide Question

## 804. Make Your Martingale VI

**Metadata**

- ID: `9mnfLIAqiQL9lONpSkue`
- URL: https://www.quantguide.io/questions/make-your-martingale-vi
- Topic: pure math
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: Shreve Stoch Calc
- Tags: Stochastic Processes
- Premium: True
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-30 23:17:34 America/New_York
- Last Edited By: Gabe

### 题干

Let $N(t)$ be a Poisson Process with rate $\lambda > 0$ and fix $c > 0$. Consider the process $S(t) = e^{N(t)\log(c) - \lambda t}$. Find the constant $c$ such that $S(t)$ is a martingale.

### Hint

Compute $\mathbb{E}[S_t \mid S_s]$ for any $0 \leq s \leq t$ and make the constant equal $1$. 

### 解答

We compute $\mathbb{E}[S_t \mid S_s]$ for any $0 \leq s \leq t$ first. Namely, $$\mathbb{E}[S_t \mid S_s] = \mathbb{E}\left[e^{N(t)\log(c) - \lambda t} \mid S_s\right] = \mathbb{E}\left[e^{((N(t) - N(s)) + N(s))\log(c) - \lambda s - \lambda (t-s)} \mid S_s\right]$$ Now, we can take out $e^{N(s)\log(c) -\lambda s} = S_s$. By the independent increments property of the Poisson Process, the remaining terms inside are independent of $S_s$, so the conditional expectation becomes unconditional. Namely, this means $$\mathbb{E}[S_t \mid S_s] = S_s \mathbb{E}\left[ e^{(N(t) - N(s))\log(c) - \lambda (t-s)}\right] = S_s e^{-\lambda (t-s)}M(\log(c))$$ where $M(\theta)$ is the MGF of a $\text{Poisson}(\lambda(t-s))$ random variable. We get this because of the fact that $N(t) - N(s) \sim \text{Poisson}(\lambda(t-s))$. We have that $M(\theta) = e^{\lambda(t-s)(e^{\theta} - 1)}$, so $M(\log(c)) = e^{\lambda (t-s)(c-1)}$. 

$$$$

Therefore, $\mathbb{E}[S_t \mid S_s] = S_s e^{\lambda (t-s) (c-2)}$. To make the constant $1$, we need to make the exponent $0$ regardless of $s$ and $t$. This means $c = 2$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "9mnfLIAqiQL9lONpSkue",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 23:17:34 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6585492,
    "source": "Shreve Stoch Calc",
    "status": "published",
    "tags": [
      {
        "tag": "Stochastic Processes"
      }
    ],
    "title": "Make Your Martingale VI",
    "topic": "pure math",
    "urlEnding": "make-your-martingale-vi",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "9mnfLIAqiQL9lONpSkue",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Stochastic Processes"
      }
    ],
    "title": "Make Your Martingale VI",
    "topic": "pure math",
    "urlEnding": "make-your-martingale-vi"
  }
}
```
