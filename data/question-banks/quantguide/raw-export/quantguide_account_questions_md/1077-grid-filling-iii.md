# QuantGuide Question

## 1077. Grid Filling III

**Metadata**

- ID: `jj26lvqmgbC89YWEqHDX`
- URL: https://www.quantguide.io/questions/grid-filling-iii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: Kaushik - Cut the Knot
- Tags: Events, Combinatorics
- Premium: False
- Solution Free: False
- Version: 4
- Last Edited: 2023-9-14 00:41:22 America/New_York
- Last Edited By: Michael

### 题干

We place the integers $1-9$ (inclusive, no replacement) randomly on a $3\times 3$ grid. What is the probability each row, column and diagonal add up to an odd number?


### Hint

How many orientations fit our criteria?

### 解答

There is only one orientation where all the rows, columns, and diagonals add up to odd numbers. This orientation has the even numbers on the corners and the odds filling the rest of the positions. There are $5!$ ways to order the odds and $4!$ ways to order the evens with $9!$ total orderings. Thus our answer is $$\dfrac{5!\cdot4!}{9!} = \dfrac{1}{126}$$


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/126"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "jj26lvqmgbC89YWEqHDX",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-14 00:41:22 America/New_York",
    "lastEditedBy": "Michael",
    "orderId": 8793171,
    "source": "Kaushik - Cut the Knot",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      },
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Grid Filling III",
    "topic": "probability",
    "urlEnding": "grid-filling-iii",
    "version": 4
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "jj26lvqmgbC89YWEqHDX",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Events"
      },
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Grid Filling III",
    "topic": "probability",
    "urlEnding": "grid-filling-iii"
  }
}
```
