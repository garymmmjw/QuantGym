# QuantGuide Question

## 720. Theater Seating

**Metadata**

- ID: `eGGzOOoUWHaVy153vYec`
- URL: https://www.quantguide.io/questions/theater-seating
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: N/A
- Companies: N/A
- Source: N/A
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Five boys and five girls are seated in a row at the movie theater. To ensure that the children are engaged during the movie, the teacher mandates that no two children of the same gender can sit next to each other. How many arrangements are possible?

### Hint

Where can the boys sit, and how does this affect where the girls can sit? How many possible arrangements are there for the boys and how many possible arrangements are there for the girls?

### 解答

There are two possible choices of seats where the boys can sit (either positions 1, 3, 5, 7, 9 or 2, 4, 6, 8, 10); the girls must choose the other. For each choice, there are $5!$ possible permutations of the boys and $5!$ permutations of the girls. Thus, the total number of seating arrangements is: $$2 \times (5!)^2 = 28800$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "28800"
    ],
    "difficulty": "easy",
    "id": "eGGzOOoUWHaVy153vYec",
    "internalDifficulty": 0,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 5875045,
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Theater Seating",
    "topic": "brainteasers",
    "urlEnding": "theater-seating"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "eGGzOOoUWHaVy153vYec",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Theater Seating",
    "topic": "brainteasers",
    "urlEnding": "theater-seating"
  }
}
```
