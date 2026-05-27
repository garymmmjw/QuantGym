# QuantGuide Question

## 628. Sum Leak II

**Metadata**

- ID: `jUG3bfUSaKiAPaKm3GvJ`
- URL: https://www.quantguide.io/questions/sum-leak-ii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: cambridge
- Tags: Expected Value
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 13:59:56 America/New_York
- Last Edited By: Gabe

### 题干

Let $X_1,X_2,\dots,X_{40}$ be IID random variables with $\mathbb{E}[X_1] = 2$, $\mathbb{E}\left[\dfrac{1}{S_{20}}\right] = \dfrac{1}{10}$. Define $S_n = X_1 + \dots + X_n$. Compute $\mathbb{E}\left[\dfrac{S_{40}}{S_{20}}\right]$.

### Hint

Note that since $m > n$, $$\mathbb{E}\left[\dfrac{S_m}{S_n}\right] = \mathbb{E}\left[\dfrac{S_n + X_{n+1} + \dots + X_{m}}{S_n}\right] = 1 + \sum_{i=n+1}^m \mathbb{E}\left[\dfrac{X_i}{S_n}\right]$$ 

### 解答

We are now going to prove a more general version of $\mathbb{E}\left[\dfrac{S_m}{S_n}\right]$ with $m > n$. Now, we would have $$\mathbb{E}\left[\dfrac{S_m}{S_n}\right] = \mathbb{E}\left[\dfrac{S_n + X_{n+1} + \dots + X_{m}}{S_n}\right] = 1 + \sum_{i=n+1}^m \mathbb{E}\left[\dfrac{X_i}{S_n}\right]$$ Note that $X_i$ is not in the denominator term for $i = m+1$ to $n$, as the denominator only goes up to $n$. Therefore, the $X_i$ are independent of $S_n$ for $i > n$ and there are $m-n$ of these terms. Therefore, this expectation is $1 + (m-n)\mathbb{E}[X_1]\mathbb{E}\left[\dfrac{1}{S_n}\right]$. Plugging in our specific values yields $1 + (40 - 20)\cdot 2 \cdot \dfrac{1}{10} = 5$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "5"
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "jUG3bfUSaKiAPaKm3GvJ",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 13:59:56 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5015732,
    "source": "cambridge",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Sum Leak II",
    "topic": "probability",
    "urlEnding": "sum-leak-ii"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "jUG3bfUSaKiAPaKm3GvJ",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Sum Leak II",
    "topic": "probability",
    "urlEnding": "sum-leak-ii"
  }
}
```
