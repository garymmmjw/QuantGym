# QuantGuide Question

## 23. Fleeing Flea

**Metadata**

- ID: `iZvJ5rgMiVbxHHE9iwVq`
- URL: https://www.quantguide.io/questions/fleeing-flea
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 2
- Companies: WorldQuant
- Source: https://www.quora.com/An-ant-is-at-a-vertex-of-a-rectangular-prism-of-side-lengths-3-cm-2-cm-and-2-cm-What-is-the-length-of-the-shortest-distance-from-the-ant-to-the-chocolate-biscuit-crumb-at-another-vertex-of-the-cube-as-shown-in-the
- Tags: Pure Math
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-7 07:48:46 America/New_York
- Last Edited By: Gabe

### 题干

There is a flea being chased by a snake and it needs to get safety as fast as possible. The flea is sitting on one of the corners of a right parrallelpiped with side lengths of $2$, $2$, and $3$ and can run at a pace of $2.5$ units per second. It is trying to reach the safety of the direct opposite corner, how many seconds until it can reach the other corner?

### Hint

Turn the $3D$ object into a $2D$ one.

### 解答

One simple way to attack this problem is to lay the $3D$ object out into a $2D$ map. From there, we can see there are two quick straight paths the flea can take. Both paths are along the hypotenuse of two separate right triangles, one with side lengths of $(2, 5)$ and the other with side lengths of $(3,4)$. This means our two shortest paths total $\sqrt{29}$ units and $5$ units. 
$$$$
Our shortest path of the two is $5$ units, meaning our flea can flee to the other corner in $\frac{5}{2.5} = 2$ seconds.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2"
    ],
    "companies": [
      {
        "company": "WorldQuant"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "iZvJ5rgMiVbxHHE9iwVq",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 07:48:46 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 180049,
    "source": "https://www.quora.com/An-ant-is-at-a-vertex-of-a-rectangular-prism-of-side-lengths-3-cm-2-cm-and-2-cm-What-is-the-length-of-the-shortest-distance-from-the-ant-to-the-chocolate-biscuit-crumb-at-another-vertex-of-the-cube-as-shown-in-the",
    "status": "published",
    "tags": [
      {
        "tag": "Pure Math"
      }
    ],
    "title": "Fleeing Flea",
    "topic": "brainteasers",
    "urlEnding": "fleeing-flea",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "WorldQuant"
      }
    ],
    "difficulty": "medium",
    "id": "iZvJ5rgMiVbxHHE9iwVq",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Pure Math"
      }
    ],
    "title": "Fleeing Flea",
    "topic": "brainteasers",
    "urlEnding": "fleeing-flea"
  }
}
```
