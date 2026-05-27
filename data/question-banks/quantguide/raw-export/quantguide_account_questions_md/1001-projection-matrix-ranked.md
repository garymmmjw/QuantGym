# QuantGuide Question

## 1001. Projection Matrix Ranked

**Metadata**

- ID: `SaMML1HHEfuFJFjFucVG`
- URL: https://www.quantguide.io/questions/projection-matrix-ranked
- Topic: pure math
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: jhu lin alg
- Tags: Linear Algebra
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-30 23:17:56 America/New_York
- Last Edited By: Gabe

### 题干

Fix a non-zero vector $v \in \mathbb{R}^n$. Define the projection matrix onto $v$ as $P_v = \dfrac{vv^T}{||v||^2}$. Compute $(\text{rank}(P_v))^2 + (\text{null}(P_v))^2$ as a function of $n$. Your answer should be in the form $an^2 + bn + c$ for integers $a,b,$ and $c$. Find $a+ b+ c$.

### Hint

Interpreting the projection matrix geometrically, we know that for a given vector $x \in \mathbb{R}^n$, $P_vx$ is going to result in the component of $x$ that is parallel to $v$.

### 解答

Interpreting the projection matrix geometrically, we know that for a given vector $x \in \mathbb{R}^n$, $P_vx$ is going to result in the component of $x$ that is parallel to $v$. In other words, $P_vx \in \text{Sp}\{v\}$. This is because $$P_vx = \dfrac{1}{||v||^2} vv^Tx = \dfrac{1}{||v||^2} v(v^Tx) = \dfrac{(v \cdot x)}{||v||^2} v = cv$$ We make the substitution $v^Tx = v \cdot x$ midway. We can exchange the order since the dot product results in a scalar. Since we get a linear scaling of $v$, we can conclude that $\text{rank}(P_v) = 1$, as it is the span of $1$ vector. By the rank-nullity theorem, we get that $\text{null}(P_v) = n-1$, as $\text{rank}(P_v) + \text{null}(P_v) = n$. Therefore, our solution is $(n-1)^2 + 1^2 = n^2 - 2n + 2$. This means the answer to the question at hand is $1 -2 + 2 = 1$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "SaMML1HHEfuFJFjFucVG",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 23:17:56 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8170644,
    "source": "jhu lin alg",
    "status": "published",
    "tags": [
      {
        "tag": "Linear Algebra"
      }
    ],
    "title": "Projection Matrix Ranked",
    "topic": "pure math",
    "urlEnding": "projection-matrix-ranked",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "SaMML1HHEfuFJFjFucVG",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Linear Algebra"
      }
    ],
    "title": "Projection Matrix Ranked",
    "topic": "pure math",
    "urlEnding": "projection-matrix-ranked"
  }
}
```
