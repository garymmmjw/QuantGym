# QuantGuide Question

## 943. Sticky Strike

**Metadata**

- ID: `aomvss2OZKSWaNHnCL6k`
- URL: https://www.quantguide.io/questions/sticky-strike
- Topic: finance
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-10-24 22:49:47 America/New_York
- Last Edited By: Gabe

### 题干

We are pricing an option for an underlying $S$ with initial price $S_0 = 12$. However, we are not under the assumptions of Black-Scholes. More specifically, we assume that the implied volatility follows a sticky-strike model. 

$$\\$$

For an option at strike $K = 13$, the implied volatility is $\sigma = 0.3$. At time $1$, the underlying price is $S_1 = 15$. What is the implied volatility of the $K = 13$ strike option?

### Hint

What is the sticky-strike model? 

### 解答

The sticky-strike model assumes that implied volatility follows some curve, which is constant across the strikes. This does not assume that the curve is flat, but rather it is strictly a function of the strikes. Here, even though the underlying moves, we still are looking at the same strike, and thus it will have the same implied volatility.



### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0.3"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "aomvss2OZKSWaNHnCL6k",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-24 22:49:47 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7702247,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Sticky Strike",
    "topic": "finance",
    "urlEnding": "sticky-strike",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "aomvss2OZKSWaNHnCL6k",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Sticky Strike",
    "topic": "finance",
    "urlEnding": "sticky-strike"
  }
}
```
