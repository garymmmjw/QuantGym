# QuantGuide Question

## 416. Breakeven Price I

**Metadata**

- ID: `q6jqiqfxzvcintwzgchl`
- URL: https://www.quantguide.io/questions/breakeven-price
- Topic: finance
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: False
- Solution Free: False
- Version: 4
- Last Edited: 2023-10-2 22:38:33 America/New_York
- Last Edited By: Gabe

### 题干

You buy a call option for $\$3$ at a strike price of $\$4$. What is the breakeven price? 



### Hint

What is the payoff of a call option? How much do we pay for it? 

### 解答

The payoff of the call option at expiry is $\max{(S_T - 4, 0)}$. For a non-negative payout, we need $S_T = 4$. However, since we paid $\$3$, we need $S_T$ to be $\$3$ higher to make money. Another way to think about it is:

$$\max{(S_T - 4,0)} - 3 = 0$$

Solving for $S_T$, we get $S_T = 7$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "7"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "q6jqiqfxzvcintwzgchl",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-2 22:38:33 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3258758,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Breakeven Price I",
    "topic": "finance",
    "urlEnding": "breakeven-price",
    "version": 4
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "q6jqiqfxzvcintwzgchl",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Breakeven Price I",
    "topic": "finance",
    "urlEnding": "breakeven-price"
  }
}
```
