# QuantGuide Question

## 715. The Last Roll

**Metadata**

- ID: `ngw5ZDGyWmAnTj9fxkCV`
- URL: https://www.quantguide.io/questions/the-last-roll
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Optiver, SIG
- Source: N/A
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-4 20:53:37 America/New_York
- Last Edited By: Gabe

### 题干

A fair $6-$sided die is continually rolled until the sum of all the numbers is at least $1000$. What value on the die was most likely to show up on the last roll? 

### Hint

What current sums can reach $1000$ if the last die roll is $i$, $1 \leq i \leq 6$?

### 解答

This is because $6$ can reach $1000$ from a current sum of anything between $994-999$. Conversely, a $1$ only works if the current sum is $999$. Having a smaller value on the last roll reduces the possibilities of the previous sums before exceeding $1000$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "6"
    ],
    "companies": [
      {
        "company": "Optiver"
      },
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "ngw5ZDGyWmAnTj9fxkCV",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-4 20:53:37 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5819837,
    "source": "",
    "status": "published",
    "tags": [],
    "title": "The Last Roll",
    "topic": "brainteasers",
    "urlEnding": "the-last-roll",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Optiver"
      },
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "id": "ngw5ZDGyWmAnTj9fxkCV",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "The Last Roll",
    "topic": "brainteasers",
    "urlEnding": "the-last-roll"
  }
}
```
