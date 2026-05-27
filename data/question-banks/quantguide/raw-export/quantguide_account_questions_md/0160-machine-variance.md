# QuantGuide Question

## 160. Machine Variance

**Metadata**

- ID: `RorJ0CEQCB23y2Z2Tf91`
- URL: https://www.quantguide.io/questions/machine-variance
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Citadel
- Source: Citadel OA
- Tags: Expected Value
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-25 21:20:37 America/New_York
- Last Edited By: Gabe

### 题干

A pizza shop consists of $25$ independent workers that make pizzas. The standard deviation of the number of pizzas produced by each worker in a day is $60$. Find the standard deviation of the total number of pizzas produced by the shop per day.

### Hint

Let $X_1,\dots, X_{25}$ be the number of pizzas produced by each of the workers per day. Then $T = X_1 + \dots + X_{25}$ gives the total number of pizzas produced per day by the shop.

### 解答

Let $X_1,\dots, X_{25}$ be the number of pizzas produced by each of the workers per day. Then $T = X_1 + \dots + X_{25}$ gives the total number of pizzas produced per day by the shop. We have that $\text{Var}(T) = 25 \cdot \text{Var}(X_1)$ because of the fact that each of the people are independent and have the same variance. Thus, $\sigma_T = \sqrt{\text{Var}(T)} = 5 \cdot \sigma_{X_1} = 5 \cdot 60 = 300$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "300"
    ],
    "companies": [
      {
        "company": "Citadel"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "RorJ0CEQCB23y2Z2Tf91",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-25 21:20:37 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1206876,
    "source": "Citadel OA",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Machine Variance",
    "topic": "probability",
    "urlEnding": "machine-variance"
  },
  "list_summary": {
    "companies": [
      {
        "company": "Citadel"
      }
    ],
    "difficulty": "easy",
    "id": "RorJ0CEQCB23y2Z2Tf91",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Machine Variance",
    "topic": "probability",
    "urlEnding": "machine-variance"
  }
}
```
