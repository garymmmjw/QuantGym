# QuantGuide Question

## 721. Ant Collision II

**Metadata**

- ID: `nBLduxz7tv1dFzeKLYZM`
- URL: https://www.quantguide.io/questions/ant-collision-ii
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: 150 problems
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Alice and Bob raised their own ants. Alice has $40$ ants, while Bob has $80$ ants. Alice and Bob stand at opposite ends of an infinitesimally wide string and let all of their ants crawl on the string. Whenever one ant runs into another ant, they both bounce back and change direction. Each of the ants can only move forward. Find the number of collisions between ants that take place.

### Hint

Imagine that whenever two ants collide they change bodies.

### 解答

Imagine that whenever two ants collide they change bodies. This is a reasonable assumption because of the fact in each collision, both ants will move in the direction of the other ant after the collision. Therefore, it is as if no collision happened at all in this paradigm. With this, we can see that every one of Alice's ants will collide with every one of Bob's ants. This means that there are $40 \cdot 80 = 3200$ total ant collisions.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3200"
    ],
    "companies": [],
    "difficulty": "easy",
    "id": "nBLduxz7tv1dFzeKLYZM",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 5893500,
    "randomizable": "",
    "source": "150 problems",
    "status": "published",
    "tags": [],
    "title": "Ant Collision II",
    "topic": "brainteasers",
    "urlEnding": "ant-collision-ii"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "nBLduxz7tv1dFzeKLYZM",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Ant Collision II",
    "topic": "brainteasers",
    "urlEnding": "ant-collision-ii"
  }
}
```
