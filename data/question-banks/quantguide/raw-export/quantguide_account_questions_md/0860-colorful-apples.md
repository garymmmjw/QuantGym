# QuantGuide Question

## 860. Colorful Apples

**Metadata**

- ID: `zwjgTvMkYOEm9Yi5xZ9F`
- URL: https://www.quantguide.io/questions/colorful-apples
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: WorldQuant
- Source: WorldQuant glassdoor
- Tags: Expected Value
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 14:01:25 America/New_York
- Last Edited By: Gabe

### 题干

There are 4 green and 50 red apples in a basket. They are removed one-by-one, without replacement, until all 4 green ones are extracted. What is the expected number of apples that will be left in the basket?

### Hint

Use a First Ace approach with the aces as Apples.

### 解答

Note that the $4$ green apples divide up the other $50$ red apples into $5$ regions. Since we have no other information about these regions, in expectation, they are equally-sized. Therefore, we would expect $10$ apples per region. In particular, exactly one region comes after the last green apple, so we would expect $10$ red apples to be left after drawing the last green apple.


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "10"
    ],
    "companies": [
      {
        "company": "WorldQuant"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "zwjgTvMkYOEm9Yi5xZ9F",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 14:01:25 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7038280,
    "source": "WorldQuant glassdoor",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Colorful Apples",
    "topic": "probability",
    "urlEnding": "colorful-apples"
  },
  "list_summary": {
    "companies": [
      {
        "company": "WorldQuant"
      }
    ],
    "difficulty": "medium",
    "id": "zwjgTvMkYOEm9Yi5xZ9F",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Colorful Apples",
    "topic": "probability",
    "urlEnding": "colorful-apples"
  }
}
```
