# QuantGuide Question

## 749. Simple Delta Hedge II

**Metadata**

- ID: `jHKlf0XccnCXgGmAUc94`
- URL: https://www.quantguide.io/questions/simple-delta-hedge-ii
- Topic: finance
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-10-17 12:58:11 America/New_York
- Last Edited By: Gabe

### 题干

You see that call options have $\Delta = 0.25$ at strike $K = 24$. The underlying has price $S_0 = 21$. You sell $100$ put options at strike $K = 24$. You want to delta-hedge your portfolio. How many units of the underlying should you buy/sell? Enter $-x$ if you should sell $x$ units. 

### Hint

How do we calculate the $\Delta$ of the put? 

### 解答

We first need to obtain the $\Delta$ of the put option. Delta can be interpreted probabilistically as the probability of finishing in-the-money. So, we can see that the $\Delta$ of the put is $-0.75$ (also can use put-call parity). We are selling $100$ units of the option, so we have an overall $\Delta$ of $-0.75 * -1 * 100 = 75$. To hedge this, we need to sell $75$ units of the underlying. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "-75"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "jHKlf0XccnCXgGmAUc94",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-17 12:58:11 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6110228,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Simple Delta Hedge II",
    "topic": "finance",
    "urlEnding": "simple-delta-hedge-ii",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "jHKlf0XccnCXgGmAUc94",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Simple Delta Hedge II",
    "topic": "finance",
    "urlEnding": "simple-delta-hedge-ii"
  }
}
```
