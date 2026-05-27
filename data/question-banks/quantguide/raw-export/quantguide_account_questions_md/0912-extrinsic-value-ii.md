# QuantGuide Question

## 912. Extrinsic Value II

**Metadata**

- ID: `Pv9PyuouA6YI6SNqlUQS`
- URL: https://www.quantguide.io/questions/extrinsic-value-ii
- Topic: finance
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-15 09:26:20 America/New_York
- Last Edited By: Gabe

### 题干

We have an underlying $S$ with price $S_0 = 17$. You have a European put option on $S$ with strike $K = 15$, currently with value $P_0 = 7.2$. What is the intrinsic (I) and extrinsic (E) value of the option?

$$\\$$

Give the answer in the format of $I^2 + E^2$.

### Hint

How much would you gain if you could exercise at time-$0$?

### 解答

The intrinsic value is the amount that you would gain if you could exercise at time-$0$. Here, we have strike $K=15$, so the payout of the put is $\max(15-S_0, 0) = \max(15-17,0) = 0$. So, we have $0$ intrinsic value and the option price comes entirely from the time-value. 

$$I^2 + E^2 = 0^2 + 7.2^2 = 51.84$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "51.84"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "Pv9PyuouA6YI6SNqlUQS",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-15 09:26:20 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7471610,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Extrinsic Value II",
    "topic": "finance",
    "urlEnding": "extrinsic-value-ii",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "Pv9PyuouA6YI6SNqlUQS",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Extrinsic Value II",
    "topic": "finance",
    "urlEnding": "extrinsic-value-ii"
  }
}
```
