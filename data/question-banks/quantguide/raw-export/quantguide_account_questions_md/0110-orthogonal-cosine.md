# QuantGuide Question

## 110. Orthogonal Cosine

**Metadata**

- ID: `AcvjgpZ9yvfCNqnfy4Xs`
- URL: https://www.quantguide.io/questions/orthogonal-cosine
- Topic: pure math
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: jhu lin alg
- Tags: Linear Algebra
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-30 23:20:51 America/New_York
- Last Edited By: Gabe

### 题干

Let $x$ and $y$ be vectors in $\mathbb{R}^n$ with angle $75^{\degree}$ between them. Let $A$ be an orthogonal $n \times n$ matrix. Find the angle between $Ax$ and $Ay$.

### Hint

We know that $\cos(75)= \dfrac{x \cdot y}{||x|| ||y||}$ gives us a formula for the angle between two vectors $x$ and $y$ here. The cosine of the angle between $Ax$ and $Ay$ is $$\dfrac{(Ax) \cdot (Ay)}{||Ax || ||Ay||}$$ Use properties of orthogonal matrices to reduce this expression.

### 解答

We know that $\cos(75)= \dfrac{x \cdot y}{||x|| ||y||}$ gives us a formula for the angle between two vectors $x$ and $y$ here. The cosine of the angle between $Ax$ and $Ay$ is $$\dfrac{(Ax) \cdot (Ay)}{||Ax || ||Ay||}$$ Orthogonal matrices applies to vectors preserve length i.e. the linear transformation $T(x) = Ax$ is an isometry. Therefore, $||Ax|| = ||x||$ and $||Ay|| = ||y||$. Additionally, we can write $(Ax) \cdot (Ay)$ as $(Ax)^T(Ay) = x^TA^TAy$. However, as $A$ is orthogonal, $A^TA = I_n$, so $x^TA^TAy = x^T(I_ny) = x^Ty = x \cdot y$ Therefore, the cosine of the angle between $Ax$ and $Ay$ is the same as between $x$ and $y$, so the answer is also $75^{\degree}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "75"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "AcvjgpZ9yvfCNqnfy4Xs",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 23:20:51 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 774016,
    "source": "jhu lin alg",
    "status": "published",
    "tags": [
      {
        "tag": "Linear Algebra"
      }
    ],
    "title": "Orthogonal Cosine",
    "topic": "pure math",
    "urlEnding": "orthogonal-cosine",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "AcvjgpZ9yvfCNqnfy4Xs",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Linear Algebra"
      }
    ],
    "title": "Orthogonal Cosine",
    "topic": "pure math",
    "urlEnding": "orthogonal-cosine"
  }
}
```
