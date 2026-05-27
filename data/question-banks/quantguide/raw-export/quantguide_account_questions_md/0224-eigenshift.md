# QuantGuide Question

## 224. Eigenshift

**Metadata**

- ID: `3fJSYF8tESA0tw4B53Ji`
- URL: https://www.quantguide.io/questions/eigenshift
- Topic: pure math
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: original
- Tags: Linear Algebra
- Premium: True
- Solution Free: False
- Version: 3
- Last Edited: 2023-9-30 23:20:46 America/New_York
- Last Edited By: Gabe

### 题干

Let $A$ be a $n \times n$ matrix with eigenvalues $5$ and $7$. Find the sum of the eigenvalues of $B = (A - 3I_n)^{-3}$. We write $M^{-3}$ to mean $(M^{-1})^3$.

### Hint

The eigenvalues of $A - kI$ are $\lambda_i - k$, where $\lambda_i$ are the eigenvalues of $A$. What would you expect the eigenvalues of $A^{-1}$ and $A^3$ to be in relation to $A$?

### 解答

The eigenvalues of $A - 3I_n$ are $2$ and $4$, as the $-3I_n$ decreases both eigenvalues by $3$. Then, $(A - 3I_n)^{-1}$ has eigenvalues $\dfrac{1}{2}$ and $\dfrac{1}{4}$, as the inverse has eigenvalues that are the reciprocal of the original eigenvalues. Lastly, $(A - 3I_n)^{-3}$ would have eigenvalues $\dfrac{1}{2^3} = \dfrac{1}{8}$ and $\dfrac{1}{4^3} = \dfrac{1}{64}$, as we would cube the eigenvalues. Adding these up, we get that our answer is $\dfrac{1}{8} + \dfrac{1}{64} = \dfrac{9}{64}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "9/64"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "3fJSYF8tESA0tw4B53Ji",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 23:20:46 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1794558,
    "source": "original",
    "status": "published",
    "tags": [
      {
        "tag": "Linear Algebra"
      }
    ],
    "title": "Eigenshift",
    "topic": "pure math",
    "urlEnding": "eigenshift",
    "version": 3
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "3fJSYF8tESA0tw4B53Ji",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Linear Algebra"
      }
    ],
    "title": "Eigenshift",
    "topic": "pure math",
    "urlEnding": "eigenshift"
  }
}
```
