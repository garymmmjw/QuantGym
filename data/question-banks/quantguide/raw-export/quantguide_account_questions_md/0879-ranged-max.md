# QuantGuide Question

## 879. Ranged Max

**Metadata**

- ID: `0LyKcRhfAnvqdItGN1NY`
- URL: https://www.quantguide.io/questions/ranged-max
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: SIG
- Source: tqd
- Tags: Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-30 13:33:27 America/New_York
- Last Edited By: Gabe

### 题干

Let $X_1,X_2,X_3,X_4 \sim \text{Unif}(0,4)$ IID. Find the probability that the maximum of these $4$ random variables is in the interval $(2,3]$.

### Hint

Let $M = \text{max}\{X_1,X_2,X_3,X_4\}$. Can you derive the CDF of $M$ easily?

### 解答

Let $M = \text{max}\{X_1,X_2,X_3,X_4\}$. We want $\mathbb{P}[2 < M \leq 3] = \mathbb{P}[M \leq 3] - \mathbb{P}[M \leq 2]$. The CDF of $M$ is easy to derive. $\{M \leq x\}$ means that $\{X_1,X_2,X_3,X_4 \leq x\}$. By independence, $$\mathbb{P}[M \leq x] = \mathbb{P}[X_1 \leq x]\mathbb{P}[X_2 \leq x]\mathbb{P}[X_3 \leq x]\mathbb{P}[X_4 \leq x] = (\mathbb{P}[X_1 \leq x])^4 = \dfrac{x^4}{4^4}$$ Therefore, $\mathbb{P}[2 < M \leq 3] = \dfrac{3^4 - 2^4}{4^4} = \dfrac{65}{256}$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "65/256"
    ],
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "0LyKcRhfAnvqdItGN1NY",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 13:33:27 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7206959,
    "randomizable": "",
    "source": "tqd",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Ranged Max",
    "topic": "probability",
    "urlEnding": "ranged-max",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "id": "0LyKcRhfAnvqdItGN1NY",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Ranged Max",
    "topic": "probability",
    "urlEnding": "ranged-max"
  }
}
```
