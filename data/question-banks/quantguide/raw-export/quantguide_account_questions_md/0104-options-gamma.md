# QuantGuide Question

## 104. Options Gamma

**Metadata**

- ID: `EOuKz6jjJEpJCzWaNtIa`
- URL: https://www.quantguide.io/questions/options-gamma
- Topic: finance
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 3
- Last Edited: 2023-9-9 23:25:06 America/New_York
- Last Edited By: Gabe

### 题干

We have a European call and put option at strike $K$. The call option has a $\Gamma$ of $0.02$. What is the $\Gamma$ of the put option?



### Hint

Use put-call parity. 

### 解答

We can use put-call parity and the result from Options Delta to obtain the relationship between the gamma of a call and put at the same strike (assuming Black-Scholes dynamics). 

From Options Delta, we have $\Delta_c - \Delta_p = 1$. We can take another derivative with respect to the underlying and see that $\Gamma_c - \Gamma_p = 0 \Rightarrow \Gamma_c = \Gamma_p$. 

This gives us another important result from options theory. The gamma of a call and a put at the same strike are the same. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0.02"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "EOuKz6jjJEpJCzWaNtIa",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-9 23:25:06 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 754251,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Options Gamma",
    "topic": "finance",
    "urlEnding": "options-gamma",
    "version": 3
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "EOuKz6jjJEpJCzWaNtIa",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Options Gamma",
    "topic": "finance",
    "urlEnding": "options-gamma"
  }
}
```
