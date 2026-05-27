# QuantGuide Question

## 579. Bus Wait I

**Metadata**

- ID: `pF0ZYYUt7qTcKfr0kKru`
- URL: https://www.quantguide.io/questions/bus-wait-i
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Jane Street, Goldman Sachs
- Source: js gd
- Tags: Expected Value, Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-7 12:31:06 America/New_York
- Last Edited By: Gabe

### 题干

You are waiting for a bus to get to QuantGuide on time! The bus runs on a fixed schedule of appearing every $10$ minutes. If you arrive at a uniformly random time throughout the day, what is the expected time until the next bus appears (in minutes)?

### Hint

What is the distribution of the time until the next bus?

### 解答

As you show up at a uniformly random time throughout the day, the time until the next bus is just uniformly distributed between $0$ and $10$ minutes. Therefore, the answer is just $5$, as that is the mean of this random variable.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "5"
    ],
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "pF0ZYYUt7qTcKfr0kKru",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 12:31:06 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4632696,
    "randomizable": "",
    "source": "js gd",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Bus Wait I",
    "topic": "probability",
    "urlEnding": "bus-wait-i",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "easy",
    "id": "pF0ZYYUt7qTcKfr0kKru",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Bus Wait I",
    "topic": "probability",
    "urlEnding": "bus-wait-i"
  }
}
```
