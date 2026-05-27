# QuantGuide Question

## 968. Hidden Prisms

**Metadata**

- ID: `DuyjTsq39DMc0gpPNfiI`
- URL: https://www.quantguide.io/questions/hidden-prisms
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: Kaushik - Version of rectangles on chess board 
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-26 22:58:50 America/New_York
- Last Edited By: Aaron

### 题干

You are presented with a clear 5x5x5 cube. How many unique rectangular prisms can you see within the cube? Uniqueness does not include orientation. For example, there are 8 unique 3x3x3 cubes within a 4x4x4 cube. 

### Hint

How can prisms be formed as intersections of the three axes?

### 解答

This problem is similar to "Rectangles on Chess Board". On each of the three axes of the 5x5x5 cube, we need to pick two points (a start and an end). One axis will be for the length of our prism, one for the width, and the last for the height. There are $6$ different points to pick from for a start and an end. Since we are picking $2$ of them, there are $\binom{6}{2} = 15$ ways to pick a start and an end on an axis. Given we have three axes, the total number of rectangular prisms is $\binom{6}{2}^3=15^3 = 3375$ total rectangular prisms. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3375"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "DuyjTsq39DMc0gpPNfiI",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-26 22:58:50 America/New_York",
    "lastEditedBy": "Aaron",
    "orderId": 7893124,
    "source": "Kaushik - Version of rectangles on chess board ",
    "status": "published",
    "tags": [],
    "title": "Hidden Prisms",
    "topic": "brainteasers",
    "urlEnding": "hidden-prisms",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "DuyjTsq39DMc0gpPNfiI",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Hidden Prisms",
    "topic": "brainteasers",
    "urlEnding": "hidden-prisms"
  }
}
```
