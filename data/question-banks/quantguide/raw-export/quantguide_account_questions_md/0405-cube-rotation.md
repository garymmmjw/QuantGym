# QuantGuide Question

## 405. Cube Shadow

**Metadata**

- ID: `Ue2HehR1aOhVmD5FJTfy`
- URL: https://www.quantguide.io/questions/cube-rotation
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: my brain
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 3
- Last Edited: 2023-10-17 12:54:53 America/New_York
- Last Edited By: Gabe

### 题干

Consider a cube is floating in front of you in the air, and there is a light shining on it projecting it's shadow on the wall. You are free to rotate the cube around, and want to find out what's the largest sided polygon you can create with the shadow. Enter your answer as $n$ where $n$ is the largest $n$-sided polygon you can create with it's shadow.

### Hint

Think about grabbing a cube and rotating it in space, what the maximum number of sides you can create?

### 解答

There are $2$ distinct $n$-sided shadow polygons you can create by rotating the die. Starting the light pointing directly at any face, you can see only one face, and your shadow result is a square. Rotate around any one of the 3 axes, and you can see two faces, but you only get a rectangle. Rotate along any two axes at once, and you'll be able to see 3 faces of the die. When viewing 3 faces, there are 9 distinct edges you see. The 3 in the middle all being shared by exactly 2 faces, and the 6 on the exterior, (only touching a single face) which make up the edges of the shadow. This shadow is a $6$-sided polygon, a hexagon, making our answer 6.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "6"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "Ue2HehR1aOhVmD5FJTfy",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-17 12:54:53 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3194481,
    "source": "my brain",
    "status": "published",
    "tags": [],
    "title": "Cube Shadow",
    "topic": "brainteasers",
    "urlEnding": "cube-rotation",
    "version": 3
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "Ue2HehR1aOhVmD5FJTfy",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Cube Shadow",
    "topic": "brainteasers",
    "urlEnding": "cube-rotation"
  }
}
```
