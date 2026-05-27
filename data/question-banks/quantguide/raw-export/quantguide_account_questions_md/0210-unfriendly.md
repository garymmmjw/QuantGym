# QuantGuide Question

## 210. Unfriendly

**Metadata**

- ID: `XsVWIY1up4vBkMarecK2`
- URL: https://www.quantguide.io/questions/unfriendly
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Old Mission
- Source: OMC OA
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-6 09:50:42 America/New_York
- Last Edited By: Gabe

### 题干

John has $8$ friends. He will invite $5$ to his party. However, two of his friends have beef and they refuse to attend together. How many possible combinations of guests are possible given this constraint?

### Hint

The easiest way to compute this is to calculate the total number of ways to invite people and then remove those that invite both. 

### 解答

The easiest way to compute this is to calculate the total number of ways to invite people and then remove those that invite both. There are $\displaystyle \binom{8}{5} = 56$ total ways to select $5$ people to invite. To count the number of ways with both of the friends that refuse to attend together, fix both of them among the $5$ selected. We then need to select $3$ more from the remaining $6$, so this yields $\displaystyle \binom{6}{3} = 20$ combinations. Therefore, we have $56 - 20 = 36$ ways to invite the people.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "36"
    ],
    "companies": [
      {
        "company": "Old Mission"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "XsVWIY1up4vBkMarecK2",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "lastEditedAt": "2023-9-6 09:50:42 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1627032,
    "source": "OMC OA",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Unfriendly",
    "topic": "probability",
    "urlEnding": "unfriendly",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Old Mission"
      }
    ],
    "difficulty": "easy",
    "id": "XsVWIY1up4vBkMarecK2",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Unfriendly",
    "topic": "probability",
    "urlEnding": "unfriendly"
  }
}
```
