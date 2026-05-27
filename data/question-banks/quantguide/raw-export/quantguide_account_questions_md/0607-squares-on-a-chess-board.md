# QuantGuide Question

## 607. Squares on a Chess Board

**Metadata**

- ID: `A0l15BAHsLydO7dOws0i`
- URL: https://www.quantguide.io/questions/squares-on-a-chess-board
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: Kaushik - Variation of rectangles on chess board
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-6 21:26:16 America/New_York
- Last Edited By: Gabe

### 题干

How many squares can be formed from the squares in an $8 \times 8$ square chess board?

### Hint

Start by considering the largest squares we can make and note a pattern.

### 解答

Lets start by considering the largest squares we can make. The largest is an $8 \times 8$ square and there's only one of these on the board. How about $7 \times 7$ squares? Well, by decreasing the dimensions of the squares by one, we allowed for one more movement horizontally and vertically of the square so we have $4$ $7 \times 7$ squares. If we continue this, you will see the pattern that there are $(9-n)^2$ $n \times n$ squares on the board. Thus the answer boils down to $\displaystyle \sum_{n=1}^8n^2=204$. 



### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "204"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "A0l15BAHsLydO7dOws0i",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-6 21:26:16 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4828615,
    "source": "Kaushik - Variation of rectangles on chess board",
    "status": "published",
    "tags": [],
    "title": "Squares on a Chess Board",
    "topic": "brainteasers",
    "urlEnding": "squares-on-a-chess-board",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "A0l15BAHsLydO7dOws0i",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Squares on a Chess Board",
    "topic": "brainteasers",
    "urlEnding": "squares-on-a-chess-board"
  }
}
```
