# QuantGuide Question

## 1076. Three-Way Tile

**Metadata**

- ID: `R0kTTigczINRfSZKr7tO`
- URL: https://www.quantguide.io/questions/threeway-tile
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: cmu
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-2 22:30:16 America/New_York
- Last Edited By: Gabe

### 题干

How many ways can you tile a $3 \times 8$ grid with $1 \times 2$ and $2 \times 1$ tiles?

### Hint

Let $t(n)$ be the number of ways of tiling a $3 \times n$ board with these tiles. Consider tiling the first spots all the way at the left. Then, you get a different shape, so let $s(n)$ be the ways to tile that different shape. Condition on the tiling in first column.

### 解答

We are going to solve this for more general $n$. Let $t(n)$ be the number of ways of tiling a $3 \times n$ board with these tiles. Consider tiling the first spots all the way at the left. There are three options:

$$$$

$\textbf{Case 1:}$ You place $3$ $1 \times 2$ tiles in each of the rows. In this case, there are $t(n-2)$ possible ways to tile the remaining grid, as you have eliminated the first two columns.

$$$$

$\textbf{Case 2:}$ You place a $1 \times 2$ tile in the first row and then a $2 \times 1$ tile in the first column bottom two rows OR a $2 \times 1$ tile in first column top two rows and a $1 \times 2$ tile in the bottom row. In both cases here, you end up with a grid that has a corner piece missing. We can just consider one of the two arrangements above and multiply by $2$, as they both yield a grid that has one corner missing. 

$$$$

Let the number of ways to tile the grid with one corner missing and $n$ columns be $s(n)$. Consider tiling the first column of the grid where the corner is missing. You have two cases: 

$$$$

$\textbf{Case 2a:}$ Place a $2 \times 1$ tile in the first column. In this case, you get a grid with no missing corner and $n-1$ columns, so there are $t(n-1)$ ways to tile the remaining grid.

$$$$

$\textbf{Case 2b:}$ Place three $1 \times 2$ tiles in each of the rows. You get another grid with $n-2$ columns and a missing corner, so there are $s(n-2)$ ways to tile the remaining grid. 

$$$$

Combining these together, we get that $s(n) = t(n-1) + s(n-2)$ and $t(n) = t(n-2) + 2s(n-1)$. The boundary conditions are that $t(0) = 1$ (empty grid), $t(1) = 0$ (no way to tile one column grid), $s(0) = 0$ (can't be a missing corner), and $s(1) = 1$ (just a single $2 \times 1$ tile). 

$$$$

We are looking for $t(8)$ in this problem. Using this recurrence, one gets $t(8) = 153$ after some considerable effort.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "153"
    ],
    "companies": [],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "R0kTTigczINRfSZKr7tO",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-2 22:30:16 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8791591,
    "source": "cmu",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Three-Way Tile",
    "topic": "probability",
    "urlEnding": "threeway-tile",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "hard",
    "id": "R0kTTigczINRfSZKr7tO",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Three-Way Tile",
    "topic": "probability",
    "urlEnding": "threeway-tile"
  }
}
```
