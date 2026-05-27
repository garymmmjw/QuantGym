# QuantGuide Question

## 920. Different Variance

**Metadata**

- ID: `fq5LmCfVmkJtA619IHp8`
- URL: https://www.quantguide.io/questions/different-variance
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: Covariance/Correlation
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-8-26 14:28:49 America/New_York
- Last Edited By: Gabe

### 题干

Let $X$ and $Y$ be random variables with $\text{Var}(X + Y) = 18$ and $\text{Var}(X - Y) = 10$. Find $\text{Cov}(X,Y)$.

### Hint

We know that $\text{Var}(X+Y) = \text{Var}(X) + \text{Var}(Y) + 2\text{Cov}(X,Y)$. Replace $Y$ with $-Y$ to compute $\text{Var}(X-Y)$.

### 解答

We know that $\text{Var}(X+Y) = \text{Var}(X) + \text{Var}(Y) + 2\text{Cov}(X,Y)$. Replacing $Y$ with $-Y$ yields the formula $\text{Var}(X-Y) = \text{Var}(X) + \text{Var}(Y) - 2\text{Cov}(X,Y)$. Therefore, considering $\text{Var}(X+Y) - \text{Var}(X-Y)$, we get that it reduces to $4\text{Cov}(X,Y)$. Therefore, as we know $\text{Var}(X + Y) = 18$ and $\text{Var}(X - Y) = 10$, $4\text{Cov}(X,Y) = 8$, meaning $\text{Cov}(X,Y) = 2$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "fq5LmCfVmkJtA619IHp8",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 14:28:49 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7551111,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Covariance/Correlation"
      }
    ],
    "title": "Different Variance",
    "topic": "probability",
    "urlEnding": "different-variance",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "fq5LmCfVmkJtA619IHp8",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Covariance/Correlation"
      }
    ],
    "title": "Different Variance",
    "topic": "probability",
    "urlEnding": "different-variance"
  }
}
```
