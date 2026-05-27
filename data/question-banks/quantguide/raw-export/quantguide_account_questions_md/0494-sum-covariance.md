# QuantGuide Question

## 494. Sum Covariance

**Metadata**

- ID: `1lqR2kz9rq3VWY5V4WiD`
- URL: https://www.quantguide.io/questions/sum-covariance
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: og
- Tags: Covariance
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-29 08:53:52 America/New_York
- Last Edited By: Gabe

### 题干

Let $X,Y,$ and $Z$ be uncorrelated random variables with respective variances $64, 36,$ and $225$. Let $U = X+Y$ and $V = X+Z$. Find $\text{Corr}(U,V)$.

### Hint

Since $X,Y,$ and $Z$ are uncorrelated, the variance of the sum of any two is just the sum of the variances. Use Bilinearity of Covariance.

### 解答

Since $X,Y,$ and $Z$ are uncorrelated, $\text{Var}(U) = \text{Var}(X) + \text{Var}(Y) = 100$ and $\text{Var}(V) = \text{Var}(X) + \text{Var}(Z) = 289$. Furthermore, $\text{Cov}(U,V) = \text{Cov}(X+Y,X+Z) = \text{Cov}(X,X) = \text{Var}(X) = 64$ by bilinearity of covariance and the lack of correlation between the other random variables. Therefore, by the correlation formula, $$\text{Corr}(U,V) = \dfrac{\text{Cov}(U,V)}{\sigma_U\sigma_V} = \dfrac{64}{\sqrt{100 \cdot 289}} = \dfrac{64}{\sqrt{10^2 \cdot 17^2}} = \dfrac{32}{85}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "32/85"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "1lqR2kz9rq3VWY5V4WiD",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-29 08:53:52 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3930355,
    "randomizable": "",
    "source": "og",
    "status": "published",
    "tags": [
      {
        "tag": "Covariance"
      }
    ],
    "title": "Sum Covariance",
    "topic": "probability",
    "urlEnding": "sum-covariance",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "1lqR2kz9rq3VWY5V4WiD",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Covariance"
      }
    ],
    "title": "Sum Covariance",
    "topic": "probability",
    "urlEnding": "sum-covariance"
  }
}
```
