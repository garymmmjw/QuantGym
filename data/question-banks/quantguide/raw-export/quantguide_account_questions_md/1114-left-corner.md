# QuantGuide Question

## 1114. Left Corner

**Metadata**

- ID: `tjwB0C7S9qCk6pyjc9Cj`
- URL: https://www.quantguide.io/questions/left-corner
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: original
- Tags: Conditional Probability
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-27 10:35:38 America/New_York
- Last Edited By: Gabe

### 题干

A pawn on an $8\times 8$ chess board starts in the top left corner. In each move, the pawn is allowed to move one square in any direction, including diagonally, as long as it stays on the board. Each legal move on a given turn has equal probability of being selected. Find the probability that in exactly two movements the pawn is back in the top left corner.

### Hint

In the top left, it can move to $3$ spots. Two of those spots will be along the edge of the board, which will have $5$ valid spots to move from there. One is a central spot on the board, which has 8 valid spots to move. 

### 解答

In the top left, it can move to $3$ spots. Two of those spots will be along the edge of the board, which will have $5$ valid spots to move from there. One is a central spot on the board, which has 8 valid spots to move. 

$$$$

The probability of moving to an edge spot is $\dfrac{2}{3}$, while the probability of moving to a central spot is $\dfrac{1}{3}$. From an edge spot, there is a $\dfrac{1}{5}$ probability of return to the corner. From the central spot, there is an $\dfrac{1}{8}$ probability of return to the corner. Thus, the probability of return to the corner in 2 moves is just $\dfrac{2}{3} \cdot \dfrac{1}{5} + \dfrac{1}{3} \cdot \dfrac{1}{8} = \dfrac{7}{40}$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "7/40"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "tjwB0C7S9qCk6pyjc9Cj",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-27 10:35:38 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9111132,
    "source": "original",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Left Corner",
    "topic": "probability",
    "urlEnding": "left-corner",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "tjwB0C7S9qCk6pyjc9Cj",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Left Corner",
    "topic": "probability",
    "urlEnding": "left-corner"
  }
}
```
