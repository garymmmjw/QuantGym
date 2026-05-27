# QuantGuide Question

## 682. Sum Standard Deviation

**Metadata**

- ID: `UNe8FM1VMoZI5PNf461c`
- URL: https://www.quantguide.io/questions/sum-standard-deviation
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Five Rings
- Source: 5r
- Tags: Covariance
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-25 20:14:26 America/New_York
- Last Edited By: Gabe

### 题干

Let $X$ and $Y$ be random variables with standard deviations $1$ and $3$, respectively. The standard deviation of $X+Y$ is $4$. Find $\text{Corr}(X,Y)$. 

### Hint

Use the variance of sum formula $\text{Var}(X+Y) = \text{Var}(X) + \text{Var}(Y) + 2\text{Cov}(X,Y)$

### 解答

Using the variance of sum formula, we know $\text{Var}(X+Y) = \text{Var}(X) + \text{Var}(Y) + 2\text{Cov}(X,Y)$. Plugging in our given values, $4^2 = 1^2 + 3^2 + 2\rho (3)(1)$, so $6\rho = 6$, meaning that $\rho = 1$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1"
    ],
    "companies": [
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "UNe8FM1VMoZI5PNf461c",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-25 20:14:26 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5560852,
    "source": "5r",
    "status": "published",
    "tags": [
      {
        "tag": "Covariance"
      }
    ],
    "title": "Sum Standard Deviation",
    "topic": "probability",
    "urlEnding": "sum-standard-deviation",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "easy",
    "id": "UNe8FM1VMoZI5PNf461c",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Covariance"
      }
    ],
    "title": "Sum Standard Deviation",
    "topic": "probability",
    "urlEnding": "sum-standard-deviation"
  }
}
```
