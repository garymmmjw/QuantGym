# QuantGuide Question

## 735. Random Determinant

**Metadata**

- ID: `avCYgt9vfni8DSAHtG2P`
- URL: https://www.quantguide.io/questions/random-determinant
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: WorldQuant
- Source: N/A
- Tags: Expected Value, Linear Algebra
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 10:40:26 America/New_York
- Last Edited By: Gabe

### 题干

Let $A$ be a random $2 \times 2$ matrix formed by having each element $ij$ set by $A_{ij} \sim \text{Bernoulli}(0.5)$. Find $\mathbb{E}[\text{det}(A-A^T)]$.

### Hint

A first observation is that $A$ and $A^T$ have the same elements on the diagonal, so the diagonal elements are $0$.

### 解答

A first observation is that $A$ and $A^T$ have the same elements on the diagonal, so the diagonal elements are $0$. Therefore, if $A = [A_{ij}]_{i,j = 1,2}$, then $\text{det}(A-A^T) = 0 - (A_{12} - A_{21})(A_{21} - A_{12}) = (A_{12} - A_{21})^2$. Thus, all we are really looking for is $\mathbb{E}[(A_{12} - A_{21})^2]$, where $A_{12},A_{21} \sim \text{Bernoulli}(0.5)$. $(A_{12} - A_{21})^2 = 1$ exactly when $A_{12} \neq A_{21}$, as the difference will be either $1$ or $-1$. This occurs with probability $\dfrac{1}{2}$. Otherwise, if they are equal, then $(A_{12} - A_{21})^2 = 0$, also occurring with probability $\dfrac{1}{2}$. Therefore, $\mathbb{E}[\text{det}(A-A^T)] = \mathbb{E}[(A_{12} - A_{21})^2] = \dfrac{0 + 1}{2} = \dfrac{1}{2}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/2"
    ],
    "companies": [
      {
        "company": "WorldQuant"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "avCYgt9vfni8DSAHtG2P",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 10:40:26 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6020644,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Linear Algebra"
      }
    ],
    "title": "Random Determinant",
    "topic": "probability",
    "urlEnding": "random-determinant"
  },
  "list_summary": {
    "companies": [
      {
        "company": "WorldQuant"
      }
    ],
    "difficulty": "easy",
    "id": "avCYgt9vfni8DSAHtG2P",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Linear Algebra"
      }
    ],
    "title": "Random Determinant",
    "topic": "probability",
    "urlEnding": "random-determinant"
  }
}
```
