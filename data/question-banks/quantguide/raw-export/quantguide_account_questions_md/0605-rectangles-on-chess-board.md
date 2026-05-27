# QuantGuide Question

## 605. Rectangles on Chess Board

**Metadata**

- ID: `dlt1SDviyHsj3dEgbT2k`
- URL: https://www.quantguide.io/questions/rectangles-on-chess-board
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: Kaushik - Mock Interview
- Tags: Combinatorics
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 13:58:13 America/New_York
- Last Edited By: Gabe

### 题干

How many rectangles can be formed from the squares in an $8 \times 8$ square chess board? Squares also count as rectangles. 

### Hint

How can rectangles be formed as intersections of the sides?

### 解答

Think about what rectangles represent. Rectangles represent two pairs of start and end points (up/down and left/right). When we analyze the problem in this aspect, the problem boils down to choosing a start and end edge out of the lateral and horizontal edge. There are $9$ lateral edges to choose from for the lateral start and ends of the rectangle and $9$ horizontal edges to choose from for the horizontal start and ends of the rectangle. Thus the problem becomes $$\binom{9}{2}^2 = 36^2 = 1296$$


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1296"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "dlt1SDviyHsj3dEgbT2k",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 13:58:13 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4814500,
    "source": "Kaushik - Mock Interview",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Rectangles on Chess Board",
    "topic": "probability",
    "urlEnding": "rectangles-on-chess-board"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "dlt1SDviyHsj3dEgbT2k",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Rectangles on Chess Board",
    "topic": "probability",
    "urlEnding": "rectangles-on-chess-board"
  }
}
```
