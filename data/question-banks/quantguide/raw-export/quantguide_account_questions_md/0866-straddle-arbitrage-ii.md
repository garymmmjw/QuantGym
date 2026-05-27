# QuantGuide Question

## 866. Straddle Arbitrage II

**Metadata**

- ID: `A2XMWI83EaxnrHndbYlK`
- URL: https://www.quantguide.io/questions/straddle-arbitrage-ii
- Topic: finance
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2024-2-3 18:18:53 America/Chicago
- Last Edited By: Sean

### 题干

You have $2$ straddles on stock $S$, $V_1$, which has a strike of $K = 5$ and the other, $V_2$, which has a strike of $K = 8$. What is the smallest amount of money you must receive as a credit for there to be an arbitrage? Assume that the straddles themselves must have non-negative prices. 

### Hint

Construct a straddle spread and look at the payoff. 

### 解答

We are under the assumption that the straddles themselves must have non-negative prices, so the answer to this question must be in the form of a straddle spread. If we construct the straddle spread, we can see that we have a negative payoff of $-3$ (regardless of the straddle spread we choose to create... short the first vs. short the second). This means that if we receive a credit of at least $3$, our minimum payoff will be $0$ and there will be no chance of losing money. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "A2XMWI83EaxnrHndbYlK",
    "internalDifficulty": 2,
    "isAIType": false,
    "isPremium": false,
    "isPublished": false,
    "isSolutionFree": false,
    "lastEditedAt": "2024-2-3 18:18:53 America/Chicago",
    "lastEditedBy": "Sean",
    "orderId": 5427229,
    "source": "",
    "status": "in review",
    "tags": [],
    "title": "Straddle Arbitrage II",
    "topic": "finance",
    "urlEnding": "straddle-arbitrage-ii",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "C8d7E80PMk5PPIqEou6P",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Straddle Arbitrage II",
    "topic": "finance",
    "urlEnding": "straddle-arbitrage-ii"
  }
}
```
