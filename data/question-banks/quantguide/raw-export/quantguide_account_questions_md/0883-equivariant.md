# QuantGuide Question

## 883. Equivariant

**Metadata**

- ID: `2hS24d21xpazBTp6dq2k`
- URL: https://www.quantguide.io/questions/equivariant
- Topic: statistics
- Difficulty: easy
- Internal Difficulty: 1
- Companies: TransMarket Group
- Source: orignal
- Tags: Covariance
- Premium: True
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-8 10:07:52 America/New_York
- Last Edited By: Gabe

### 题干

Let $X$ and $Y$ be any random variables with finite mean and variance $16$. Find $\text{Corr}(X+Y,X-Y)$.

### Hint

Use bilinearity on $X+Y$ and $X-Y$.

### 解答

We have that Cov$(X+Y,X-Y) = \text{Var}(X) - \text{Cov}(X,Y) + \text{Cov}(X,Y) - \text{Var}(Y)$ by bilinearity. Since we suppose that $X$ and $Y$ have the same variance, all terms cancel and the RHS is $0$, so this means Corr$(X+Y,X-Y) = 0$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0"
    ],
    "companies": [
      {
        "company": "TransMarket Group"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "2hS24d21xpazBTp6dq2k",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-8 10:07:52 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7256208,
    "randomizable": "",
    "source": "orignal",
    "status": "published",
    "tags": [
      {
        "tag": "Covariance"
      }
    ],
    "title": "Equivariant",
    "topic": "statistics",
    "urlEnding": "equivariant",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "TransMarket Group"
      }
    ],
    "difficulty": "easy",
    "id": "2hS24d21xpazBTp6dq2k",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Covariance"
      }
    ],
    "title": "Equivariant",
    "topic": "statistics",
    "urlEnding": "equivariant"
  }
}
```
