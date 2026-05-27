# QuantGuide Question

## 540. Squared Matrix

**Metadata**

- ID: `a72u2FrSFgkbpUv2qyWB`
- URL: https://www.quantguide.io/questions/squared-matrix
- Topic: pure math
- Difficulty: easy
- Internal Difficulty: 1
- Companies: DRW
- Source: DRW edited
- Tags: Linear Algebra
- Premium: True
- Solution Free: False
- Version: 4
- Last Edited: 2023-9-30 23:21:54 America/New_York
- Last Edited By: Gabe

### 题干

Suppose that $A = \begin{bmatrix} 1 & x & -1 \\ 2 & -2 & y \\ 0 & 3 & 0 \end{bmatrix}$ and $A^2 = \begin{bmatrix} 9 & -7 & 11 \\ -2 & 21 & -8 \\ 6 & -6 & 9 \end{bmatrix}$. Find $xy$.

### Hint

Multiply certain rows and columns together to get nice and simple equations for $x$ and $y$. Utilize the $0$s.

### 解答

By multiplying the first row of $A$ by the first column of $A$, we get that $1 + 2x = 9$ by equating entries, meaning $x = 4$. Afterwards, by multiplying the second row of $A$ by the by the second column of $A$, we get that $2x + 4 + 3y = 21$. Since $x = 4$ from before, we have that $3y = 9$ after rearrangement, yielding $y = 3$. Therefore, $xy = 12$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "12"
    ],
    "companies": [
      {
        "company": "DRW"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "a72u2FrSFgkbpUv2qyWB",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 23:21:54 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4333815,
    "source": "DRW edited",
    "status": "published",
    "tags": [
      {
        "tag": "Linear Algebra"
      }
    ],
    "title": "Squared Matrix",
    "topic": "pure math",
    "urlEnding": "squared-matrix",
    "version": 4
  },
  "list_summary": {
    "companies": [
      {
        "company": "DRW"
      }
    ],
    "difficulty": "easy",
    "id": "a72u2FrSFgkbpUv2qyWB",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Linear Algebra"
      }
    ],
    "title": "Squared Matrix",
    "topic": "pure math",
    "urlEnding": "squared-matrix"
  }
}
```
