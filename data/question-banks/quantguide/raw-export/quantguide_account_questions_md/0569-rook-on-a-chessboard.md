# QuantGuide Question

## 569. Rook on a Chessboard

**Metadata**

- ID: `LdnfvfelYDhwJXsbwZDh`
- URL: https://www.quantguide.io/questions/rook-on-a-chessboard
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-9 23:25:56 America/New_York
- Last Edited By: Gabe

### 题干

Consider a standard chessboard where there is a rook in the bottom right corner. Here, the rook can move in straight lines upwards or to the left. You and your friend are playing a game where you take turns moving the rook. The winner of the game will be the one that moves the rook to the top-left square. If you are to guarantee a win, should you go first or second? Enter $1$ for first and $2$ for second.



### Hint

Consider the case of $2$ x $2$ chessboard.

### 解答

Consider the case of $2$ x $2$ chessboard. For you to win, the rook must be on the top-right square or the bottom-left square. Player $1$ has no choice but to move the rook onto one of those squares, and you will always win. 

We can expand this to bigger chessboards by ensuring that you always move the rook to a position that is diagonal to the top-left square. This gives a diagonal line from the bottom-right square to the top-left square of $\textit{safe}$ squares. If you move the rook to one of these squares, you are guaranteed to win. Thus, however Player $1$ moves, you will move the rook to the corresponding square on the diagonal.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "LdnfvfelYDhwJXsbwZDh",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-9 23:25:56 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4587983,
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Rook on a Chessboard",
    "topic": "brainteasers",
    "urlEnding": "rook-on-a-chessboard",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "LdnfvfelYDhwJXsbwZDh",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Rook on a Chessboard",
    "topic": "brainteasers",
    "urlEnding": "rook-on-a-chessboard"
  }
}
```
