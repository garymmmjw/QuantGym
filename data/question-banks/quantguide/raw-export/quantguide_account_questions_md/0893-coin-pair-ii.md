# QuantGuide Question

## 893. Coin Pair II

**Metadata**

- ID: `1ym9np3c7kSl00wFxyCO`
- URL: https://www.quantguide.io/questions/coin-pair-ii
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Jane Street
- Source: Jane Street
- Tags: Combinatorics
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-14 00:41:58 America/New_York
- Last Edited By: Michael

### 题干

Four fair coins appear in front of you. You flip all four at once and observe the outcomes of the coins. After seeing the outcomes, you may flip any pair of coins again unlimited amounts of times. You may not flip a single coin without flipping another. Assuming optimal play, find the expected number of heads that appear.

### Hint

Can you always obtain $HH$ from any pair?

### 解答

For each pair we flip again, we have a positive probability of obtaining $2$ heads. If we are to flip every pair of coins, regardless of the initial outcome, enough times, we would end with all heads. Therefore, the answer is just $4$, as with probability $1$, we will obtain $HHHH$ at some point. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "4"
    ],
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "1ym9np3c7kSl00wFxyCO",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-14 00:41:58 America/New_York",
    "lastEditedBy": "Michael",
    "orderId": 7325491,
    "randomizable": "",
    "source": "Jane Street",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Coin Pair II",
    "topic": "probability",
    "urlEnding": "coin-pair-ii",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "easy",
    "id": "1ym9np3c7kSl00wFxyCO",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Coin Pair II",
    "topic": "probability",
    "urlEnding": "coin-pair-ii"
  }
}
```
