# QuantGuide Question

## 229. Snowman Surface

**Metadata**

- ID: `skGSoENxKVr5XweHvbkE`
- URL: https://www.quantguide.io/questions/snowman-surface
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: MAO edited
- Tags: Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-29 22:41:37 America/New_York
- Last Edited By: Gabe

### 题干

A snowman is formed by placing three spherical snowballs of radii $8,11,$ and $14$ inches on top of one another. Assume that every point on the surface of each snowball is visible. A uniformly random point is selected on the surface of the snowman. Find the probability that this point is at most $39$ inches above the ground.

### Hint

The total surface area of the snowman is $4\pi (8^2 + 11^2 + 14^2) = 1524\pi$. What portion is closer to the ground?

### 解答

The total surface area of the snowman is $4\pi (8^2 + 11^2 + 14^2) = 1524\pi$. Half of the $11$ inch sphere and all of the $14$ inch sphere are at most $39$ inches off the ground. This comes from the fact that the diameter is $28$ inches for the $14$ inch snowball, and then we add $11$ inches as the radius of the $11$ inch snowball. The surface area of the portion closer to the ground is $4\pi \cdot 14^2 + 2\pi \cdot 11^2 = 1026\pi$. Therefore, the answer in question is $\dfrac{1026\pi}{1524\pi} = \dfrac{171}{254}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "171/254"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "skGSoENxKVr5XweHvbkE",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-29 22:41:37 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1803678,
    "source": "MAO edited",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Snowman Surface",
    "topic": "probability",
    "urlEnding": "snowman-surface",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "skGSoENxKVr5XweHvbkE",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Snowman Surface",
    "topic": "probability",
    "urlEnding": "snowman-surface"
  }
}
```
