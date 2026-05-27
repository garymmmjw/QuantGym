# QuantGuide Question

## 531. Partial Derivatives

**Metadata**

- ID: `SImRkwi8LNp77PEx9iMr`
- URL: https://www.quantguide.io/questions/partial-derivatives
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: prob hw
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-10 10:57:37 America/New_York
- Last Edited By: Gabe

### 题干

Let $f: \mathbb{R}^{10} \rightarrow \mathbb{R}$, where $f = f(x_1,\dots,x_{10})$ is a smooth function (i.e. partial derivatives exist of all orders). How many $5$th order partial derivatives does $f$ have? For example, $\dfrac{\partial f}{\partial x_1^5}$ and $\dfrac{\partial f}{\partial x_1^2 \partial x_2^2 \partial x_6}$ are both $5$th order partial derivatives.

### Hint

The trick here is to realize that only the counts matter and not the order of the derivatives. Take a stars and bars approach.

### 解答

The trick here is to realize that only the counts matter and not the order of the derivatives. This implies we should take a stars and bars approach. Let $n_i$ be the order of partial derivative given to $x_i$, where $1 \leq i \leq 10$. This means that counting $5$th order partial derivatives is equivalent to counting the number of non-negative integer solutions to $n_1 + \dots + n_{10} = 5$, as each unique solution to this corresponds to the partial derivative $\dfrac{\partial f}{\partial x_1^{n_1} \dots \partial x_{10}^{n_{10}}}$. There are $\displaystyle \binom{14}{9} = 2002$ non-negative integer solutions to the this equation by stars and bars.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2002"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "SImRkwi8LNp77PEx9iMr",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-10 10:57:37 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4233351,
    "source": "prob hw",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Partial Derivatives",
    "topic": "probability",
    "urlEnding": "partial-derivatives",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "SImRkwi8LNp77PEx9iMr",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Partial Derivatives",
    "topic": "probability",
    "urlEnding": "partial-derivatives"
  }
}
```
