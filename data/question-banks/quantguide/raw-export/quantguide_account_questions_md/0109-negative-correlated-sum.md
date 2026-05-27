# QuantGuide Question

## 109. Negative Correlated Sum

**Metadata**

- ID: `V9uIIU6Z55O07BmhnViq`
- URL: https://www.quantguide.io/questions/negative-correlated-sum
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: TransMarket Group
- Source: tmg
- Tags: Covariance
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-10 10:52:52 America/New_York
- Last Edited By: Gabe

### 题干

Suppose $X$ and $Y$ are two random variables with respective variances $9$ and $16$. Find the standard deviation of $X+Y$ if $\rho(X,Y) = -3/8$.

### Hint

$$\text{Var}(X+Y) = \text{Var}(X) + \text{Var}(Y) + 2\text{Cov}(X,Y)$

### 解答

We have that $\text{Var}(X+Y) = \text{Var}(X) + \text{Var}(Y) + 2\text{Cov}(X,Y) = 9 + 16 + 2(-3/8)\sqrt{9}\sqrt{16} = 16$, so the standard deviation of $X+Y$ is $\sqrt{16} = 4$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "4"
    ],
    "companies": [
      {
        "company": "TransMarket Group"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "V9uIIU6Z55O07BmhnViq",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-10 10:52:52 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 769810,
    "source": "tmg",
    "status": "published",
    "tags": [
      {
        "tag": "Covariance"
      }
    ],
    "title": "Negative Correlated Sum",
    "topic": "probability",
    "urlEnding": "negative-correlated-sum",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "TransMarket Group"
      }
    ],
    "difficulty": "easy",
    "id": "V9uIIU6Z55O07BmhnViq",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Covariance"
      }
    ],
    "title": "Negative Correlated Sum",
    "topic": "probability",
    "urlEnding": "negative-correlated-sum"
  }
}
```
