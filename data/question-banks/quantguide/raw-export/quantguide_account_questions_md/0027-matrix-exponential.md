# QuantGuide Question

## 27. Matrix Exponential

**Metadata**

- ID: `HPZ6dR9yZjJYqvgWv0KK`
- URL: https://www.quantguide.io/questions/matrix-exponential
- Topic: pure math
- Difficulty: medium
- Internal Difficulty: 2
- Companies: GSA Capital, DRW, Goldman Sachs
- Source: GSA OA
- Tags: Linear Algebra
- Premium: True
- Solution Free: False
- Version: 3
- Last Edited: 2023-10-17 08:08:19 America/New_York
- Last Edited By: Gabe

### 题干

Find $\text{trace}(e^A)$ to 3 decimal points, where $A$ is defined as
\[
\begin{bmatrix}
    3 & 0 \\
    0 & 6
\end{bmatrix} 
\] The answer will be in the form $e^a + e^b$ for integers $a$ and $b$. Find $ab$.

### Hint

Recall that $e^A$ can be rewritten as
\[
\begin{aligned}
    e^A &= \sum_{k = 0}^\infty \frac{1}{k!} A^k
\end{aligned}
\]

### 解答

Recall that $e^A$ can be rewritten as
\[
\begin{aligned}
    e^A &= \sum_{k = 0}^\infty \frac{1}{k!} A^k
\end{aligned}
\]
In addition, note the following:
\[
\begin{aligned}
    \text{trace}(e^A) &= \text{trace} \left(  \sum_{k = 0}^\infty \frac{1}{k!} A^k \right) \\
    &= \sum_{k = 0}^\infty  \text{trace} \left( \frac{1}{k!} A^k \right) \\
    &= \text{trace} \left( 
    \begin{bmatrix}
         \sum_{k = 0}^\infty \frac{3^k}{k!} & 0 \\
         0 & \sum_{k = 0}^\infty \frac{6^k}{k!} 
    \end{bmatrix}
    \right) \\
    &= e^3 + e^6
\end{aligned}
\] Therefore, our answer is $3 \cdot 6 = 18$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "18"
    ],
    "companies": [
      {
        "company": "GSA Capital"
      },
      {
        "company": "DRW"
      },
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "HPZ6dR9yZjJYqvgWv0KK",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-17 08:08:19 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 192519,
    "source": "GSA OA",
    "status": "published",
    "tags": [
      {
        "tag": "Linear Algebra"
      }
    ],
    "title": "Matrix Exponential",
    "topic": "pure math",
    "urlEnding": "matrix-exponential",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "GSA Capital"
      },
      {
        "company": "DRW"
      },
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "medium",
    "id": "HPZ6dR9yZjJYqvgWv0KK",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Linear Algebra"
      }
    ],
    "title": "Matrix Exponential",
    "topic": "pure math",
    "urlEnding": "matrix-exponential"
  }
}
```
