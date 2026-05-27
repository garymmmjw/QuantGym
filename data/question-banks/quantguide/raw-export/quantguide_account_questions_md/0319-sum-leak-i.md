# QuantGuide Question

## 319. Sum Leak I

**Metadata**

- ID: `TIrHL4NwuMODBRu5H6bC`
- URL: https://www.quantguide.io/questions/sum-leak-i
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: cambridge
- Tags: Expected Value
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Let $X_1,X_2,\dots,X_{40}$ be IID random variables with $\mathbb{E}[X_1] = 2$ and $\mathbb{E}\left[\dfrac{1}{X_1}\right] = 1$. Define $S_n = X_1 + \dots + X_n$. Compute $\mathbb{E}\left[\dfrac{S_{20}}{S_{40}}\right]$.

### Hint

Write $\dfrac{S_m}{S_n}$ as the sum of $n$ expectations by linearity and then note the exchangeability of the random variables.

### 解答

We are going to prove a more general version for $\mathbb{E}\left[\dfrac{S_m}{S_n}\right]$ with $m \leq n$. We have that $$\mathbb{E}\left[\dfrac{S_m}{S_n}\right] = \mathbb{E}\left[\dfrac{X_1 + \dots +X_m}{X_1 + \dots + X_n}\right] = \displaystyle \sum_{i=1}^m \mathbb{E}\left[\dfrac{X_i}{X_1 + \dots X_n}\right]$$ As the $X_i$'s are IID, they are exchangeable, so $\mathbb{E}\left[\dfrac{X_1}{X_1 
+\dots + X_n}\right] = \dots = \mathbb{E}\left[\dfrac{X_n}{X_1 + \dots + X_n}\right]$. However, the sum of all of the expectations above must be $1$, as they would add to $\dfrac{S_n}{S_n} = 1$. Thus, each one is $\dfrac{1}{n}$. As there are $m$ of these terms in the sum, we get $\mathbb{E}\left[\dfrac{S_m}{S_n}\right] = \dfrac{m}{n}$. Our specific case is $m = 20$ and $n = 40$, so our answer is $\dfrac{1}{2}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/2"
    ],
    "difficulty": "easy",
    "id": "TIrHL4NwuMODBRu5H6bC",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 2475243,
    "source": "cambridge",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Sum Leak I",
    "topic": "probability",
    "urlEnding": "sum-leak-i"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "TIrHL4NwuMODBRu5H6bC",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Sum Leak I",
    "topic": "probability",
    "urlEnding": "sum-leak-i"
  }
}
```
