# QuantGuide Question

## 235. Cube Pack

**Metadata**

- ID: `fD2doh0Wuteam2hSzzpr`
- URL: https://www.quantguide.io/questions/cube-pack
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Peak6
- Source: peak6 oa,edit
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-8-26 16:23:13 America/New_York
- Last Edited By: Gabe

### 题干

How many $3 \times 3 \times 3$ cubes can be fit inside a cube of dimensions $20 \times 20 \times 20$?

### Hint

Think about the dimension of the small cubes relative to the large ones.

### 解答

In each dimension, we can only fit $6$ of the $3 \times 3 \times 3$ cubes. This is because a $7$th would give us a dimension of length $21 > 20$, which is not contained inside the cube. Therefore, the answer is just $6^3 = 216$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "216"
    ],
    "companies": [
      {
        "company": "Peak6"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "fD2doh0Wuteam2hSzzpr",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 16:23:13 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1868481,
    "source": "peak6 oa,edit",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Cube Pack",
    "topic": "probability",
    "urlEnding": "cube-pack",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Peak6"
      }
    ],
    "difficulty": "easy",
    "id": "fD2doh0Wuteam2hSzzpr",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Cube Pack",
    "topic": "probability",
    "urlEnding": "cube-pack"
  }
}
```
