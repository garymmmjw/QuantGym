# QuantGuide Question

## 118. Eigenspace Intersection

**Metadata**

- ID: `uZYIyRUJ8v5TS9vJ3gmf`
- URL: https://www.quantguide.io/questions/eigenspace-intersection
- Topic: pure math
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: JHU Lin Alg
- Tags: Linear Algebra
- Premium: True
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-30 23:21:48 America/New_York
- Last Edited By: Gabe

### 题干

Let $A$ be a $n \times n$ matrix with two distinct eigenvalues $\lambda_1 \neq \lambda_2$. Let $E_{\lambda_1}$ and $E_{\lambda_2}$ be the eigenspaces corresponding to the two eigenvalues. Find the cardinality ("size") of $E_{\lambda_1}\cap E_{\lambda_2}$. If this intersection is not finite, enter $-1$.

### Hint

Let $x$ be a vector belonging to both $E_{\lambda_1}$ and $E_{\lambda_2}$. This means that $Ax = \lambda_1 x$ and $Ax = \lambda_2 x$.

### 解答

Let $x$ be a vector belonging to both $E_{\lambda_1}$ and $E_{\lambda_2}$. This means that $Ax = \lambda_1 x$ and $Ax = \lambda_2 x$. Equating both of these, we get that $\lambda_1 x = \lambda_2 x$. Equivalently, this means $(\lambda_1 - \lambda_2)x = 0$. Since $\lambda_1 \neq \lambda_2$, the only way this is possible is if $x = 0 \in \mathbb{R}^n$. Therefore, the intersection of these two eigenspace is just $\{0\}$, so our answer is $1$.

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
    "id": "uZYIyRUJ8v5TS9vJ3gmf",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 23:21:48 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 839463,
    "source": "JHU Lin Alg",
    "status": "published",
    "tags": [
      {
        "tag": "Linear Algebra"
      }
    ],
    "title": "Eigenspace Intersection",
    "topic": "pure math",
    "urlEnding": "eigenspace-intersection",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "uZYIyRUJ8v5TS9vJ3gmf",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Linear Algebra"
      }
    ],
    "title": "Eigenspace Intersection",
    "topic": "pure math",
    "urlEnding": "eigenspace-intersection"
  }
}
```
