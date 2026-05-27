# QuantGuide Question

## 690. Infected Dinner I

**Metadata**

- ID: `VAFns1olcy7wq4yk7WEJ`
- URL: https://www.quantguide.io/questions/infected-dinner-i
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Jane Street
- Source: js txt
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-8-29 23:42:23 America/New_York
- Last Edited By: Gabe

### 题干

There are $1000$ people having dinner at a grand hall. One of them is known to be sick, while the other $999$ are healthy. Each minute, each person talks to one other person in the room at random. There is no limit on how many times a person talks to another person. If one is sick and one is healthy, the healthy person is infected and becomes sick. Once a person becomes sick, they are assumed to be sick for the rest of the dinner. Find the minimum amount of time (in minutes) until every person in the hall becomes sick.

### Hint

The minimum amount of time would correspond to the most people becoming infected the fastest. This would be when each infected person talks to a healthy person at every step.

### 解答

The minimum amount of time would correspond to the most people becoming infected the fastest. This would be when each infected person talks to a healthy person at every step. After $1$ minute, there would be $2$ infected people. After $2$ minutes, there would be $4$ infected people, as each of the $2$ infected people talks to someone healthy. In general, after $n$ minutes, there would be $2^n$ infected people. We now just have to find the minimum $n$ such that $2^n > 1000$, which is just $n = 10$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "10"
    ],
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "VAFns1olcy7wq4yk7WEJ",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-29 23:42:23 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5627710,
    "source": "js txt",
    "status": "published",
    "tags": [],
    "title": "Infected Dinner I",
    "topic": "brainteasers",
    "urlEnding": "infected-dinner-i",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "easy",
    "id": "VAFns1olcy7wq4yk7WEJ",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Infected Dinner I",
    "topic": "brainteasers",
    "urlEnding": "infected-dinner-i"
  }
}
```
