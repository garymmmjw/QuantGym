# QuantGuide Question

## 448. Tic Tac Toe

**Metadata**

- ID: `5VQKsnNUZujdlCWfc7qA`
- URL: https://www.quantguide.io/questions/tic-tac-toe
- Topic: probability
- Difficulty: medium
- Internal Difficulty: N/A
- Companies: N/A
- Source: N/A
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

In a standard $3 \times 3$ tie tac toe grid, a player wins when they have 3 of their symbol (either $X$ or $O$) in a row, column, or upon one of the two diagonals, yielding 8 possible winning paths. How many winning paths are there in $4 \times 4 \times 4$ 3D tic tac toe grid? The winning condition is that a player must have 4 of their symbol in a line, which includes diagonally and vertically down. 

### Hint

Embed the $4 \times 4 \times 4$ cube in the larger $6 \times 6 \times 6$ cube.

### 解答

Embed the $4 \times 4 \times 4$ cube in the larger $6 \times 6 \times 6$ cube. Every winning path of the $4 \times 4 \times 4$ cube corresponds to ending at two unique ending squares on the surface of the $6 \times 6 \times 6$ cube when extending those paths out to the larger cube. To visualize this, try this with a standard 2D $3 \times 3$ tic tac toe grid embedded in a $5 \times 5$ grid and extend out the winning paths. Therefore, for each path, we can put it in two-to-one correspondence with one of the $6^3 - 4^3 = 152$ cubes on the surface of the larger cube. It is a two-to-one correspondence since each path ends at two unique points on the surface of the larger cube. Therefore, the total number of paths must be $\dfrac{152}{2} = 76$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "76"
    ],
    "difficulty": "medium",
    "id": "5VQKsnNUZujdlCWfc7qA",
    "internalDifficulty": 0,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 3569760,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Tic Tac Toe",
    "topic": "probability",
    "urlEnding": "tic-tac-toe"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "5VQKsnNUZujdlCWfc7qA",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Tic Tac Toe",
    "topic": "probability",
    "urlEnding": "tic-tac-toe"
  }
}
```
