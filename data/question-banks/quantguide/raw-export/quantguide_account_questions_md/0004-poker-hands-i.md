# QuantGuide Question

## 4. Poker Hands I

**Metadata**

- ID: `M8tdhi4jgganawYZwFmi`
- URL: https://www.quantguide.io/questions/poker-hands-i
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: DRW
- Source: N/A
- Tags: Combinatorics, Events
- Premium: False
- Solution Free: False
- Version: 4
- Last Edited: 2023-11-4 23:21:08 America/New_York
- Last Edited By: Gabe

### 题干

A poker hand consists of five cards from a standard deck of $52$ cards. If $p$ is the probability that you have a four-of-a-kind (four of the five cards have the same rank), find the reciprocal of $p$.

### Hint

How many ways can you pick $4$ cards of the same rank?

### 解答

There are a total of ${52 \choose 5}$ total hand combinations. To count the number of hands that contain a four-of-a-kind, we can break the problem down into the four cards that have the same value and the fifth card. The value that is shared amongst four of them can be any of the 13 faces. The fifth card can be any of the 48 remaining cards left in the deck. Thus, the probability that you have a four-of-a-kind is:
$$\frac{13 \times 48}{{52 \choose 5}}=\frac{1}{4165}$$ Therefore, the answer to the question is $4165$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "4165"
    ],
    "companies": [
      {
        "company": "DRW"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "M8tdhi4jgganawYZwFmi",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-4 23:21:08 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 14,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Events"
      }
    ],
    "title": "Poker Hands I",
    "topic": "probability",
    "urlEnding": "poker-hands-i",
    "version": 4
  },
  "list_summary": {
    "companies": [
      {
        "company": "DRW"
      }
    ],
    "difficulty": "easy",
    "id": "M8tdhi4jgganawYZwFmi",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Events"
      }
    ],
    "title": "Poker Hands I",
    "topic": "probability",
    "urlEnding": "poker-hands-i"
  }
}
```
