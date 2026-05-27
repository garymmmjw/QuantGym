# QuantGuide Question

## 306. Poor Odds

**Metadata**

- ID: `SrS76aIqI87p6FLZTNhT`
- URL: https://www.quantguide.io/questions/poor-odds
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: Wackerly
- Tags: Events
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-6 10:51:08 America/New_York
- Last Edited By: Gabe

### 题干

Angelina is playing a game which she wins with probability $0.1$. She must pay $10$ to play, and if she wins, she receives $80$. If Angelina starts out with $30$, to the nearest thousandth, what is the probability that she wins exactly once before losing it all? 

### Hint

In the case that Angelina loses all her money after winning exactly once, Angelina must have played exactly 11 games.

### 解答

In the case that Angelina loses all her money after winning exactly once, Angelina must have played exactly 11 games. Moreover, Angelina must have won within the first three rounds; there are three possible ways for Angelina to satisfy this condition. Hence, our answer is $(0.1)(0.9)^{10} \cdot 3 \approx 0.105$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0.105"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "SrS76aIqI87p6FLZTNhT",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-6 10:51:08 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2385891,
    "source": "Wackerly",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Poor Odds",
    "topic": "probability",
    "urlEnding": "poor-odds",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "SrS76aIqI87p6FLZTNhT",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Poor Odds",
    "topic": "probability",
    "urlEnding": "poor-odds"
  }
}
```
