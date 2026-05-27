# QuantGuide Question

## 642. 2D Paths IV

**Metadata**

- ID: `4XkHNWXtMDBKxHbyqmbL`
- URL: https://www.quantguide.io/questions/2d-paths-iv
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: N/A
- Tags: Combinatorics
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 13:30:36 America/New_York
- Last Edited By: Gabe

### 题干

How many paths are there where you can only move up or right one unit at each step that go from $(0,0)$ to $(5,3)$ without crossing the line $y = x$? You are allowed to touch it.

### Hint

Note that if the $y = x$ line is crossed, which runs from $(0,0)$ to $(3,3)$ inside the grid, then we will touch the diagonal that runs from $(-1,0)$ to $(2,3)$. 

### 解答

From 2D Grids I, we know that there are a total of $\displaystyle \binom{8}{3} = 56$ total paths from $(0,0)$ to $(5,3)$ with no restrictions. Now, we want to remove those that don't satisfy our restriction.

$$$$

Note that if the $y = x$ line is crossed, which runs from $(0,0)$ to $(3,3)$ inside the grid, then we will touch the diagonal that runs from $(-1,0)$ to $(2,3)$. Now, for each path that does touch this new diagonal, reflect the part that comes before the first touch across that diagonal. In specific, we now that have $(0,0)$ reflects to $(-1,1)$ and each path that touches this new diagonal corresponds to a unique path from $(-1,1)$ to $(5,3)$. There are $\displaystyle \binom{8}{2} = 28$ such paths, so our total number of paths that don't cross our original diagonal is $56 - 28 = 28$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "28"
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "4XkHNWXtMDBKxHbyqmbL",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 13:30:36 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5114002,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "2D Paths IV",
    "topic": "probability",
    "urlEnding": "2d-paths-iv"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "hard",
    "id": "4XkHNWXtMDBKxHbyqmbL",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "2D Paths IV",
    "topic": "probability",
    "urlEnding": "2d-paths-iv"
  }
}
```
