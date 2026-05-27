# QuantGuide Question

## 220. Better in Red I

**Metadata**

- ID: `45mIYBA5bMhHpwXgxiQs`
- URL: https://www.quantguide.io/questions/better-in-red-i
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Five Rings, Hudson River Trading, SIG, Jane Street
- Source: N/A
- Tags: Expected Value
- Premium: True
- Solution Free: False
- Version: 5
- Last Edited: 2023-11-5 10:08:00 America/New_York
- Last Edited By: Gabe

### 题干

A $10\times 10\times 10$ cube is painted red on the surface and then cut into $1000$ $1 \times 1 \times 1$ cubes and one is selected uniformly at random. Find the expected number of red faces on this cube.

### Hint

Label the faces of each cube $1-6$, and then let $I_i$ be the indicator that side $i$ of the cube that is drawn is colored red.

### 解答

Label the faces of each cube $1-6$, and then let $I_i$ be the indicator that side $i$ of the cube that is drawn is colored red. Then $T = I_1 + \dots + I_6$ gives the total number of red sides of the cube. By linearity of expectation and the fact that this is the cube so all the sides are exchangeable, $\mathbb{E}[T] = 6\mathbb{E}[I_1]$. $\mathbb{E}[I_1]$ is just the probability that side $1$ is colored red. We know that $10^2$ of the cubes will have side $1$ colored red, as each side is colored red on one face of the big cube, which is $10^2$ little cubes. Therefore, the probability side 1 is red is $\dfrac{10^2}{10^3} = \dfrac{1}{10}$. Therefore, $\mathbb{E}[T] = \dfrac{3}{5}$ by substituting back in.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3/5"
    ],
    "companies": [
      {
        "company": "Five Rings"
      },
      {
        "company": "Hudson River Trading"
      },
      {
        "company": "SIG"
      },
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "45mIYBA5bMhHpwXgxiQs",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 10:08:00 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1758309,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Better in Red I",
    "topic": "probability",
    "urlEnding": "better-in-red-i",
    "version": 5
  },
  "list_summary": {
    "companies": [
      {
        "company": "Five Rings"
      },
      {
        "company": "Hudson River Trading"
      },
      {
        "company": "SIG"
      },
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "medium",
    "id": "45mIYBA5bMhHpwXgxiQs",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Better in Red I",
    "topic": "probability",
    "urlEnding": "better-in-red-i"
  }
}
```
