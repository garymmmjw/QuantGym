# QuantGuide Question

## 330. Green Ball Draw

**Metadata**

- ID: `RwIXACEsh0Iw5g8ZUnxn`
- URL: https://www.quantguide.io/questions/green-ball-draw
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: TQD
- Tags: Combinatorics, Events
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-8-26 14:26:10 America/New_York
- Last Edited By: Gabe

### 题干

$$3$ green and $7$ blue balls are in an urn. You draw out 2 balls without replacement and note the second is blue. Find the probability that the first was green.

### Hint

Note that sampling without replacement is an exchangeable process.

### 解答

Note that sampling without replacement is an exchangeable process. Therefore, this probability is the same as if we were to draw a blue on the first draw and want the probability the second is green. If the first ball is blue, then there are $3$ green and $6$ blue balls in the urn left. Therefore, the probability the second is green is $\dfrac{3}{9} = \dfrac{1}{3}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/3"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "RwIXACEsh0Iw5g8ZUnxn",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 14:26:10 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2544252,
    "source": "TQD",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Events"
      }
    ],
    "title": "Green Ball Draw",
    "topic": "probability",
    "urlEnding": "green-ball-draw",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "RwIXACEsh0Iw5g8ZUnxn",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Events"
      }
    ],
    "title": "Green Ball Draw",
    "topic": "probability",
    "urlEnding": "green-ball-draw"
  }
}
```
