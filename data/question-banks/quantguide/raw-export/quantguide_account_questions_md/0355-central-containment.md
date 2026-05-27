# QuantGuide Question

## 355. Central Containment

**Metadata**

- ID: `rjzyBhUVg1B8GkeEST6W`
- URL: https://www.quantguide.io/questions/central-containment
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: Jane Street, Akuna, Goldman Sachs
- Source: Classic
- Tags: Continuous Random Variables
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 13:37:08 America/New_York
- Last Edited By: Gabe

### 题干

What is the probability that three random points on a unit circle would form a triangle that includes the center of the unit circle?

### Hint

Fix the first point arbitrarily. The second point can also lie anywhere, but notice that to form a triangle which contains the center, the third point must lie on the portion which has equivalent size as the length of the arc between the first two points, reflected over the center. 

### 解答

Fix the first point arbitrarily. The second point can also lie anywhere, but notice that to form a triangle which contains the center, the third point must lie on the portion which has equivalent size as the length of the arc between the first two points, reflected over the center. Thus, think about the position of the second point. The size of that portion could be anywhere between $0$ and $\pi$. On average, it is $\dfrac{\pi}{2}$, and hence the answer is $$\dfrac{\frac{\pi}{2}}{2\pi} = \dfrac{1}{4}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/4"
    ],
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "rjzyBhUVg1B8GkeEST6W",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 13:37:08 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2719710,
    "source": "Classic",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Central Containment",
    "topic": "probability",
    "urlEnding": "central-containment"
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "hard",
    "id": "rjzyBhUVg1B8GkeEST6W",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Central Containment",
    "topic": "probability",
    "urlEnding": "central-containment"
  }
}
```
