# QuantGuide Question

## 954. Rabbit Hop I

**Metadata**

- ID: `5DJ88XI44F5uXSEehNEs`
- URL: https://www.quantguide.io/questions/rabbit-hop-i
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Five Rings
- Source: 5r r2
- Tags: Combinatorics
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-15 00:42:43 America/New_York
- Last Edited By: Gabe

### 题干

A rabbit starts at the floor in front of a staircase of $10$ stairs. The rabbit can hop up any amount of stairs at each move. How many distinct paths are there from the floor to the top of the staircase (i.e. to the top of the $10$th stair)?

### Hint

Can you relate paths to subsets of $\{1,2,\dots,9\}$?

### 解答

Each path can be described as selecting a subset of $\{1,2,\dots,9\}$ for the rabbit to land on. This is because we can identify any path uniquely by which stairs the rabbit lands on. Thus, there are $2^9 = 512$ subsets of $\{1,2,\dots,9\}$, so $512$ is our answer.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "512"
    ],
    "companies": [
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "5DJ88XI44F5uXSEehNEs",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-15 00:42:43 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7793151,
    "randomizable": "",
    "source": "5r r2",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Rabbit Hop I",
    "topic": "probability",
    "urlEnding": "rabbit-hop-i",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "easy",
    "id": "5DJ88XI44F5uXSEehNEs",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Rabbit Hop I",
    "topic": "probability",
    "urlEnding": "rabbit-hop-i"
  }
}
```
