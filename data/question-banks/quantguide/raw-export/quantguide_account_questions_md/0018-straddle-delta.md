# QuantGuide Question

## 18. Straddle Delta

**Metadata**

- ID: `P54x1ru6ZRT7LibbS6X4`
- URL: https://www.quantguide.io/questions/straddle-delta
- Topic: finance
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: True
- Solution Free: False
- Version: 3
- Last Edited: 2023-9-30 23:12:50 America/New_York
- Last Edited By: Gabe

### 题干

Let's consider a straddle on underlying $S$ with strike $K$ and expiry $T$. You have a put option on $S$, also with strike $K$ and expiry $T$. This put option has $\Delta = -0.31$. What is the $\Delta$ of the straddle? Assume Black-Scholes dynamics. 

### Hint

How can we replicate a straddle of strike $K$ with a call and put option at the same strike $K$?

### 解答

We can replicate a straddle by going long 1 unit of a call option and long 1 unit of a put option at the same strike $K$. By replication, the $\Delta$ of a portfolio will be equal to the $\Delta$ of the components. We know that $\Delta_C = 1 + \Delta_P = 1 - 0.31 = 0.69$. So, we have total portfolio $\Delta = 0.69 - 0.31 = 0.38$. 

$$\\$$

This is an interesting result: this straddle has positive delta, not $0$ delta as someone may naively think.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0.38"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "P54x1ru6ZRT7LibbS6X4",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 23:12:50 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 162969,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Straddle Delta",
    "topic": "finance",
    "urlEnding": "straddle-delta",
    "version": 3
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "P54x1ru6ZRT7LibbS6X4",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Straddle Delta",
    "topic": "finance",
    "urlEnding": "straddle-delta"
  }
}
```
