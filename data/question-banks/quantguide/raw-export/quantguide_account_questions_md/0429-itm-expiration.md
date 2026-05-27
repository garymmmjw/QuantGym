# QuantGuide Question

## 429. ITM Expiration

**Metadata**

- ID: `wHCVVLmKxIO5T9XCeN5d`
- URL: https://www.quantguide.io/questions/itm-expiration
- Topic: finance
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: True
- Solution Free: False
- Version: 3
- Last Edited: 2023-9-30 23:13:29 America/New_York
- Last Edited By: Gabe

### 题干

Consider a vanilla call and a vanilla put option on an underlying stock $S$, with strike $K = 15$ following GBM dynamics. The risk-neutral probability that the put expires in the money is $0.42$. What is the risk-neutral probability that the call expires in-the-money?



### Hint

What is the probability that the put expires out-of-the-money? 

### 解答

If the put expires out-of-the-money, this means that the call must expire in-the-money. The probability that the put expires out-of-the-money is $1 - 0.42 = 0.58$ as the put must expire either ITM or OTM. Then, the probability that the call expires in-the-money is also $0.58$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      ".58"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "wHCVVLmKxIO5T9XCeN5d",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 23:13:29 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3438888,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "ITM Expiration",
    "topic": "finance",
    "urlEnding": "itm-expiration",
    "version": 3
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "wHCVVLmKxIO5T9XCeN5d",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "ITM Expiration",
    "topic": "finance",
    "urlEnding": "itm-expiration"
  }
}
```
