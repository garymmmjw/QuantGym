# QuantGuide Question

## 994. Unit Distance

**Metadata**

- ID: `maBebnBZKTE22eq05qMb`
- URL: https://www.quantguide.io/questions/unit-distance
- Topic: pure math
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: JHU Lin Alg
- Tags: Linear Algebra
- Premium: True
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-30 23:21:25 America/New_York
- Last Edited By: Gabe

### 题干

Let $x$ and $y$ be two unit length orthogonal vectors in $\mathbb{R}^n$. Compute $||x-y||$. This answer is in the form $\sqrt{a}$ for an integer $a$. Find $a$.

### Hint

Let $u = x-y$. Then we know that $||u||^2 = u^Tu$. Distribute afterwards.

### 解答

Let $u = x-y$. Then we know that $||u||^2 = u^Tu$. Therefore, $$||x-y||^2 = (x-y)^T(x-y) = x^Tx - x^Ty - y^Tx + y^Ty$$ As $x$ and $y$ are vectors, $x^Ty$ and $y^Tx$ are both just $x \cdot y$, which is $0$ in this case due to the orthogonality of $x$ and $y$. Therefore, $||x-y||^2 = ||x||^2 + ||y||^2 = 2$, as $x$ and $y$ are both unit length. This means that $||x - y|| = sqrt{2}$, so $a = 2$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "maBebnBZKTE22eq05qMb",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 23:21:25 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8130954,
    "source": "JHU Lin Alg",
    "status": "published",
    "tags": [
      {
        "tag": "Linear Algebra"
      }
    ],
    "title": "Unit Distance",
    "topic": "pure math",
    "urlEnding": "unit-distance",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "maBebnBZKTE22eq05qMb",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Linear Algebra"
      }
    ],
    "title": "Unit Distance",
    "topic": "pure math",
    "urlEnding": "unit-distance"
  }
}
```
