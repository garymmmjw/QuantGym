# QuantGuide Question

## 497. Builders

**Metadata**

- ID: `6KkheBhD4WwVkitLog9P`
- URL: https://www.quantguide.io/questions/builders
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 2
- Companies: SIG, IMC, TransMarket Group
- Source: N/A
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-8 10:04:16 America/New_York
- Last Edited By: Gabe

### 题干

Alice and Bob can each build a pipe on their own in $120$ and $100$ minutes, respectively. Instead, they work together on building a pipe. After 40 minutes of building, Charlie assists them in building the pipe. Together, they finish building the pipe $10$ minutes after Charlie joins. In how many minutes could Charlie build the pipe on his own?

### Hint

Consider the rate at which each person builds and suppose a scenario where 600 units must be built to fully create the pipe. It follows then that Alice builds at $5$ units per minute and Bob builds at $6$ units per minute (indeed, their respective completion times are $120$ and $100$ minutes). How does Charlie affect this process?

### 解答

Suppose 600 total units need to be built to fully create the pipe. It follows then that Alice builds at $5$ units per minute and Bob builds at $6$ units per minute (indeed, their respective completion times are $120$ and $100$ minutes). After 40 minutes, Alice and Bob together would have completed $40 \cdot (5 + 6)  = 440$ of the $600$ units. After Charlie joins, they complete the remaining $160$ units in $10$ minutes, meaning that they were building at a rate of $16$ units per minute with all three working. As they were at $11$ per minute before Charlie joined, this means Charlie builds at $5$ units per minute, the same rate as Alice, so Charlie also would take $120$ minutes to build the pipe on his own.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "120"
    ],
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "IMC"
      },
      {
        "company": "TransMarket Group"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "6KkheBhD4WwVkitLog9P",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-8 10:04:16 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3955637,
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Builders",
    "topic": "brainteasers",
    "urlEnding": "builders",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "IMC"
      },
      {
        "company": "TransMarket Group"
      }
    ],
    "difficulty": "medium",
    "id": "6KkheBhD4WwVkitLog9P",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Builders",
    "topic": "brainteasers",
    "urlEnding": "builders"
  }
}
```
