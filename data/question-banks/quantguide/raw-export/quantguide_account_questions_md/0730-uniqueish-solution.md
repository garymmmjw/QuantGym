# QuantGuide Question

## 730. Unique-ish Solution

**Metadata**

- ID: `pWQfgwz5S2MuCEWApI0D`
- URL: https://www.quantguide.io/questions/uniqueish-solution
- Topic: pure math
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: JHU Lin ALg
- Tags: Linear Algebra
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-30 23:18:12 America/New_York
- Last Edited By: Gabe

### 题干

Let $A$ be a $3 \times n$ matrix for some $n \geq 2$ and $\alpha = \{e_1, e_2, e_3\}$ be the canonical basis of $\mathbb{R}^3$. Suppose that $Ax = e_1$ has no solution and $Ax = e_2$ has a unique solution. Find $n$.

### Hint

By the rank-nullity theorem, we know that $\text{rank}(A) + \text{null}(A) = n$. We know $\mathcal{R}(A) \neq \mathbb{R}^3$, as $Ax = e_1$ does not have a solution.

### 解答

By the rank-nullity theorem, we know that $\text{rank}(A) + \text{null}(A) = n$. We know $\mathcal{R}(A) \neq \mathbb{R}^3$, as $Ax = e_1$ does not have a solution. However, since $Ax = e_2$ does have a solution, we can conclude that $\mathcal{N}(A) = \{0\}$. This means that $n = \text{rank}(A)$ and that $n \leq 3$ from the fact that $\text{rank}(A) \leq \text{min}\{m,n\}$ for a $m \times n$ matrix. However, we also know that $n \geq 2$ from the question. If $\text{rank}(A) = 3$, then $\mathcal{R}(A) = \mathbb{R}^3$, which is a contradiction to what we previous stated, so this means $n = \text{rank}(A) = 2$.

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
    "id": "pWQfgwz5S2MuCEWApI0D",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 23:18:12 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5989535,
    "source": "JHU Lin ALg",
    "status": "published",
    "tags": [
      {
        "tag": "Linear Algebra"
      }
    ],
    "title": "Unique-ish Solution",
    "topic": "pure math",
    "urlEnding": "uniqueish-solution",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "pWQfgwz5S2MuCEWApI0D",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Linear Algebra"
      }
    ],
    "title": "Unique-ish Solution",
    "topic": "pure math",
    "urlEnding": "uniqueish-solution"
  }
}
```
