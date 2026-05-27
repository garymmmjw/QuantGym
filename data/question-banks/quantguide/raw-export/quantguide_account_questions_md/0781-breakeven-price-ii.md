# QuantGuide Question

## 781. Breakeven Price II

**Metadata**

- ID: `4L30OyxLYYPRM3ySnWmm`
- URL: https://www.quantguide.io/questions/breakeven-price-ii
- Topic: finance
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-10-2 22:37:17 America/New_York
- Last Edited By: Gabe

### 题干

You write a call option for $\$2.50$ at a strike price of $\$12$. What is the breakeven price? 

### Hint

What is the payoff of a call option? Do we pay or get paid for this? 

### 解答

Since we are writing (selling) a call option, we have payoff $-\max{(S_T - 12,0)}$. We also obtain a credit of $\$2.50$ as a premium since we are providing insurance. We can then solve the following equation:

$$2.50 - \max{(S_T - 12,0}) = 0$$

Solving this yields $S_T = 14.5$ (see Breakeven Price I) 


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "14.5"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "4L30OyxLYYPRM3ySnWmm",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-2 22:37:17 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6356529,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Breakeven Price II",
    "topic": "finance",
    "urlEnding": "breakeven-price-ii",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "4L30OyxLYYPRM3ySnWmm",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Breakeven Price II",
    "topic": "finance",
    "urlEnding": "breakeven-price-ii"
  }
}
```
