# QuantGuide Question

## 453. Leg Count

**Metadata**

- ID: `lEer6ZC1uUGTFAJPtHja`
- URL: https://www.quantguide.io/questions/leg-count
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 1
- Companies: SIG
- Source: glassdoor
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-26 11:08:46 America/New_York
- Last Edited By: Gabe

### 题干

A group of chickens ($2$ legs), cows ($4$ legs), and spiders ($8$ legs) are hanging out. There are a total of $440$ legs between all of them. There are twice as many chickens as cows and twice as many spiders as chickens. How many spiders are there?

### Hint

Let $x$ be the number of cows. Then $2x$ is the number of chickens and $2(2x) = 4x$ is the number of spiders.

### 解答

Let $x$ be the number of cows. Then $2x$ is the number of chickens and $2(2x) = 4x$ is the number of spiders. Therefore, with $x$ cows, there are $4x + 2(2x) + 8(4x) = 40x$ legs. Therefore, $40x = 440$, so $x = 11$. The number of spiders then is $4\cdot 11 = 44$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "44"
    ],
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "lEer6ZC1uUGTFAJPtHja",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-26 11:08:46 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3599094,
    "source": "glassdoor",
    "status": "published",
    "tags": [],
    "title": "Leg Count",
    "topic": "brainteasers",
    "urlEnding": "leg-count",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "id": "lEer6ZC1uUGTFAJPtHja",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Leg Count",
    "topic": "brainteasers",
    "urlEnding": "leg-count"
  }
}
```
