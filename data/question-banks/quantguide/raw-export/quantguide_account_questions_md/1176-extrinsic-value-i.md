# QuantGuide Question

## 1176. Extrinsic Value I

**Metadata**

- ID: `9LC2OHYzSVYBqXPt5db2`
- URL: https://www.quantguide.io/questions/extrinsic-value-i
- Topic: finance
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-15 09:25:42 America/New_York
- Last Edited By: Gabe

### 题干

We have an underlying $S$ with price $S_0 = 5$. You have a European call option on $S$ with strike $K = 2$, currently with value $C_0 = 4.7$. What is the intrinsic (I) and extrinsic (E) value of the option?

$$\\$$

Give the answer in the format of $I^2 + E^2$.

### Hint

How much would you gain if you could exercise at time-$0$?

### 解答

The intrinsic value of an option is known as the amount you would gain if you $\textit{could}$ exercise at this moment. If you could exercise now, you would gain $\max(S_T - K, 0) = 5 - 2 = 3$. This then leaves $4.7-3=1.7$ as the extrinsic value, or the value present in the option due to time (options with a longer time until expiry have more value, as these options have more potential to expire in-the-money and have real intrinsic value). 

$$$$

This gives us $$3^2 + 1.7^2 = 11.89$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "11.89"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "9LC2OHYzSVYBqXPt5db2",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-15 09:25:42 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9782744,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Extrinsic Value I",
    "topic": "finance",
    "urlEnding": "extrinsic-value-i",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "9LC2OHYzSVYBqXPt5db2",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Extrinsic Value I",
    "topic": "finance",
    "urlEnding": "extrinsic-value-i"
  }
}
```
