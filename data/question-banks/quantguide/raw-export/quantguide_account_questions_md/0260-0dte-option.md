# QuantGuide Question

## 260. 0DTE Option

**Metadata**

- ID: `ef1V2umyGkq7I5uvyTSm`
- URL: https://www.quantguide.io/questions/0dte-option
- Topic: finance
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-10-22 09:47:28 America/New_York
- Last Edited By: Gabe

### 题干

You have a call option on the underlying, $S$ with a current price of $S_0 = 5$. You have a call option with initial price $C_0 = 0.3$ and strike $K = 25$. The option expires in an hour and has a charm of $-0.04$. If the underlying moves down by $\$0.5$ in the next minute, what is an approximation for the price of the option? 

### Hint

What can we approximate the $\Gamma$ and $\Delta$ to be? We are dealing with an option that expires very quickly. 

### 解答

We know that the $\Delta$ for OTM options near-expiry is close to $0$ and so is the $\Gamma$. The charm represents the decay in $\Delta$. The $-0.04$ represents that the delta is already very close to $0$ as if nothing were to happen in the next hour, then the $\Delta$ would decrease by $0.04$ to $0$. This means that we can approximate the $\Delta = 0.04$ as we are dealing with an extremely short expiry. 

$$\\$$

Since the $\Gamma$ is approximately $0$, we are moving further away from the strike and so the option price should decrease by $0.04$. This gives a price of $0.26$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0.26"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "ef1V2umyGkq7I5uvyTSm",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-22 09:47:28 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2029474,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "0DTE Option",
    "topic": "finance",
    "urlEnding": "0dte-option",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "ef1V2umyGkq7I5uvyTSm",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "0DTE Option",
    "topic": "finance",
    "urlEnding": "0dte-option"
  }
}
```
