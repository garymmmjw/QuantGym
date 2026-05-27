# QuantGuide Question

## 926. ATM Expiration

**Metadata**

- ID: `xHgyJXfJ0XLID2I47h5S`
- URL: https://www.quantguide.io/questions/atm-expiration
- Topic: finance
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: True
- Solution Free: False
- Version: 2
- Last Edited: 2023-10-7 08:54:43 America/New_York
- Last Edited By: Gabe

### 题干

You have a European call option with a $\Delta = 0.67$ of strike $K$ and expiry $T$. Approximate the probability for a put of strike $K$ and expiry $T$ of expiring in-the-money. 

### Hint

What is the probabilistic interpretation of $\Delta$?

### 解答

Since $\Delta \in [0,1]$, this essentially acts as a probability of an option expiring in-the-money. Intuitively, this makes sense. An at-the-money option has $\Delta \approx 0.5$. The probability of the call expiring in-the-money is $0.67$, meaning that the probability it expires out-of-the-money is $0.33$, which is the same probability as a put expiring in-the-money. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      ".33"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "xHgyJXfJ0XLID2I47h5S",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-7 08:54:43 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7569088,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "ATM Expiration",
    "topic": "finance",
    "urlEnding": "atm-expiration",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "xHgyJXfJ0XLID2I47h5S",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "ATM Expiration",
    "topic": "finance",
    "urlEnding": "atm-expiration"
  }
}
```
