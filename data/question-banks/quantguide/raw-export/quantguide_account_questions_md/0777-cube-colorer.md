# QuantGuide Question

## 777. Cube Colorer

**Metadata**

- ID: `hofwsgzA2LvRVbrzVLwW`
- URL: https://www.quantguide.io/questions/cube-colorer
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: SIG, Jane Street, Akuna, Citadel
- Source: Edited SIG JS
- Tags: Conditional Probability
- Premium: True
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-2 20:34:11 America/New_York
- Last Edited By: Gabe

### 题干

Dyann paints the outer faces of a $5 \times 5 \times 5$ cube green and then cuts this large cube up into $125$ $1 \times 1 \times 1$ cubes.  One of the cubes is then uniformly at random selected and rolled. Find the probability that this cube shows a green face up.

### Hint

There are $6\cdot 5^2 = 150$ painted sides, as each side has $5^2 = 25$ faces painted.

### 解答

We are going to solve this for a $k \times k \times k$ cube. In particular, there are $6k^2$ painted sides, as each side has $k^2$ faces painted. There are $6k^3$ total faces in the cube, as each of the $k^3$ cubes has $6$ faces. Therefore, the probability that we obtained a painted side when we roll the selected $1\times 1 \times 1$ cube is $\dfrac{6k^2}{6k^3} = \dfrac{1}{k}$. In this case, $k = 5$, so our answer is $\dfrac{1}{5}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/5"
    ],
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "Citadel"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "hofwsgzA2LvRVbrzVLwW",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-2 20:34:11 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6332916,
    "source": "Edited SIG JS",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Cube Colorer",
    "topic": "probability",
    "urlEnding": "cube-colorer",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "Citadel"
      }
    ],
    "difficulty": "easy",
    "id": "hofwsgzA2LvRVbrzVLwW",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Cube Colorer",
    "topic": "probability",
    "urlEnding": "cube-colorer"
  }
}
```
