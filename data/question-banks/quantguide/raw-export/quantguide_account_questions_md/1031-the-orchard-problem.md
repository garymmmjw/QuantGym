# QuantGuide Question

## 1031. The Orchard Problem

**Metadata**

- ID: `QkzZr1Rp6Eo9goNV5lub`
- URL: https://www.quantguide.io/questions/the-orchard-problem
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: Puzzles_and_Curious_Problems
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-10-1 09:56:30 America/New_York
- Last Edited By: Gabe

### 题干

A market gardener was planting a new orchard. The young trees were arranged in rows so as to form a square, and it was found that there were $146$ trees unplanted. To enlarge the square by an extra row each way, he had to buy $31$ additional trees. How many trees were in the orchard when it was finished? 

### Hint

To make a square of $(n+1)^2$ trees, how many more trees do we need? 

### 解答

Let $n$ be the number of trees on each side of the square of already planted trees. Then, there are $n^2$ trees in that square.

From the Odd Number Theorem, to make a square of $(n + 1)^2$ trees, we need $2n + 1$ more trees. We are told that we need $146 + 31 = 177$ more trees. Then, we have that $177 = 2 * 88 + 1$, and so $n = 88$. So, the total number of trees in the new orchard is $(88+1)^2 = 89^2 = 7921$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "7921"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "QkzZr1Rp6Eo9goNV5lub",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-1 09:56:30 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8379340,
    "source": "Puzzles_and_Curious_Problems",
    "status": "published",
    "tags": [],
    "title": "The Orchard Problem",
    "topic": "brainteasers",
    "urlEnding": "the-orchard-problem",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "QkzZr1Rp6Eo9goNV5lub",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "The Orchard Problem",
    "topic": "brainteasers",
    "urlEnding": "the-orchard-problem"
  }
}
```
