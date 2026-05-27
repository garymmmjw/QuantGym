# QuantGuide Question

## 977. Summed Brownians

**Metadata**

- ID: `NWOeeoR36njM9ZJiqehj`
- URL: https://www.quantguide.io/questions/summed-brownians
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: og
- Tags: Covariance, Stochastic Calculus
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-30 17:39:36 America/New_York
- Last Edited By: Gabe

### 题干

Let $B_1,B_2,$ and $B_3$ be standard Brownian Motions. Find $\text{Cov}(B_1(1) + B_2(1), B_2(2) + B_3(2))$.

### Hint

Use the fact that for a standard Brownian Motion, $\text{Cov}(B(s),B(t)) = \text{min}\{s,t\}$.

### 解答

We use the fact that for a standard Brownian Motion, $\text{Cov}(B(s),B(t)) = \text{min}\{s,t\}$. First, we use the bilinearity of covariance here to conclude that $\text{Cov}(B_1(1) + B_2(1), B_2(2) + B_3(2)) = \text{Cov}(B_2(1),B_2(2))$, as all other pairs vanish due to independence. Then, using the fact above, the last term evaluates to $1$. Therefore, our answer is $1$.

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
    "id": "NWOeeoR36njM9ZJiqehj",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 17:39:36 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7961572,
    "source": "og",
    "status": "published",
    "tags": [
      {
        "tag": "Covariance"
      },
      {
        "tag": "Stochastic Calculus"
      }
    ],
    "title": "Summed Brownians",
    "topic": "probability",
    "urlEnding": "summed-brownians",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "NWOeeoR36njM9ZJiqehj",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Covariance"
      },
      {
        "tag": "Stochastic Calculus"
      }
    ],
    "title": "Summed Brownians",
    "topic": "probability",
    "urlEnding": "summed-brownians"
  }
}
```
