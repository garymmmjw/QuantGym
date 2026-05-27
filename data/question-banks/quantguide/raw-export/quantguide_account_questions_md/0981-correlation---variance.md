# QuantGuide Question

## 981. Correlation  & Variance

**Metadata**

- ID: `YV2hlSRrAhar6SP2DzgO`
- URL: https://www.quantguide.io/questions/correlation---variance
- Topic: statistics
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Five Rings
- Source: Five Rings QR Speed Round
- Tags: Covariance
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-10-29 22:03:30 America/New_York
- Last Edited By: Gabe

### 题干

Suppose we have that $\sigma_X = 4$, $\sigma_Y = 7$, and $\sigma_{X+Y} = 11$. What is $\rho(X,Y)$? 

### Hint

Use the variance of a sum formula

### 解答

We are going to generalize this to when $\sigma_X = a, \sigma_Y = b,$ and $\sigma_{X+Y} = a+b$. We know that $$\text{Var}(X + Y) = \text{Var}(X) + \text{Var}(Y) + 2 \text{Cov}(X, Y) \implies \text{Cov}(X,Y) = \frac{1}{2}((a+b)^2 - a^2 - b^2) = ab$$
After, we know that
$$\rho(X,Y) = \frac{Cov(X,Y)}{ \sigma_X \sigma_Y} = \frac{ab}{a b} = 1$$

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
    "id": "YV2hlSRrAhar6SP2DzgO",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-29 22:03:30 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7990100,
    "source": "Five Rings QR Speed Round",
    "status": "published",
    "tags": [
      {
        "tag": "Covariance"
      }
    ],
    "title": "Correlation  & Variance",
    "topic": "statistics",
    "urlEnding": "correlation---variance",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "easy",
    "id": "YV2hlSRrAhar6SP2DzgO",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Covariance"
      }
    ],
    "title": "Correlation  & Variance",
    "topic": "statistics",
    "urlEnding": "correlation---variance"
  }
}
```
