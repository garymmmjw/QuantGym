# QuantGuide Question

## 399. Covered Calls I

**Metadata**

- ID: `wFlD4PCWPjy7actMGVbC`
- URL: https://www.quantguide.io/questions/covered-calls-i
- Topic: finance
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 4
- Last Edited: 2023-9-16 18:02:49 America/New_York
- Last Edited By: Gabe

### 题干

You are entering a covered call position on $\$\text{TSLA}$. You buy 100 shares at $\$230$ and sell the Dec call $@10.50$. What is your breakeven for this strategy?

### Hint

How do we lose money in a covered call and what can offset it?

### 解答

When in covered call, we can only lose money when our underlying goes down in value. In this case, we have a $\$10.50$ credit from selling our call, which will offset the losses from our stock going down. So we can lose up to $\$10.50$ on our shares without going in the red overall, so our breakeven point is simply $230-10.5=  219.5$ If the share price falls below $\$219.50$, the credit we gained will not be covering our losses on the underlying any longer.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "219.5"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "wFlD4PCWPjy7actMGVbC",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-16 18:02:49 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3116981,
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Covered Calls I",
    "topic": "finance",
    "urlEnding": "covered-calls-i",
    "version": 4
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "wFlD4PCWPjy7actMGVbC",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Covered Calls I",
    "topic": "finance",
    "urlEnding": "covered-calls-i"
  }
}
```
