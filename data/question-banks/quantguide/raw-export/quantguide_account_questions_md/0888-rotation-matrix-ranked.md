# QuantGuide Question

## 888. Rotation Matrix Ranked

**Metadata**

- ID: `i8gdkR5jmiRgClT5xep6`
- URL: https://www.quantguide.io/questions/rotation-matrix-ranked
- Topic: pure math
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: jhu lin alg
- Tags: Linear Algebra
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 11:26:05 America/New_York
- Last Edited By: Gabe

### 题干

Let $R_{\alpha,\beta,\gamma}$ be the rotation matrix in $\mathbb{R}^3$ by $\alpha, \beta,$ and $\gamma$ radians CCW about the $x,y,$ and $z$ axes, respectively. For any fixed $\alpha,\beta,$ and $\gamma$, compute $(\text{rank}(R_{\alpha,\beta,\gamma}))^2 + (\text{null}(R_{\alpha,\beta,\gamma}))^2$.

### Hint

Interpreting the rotation matrix geometrically, we note that rotations do not change the length i.e. they are isometries. Use rank-nullity theorem as well.

### 解答

Interpreting the rotation matrix geometrically, we note that rotations do not change the length i.e. they are isometries. Therefore, the only way to have $0 \in \mathbb{R}^3$ after rotation is to start with $0$. This implies that $\mathcal{N}(R_{\alpha,\beta,\gamma}) = \{0\}$ and that $\text{null}(R_{\alpha,\beta,\gamma}) = 0$. As $\text{rank}(R_{\alpha,\beta,\gamma}) + \text{null}(R_{\alpha,\beta,\gamma}) = 3$ by rank-nullity theorem, we can conclude that $\text{rank}(R_{\alpha,\beta,\gamma}) = 3$, so our answer is $3^2 + 0^2 = 9$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "9"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "i8gdkR5jmiRgClT5xep6",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 11:26:05 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7293505,
    "source": "jhu lin alg",
    "status": "published",
    "tags": [
      {
        "tag": "Linear Algebra"
      }
    ],
    "title": "Rotation Matrix Ranked",
    "topic": "pure math",
    "urlEnding": "rotation-matrix-ranked"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "i8gdkR5jmiRgClT5xep6",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Linear Algebra"
      }
    ],
    "title": "Rotation Matrix Ranked",
    "topic": "pure math",
    "urlEnding": "rotation-matrix-ranked"
  }
}
```
