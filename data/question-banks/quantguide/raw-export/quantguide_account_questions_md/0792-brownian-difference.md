# QuantGuide Question

## 792. Brownian Difference

**Metadata**

- ID: `wy5DtsQDvm1bSs8HOp80`
- URL: https://www.quantguide.io/questions/brownian-difference
- Topic: pure math
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: prob theory hw
- Tags: Stochastic Calculus
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-27 15:24:21 America/New_York
- Last Edited By: Gabe

### 题干

Let $B_t$ be a standard Brownian Motion. Fix $t > 0$, and define $\Delta_{m,n} = B_{tm2^{-n}} - B_{t(m-1)2^{-n}}$. Evaluate $\mathbb{E}\left[\left(\displaystyle \sum_{m=1}^{2^n}\Delta_{m,n}^2 - t\right)^2\right]$ as a function of $n$ and $t$. Evaluate this function with $t = 1$ and $n = 5$.

### Hint

By expanding out the interior, $\mathbb{E}\left[\left(\displaystyle \sum_{m=1}^{2^n}\Delta_{m,n}^2 - t\right)^2\right] = \displaystyle \mathbb{E}\left[\left(\displaystyle \sum_{m=1}^{2^n}\Delta_{m,n}^2\right)^2 - 2t \sum_{m=1}^{2^n} \Delta_{m,n}^2 + t^2\right]$. Apply linearity of expectation. Use properties of Brownian motion here to evaluate each of the interiors.

### 解答

By expanding out the interior, $\mathbb{E}\left[\left(\displaystyle \sum_{m=1}^{2^n}\Delta_{m,n}^2 - t\right)^2\right] = \displaystyle \mathbb{E}\left[\left(\displaystyle \sum_{m=1}^{2^n}\Delta_{m,n}^2\right)^2 - 2t \sum_{m=1}^{2^n} \Delta_{m,n}^2 + t^2\right]$. Applying linearity of expectation, we get that the above is $$\mathbb{E}\left[\left(\displaystyle \sum_{m=1}^{2^n}\Delta_{m,n}^2\right)^2\right] - 2t \mathbb{E}\left[\sum_{m=1}^{2^n} \Delta_{m,n}^2\right] + t^2$$ We know that since $\Delta_{m,n} \sim N(0,t/2^n)$ by stationarity, $\mathbb{E}[\Delta_{m,n}^2] = \dfrac{t}{2^n}$. Therefore, the sum in the second term is $2^n \cdot \dfrac{t}{2^n} = t$. For the first sum, we expand out the square and pair up all the terms. Namely, $$\mathbb{E}\left[\left(\displaystyle \sum_{m=1}^{2^n}\Delta_{m,n}^2\right)^2\right] = \mathbb{E}\left[\displaystyle \sum_{i=1}^{2^n} \sum_{j=1}^{2^n} \Delta_{i,n}^2\Delta_{j,n}^2\right] = \mathbb{E}\left[\displaystyle \sum_{i=1}^{2^n} \Delta_{i,n}^4\right] + \sum_{1 \leq i \neq j \leq 2^n} \mathbb{E}[\Delta_{i,n}^2]\mathbb{E}[\Delta_{j,n}^2]$$ We get the last equality above by breaking up into where $i = j$ and $i \neq j$. This is because of the independence when $i \neq j$. For the first sum, we use the fact that if $Z \sim N(0,\sigma^2)$, then $\mathbb{E}[Z^4] = 3\sigma^4$. In this case, the first sum evaluates to $2^n \cdot 3\left(\dfrac{t}{2^n}\right)^2$. There are $2^n \cdot 2^n - 2^n = 2^n(2^n - 1)$ terms in the second sum. We already evaluated each term inside that second sum to be $\left(\dfrac{t}{2^n}\right)^2$, so we get that the combination of the two sums above yields $$\mathbb{E}\left[\left(\displaystyle \sum_{m=1}^{2^n}\Delta_{m,n}^2\right)^2\right] = t^2\left(1 + \dfrac{1}{2^{n-1}}\right)$$ Adding up all three terms from the second line, we get that our answer is $\dfrac{t^2}{2^{n-1}}$. Plugging in $t = 1$ and $n = 5$ yields $\dfrac{1}{16}$ as our answer.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/16"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "wy5DtsQDvm1bSs8HOp80",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-27 15:24:21 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6463507,
    "source": "prob theory hw",
    "status": "published",
    "tags": [
      {
        "tag": "Stochastic Calculus"
      }
    ],
    "title": "Brownian Difference",
    "topic": "pure math",
    "urlEnding": "brownian-difference",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "wy5DtsQDvm1bSs8HOp80",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Stochastic Calculus"
      }
    ],
    "title": "Brownian Difference",
    "topic": "pure math",
    "urlEnding": "brownian-difference"
  }
}
```
