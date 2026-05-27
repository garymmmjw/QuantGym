# QuantGuide Question

## 843. Grid Filling I

**Metadata**

- ID: `9WLxbzr6453pupf8FbZj`
- URL: https://www.quantguide.io/questions/grid-filling-i
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Combinatorics
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-8 17:25:10 America/New_York
- Last Edited By: Gabe

### 题干

The integers 1 through 9 are randomly placed into the 9 squares of a 3 x 3 grid such that each square has one integer and each integer is used once. What is the probability that the sum of each row and each column is even?

### Hint

Try a few cases and understand how the Pigeonhole Principle may be useful.

### 解答

This is not possible. There are 5 odd and 4 even numbers, and for three numbers to sum to an even number, either one or three of the numbers must be even. In other words, we cannot have any row or column with two evens. Looking at the columns, by Pigeonhole Principle, there must be at least one column with all even numbers, because there are four even numbers for three columns, and no column can have only two even numbers as noted. However, once a column is stacked with three even numbers, the last even number will necessarily cause a row to have two even numbers, and thus that row will sum to an odd. Because there are no possible combinations where the sum of each row and column is even, the probability that the sum of each row and column is even is 0.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0"
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "9WLxbzr6453pupf8FbZj",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "lastEditedAt": "2023-9-8 17:25:10 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6908470,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Grid Filling I",
    "topic": "probability",
    "urlEnding": "grid-filling-i",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "9WLxbzr6453pupf8FbZj",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Grid Filling I",
    "topic": "probability",
    "urlEnding": "grid-filling-i"
  }
}
```
