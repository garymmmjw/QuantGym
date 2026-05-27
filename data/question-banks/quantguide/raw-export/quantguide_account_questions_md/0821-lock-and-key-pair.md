# QuantGuide Question

## 821. Lock and Key Pair

**Metadata**

- ID: `5tA6vNN0GEVKGVYaMCge`
- URL: https://www.quantguide.io/questions/lock-and-key-pair
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 1
- Companies: DE Shaw
- Source: https://www.theguardian.com/science/2016/dec/05/did-you-solve-it-are-you-smarter-than-a-singaporean-ten-year-old
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-7 13:11:37 America/New_York
- Last Edited By: Gabe

### 题干

There are $5$ keys that unlock exactly one of $5$ locks. Assuming an optimal strategy, what is the maximum number of times you need to try the locks to identify which key unlocks each lock?

### Hint

Try $4$ of the keys on the first lock.

### 解答

Try $4$ of the keys on the first lock. If any work, then we can stop early. However, the worst case scenario is that the one we don't test is the one that works, in which we would attempt all $4$ keys. Similarly, of the $4$ remaining unassigned keys, pick $3$ of them to test. Repeat this with $3$ locks and $2$ locks left to yield $2$ and $1$ attempts, respectively. Therefore, we need to try the locks a total of $4 + 3 + 2 + 1 = 10$ times.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "10"
    ],
    "companies": [
      {
        "company": "DE Shaw"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "5tA6vNN0GEVKGVYaMCge",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 13:11:37 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6737224,
    "source": "https://www.theguardian.com/science/2016/dec/05/did-you-solve-it-are-you-smarter-than-a-singaporean-ten-year-old",
    "status": "published",
    "tags": [],
    "title": "Lock and Key Pair",
    "topic": "brainteasers",
    "urlEnding": "lock-and-key-pair",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "DE Shaw"
      }
    ],
    "difficulty": "easy",
    "id": "5tA6vNN0GEVKGVYaMCge",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Lock and Key Pair",
    "topic": "brainteasers",
    "urlEnding": "lock-and-key-pair"
  }
}
```
