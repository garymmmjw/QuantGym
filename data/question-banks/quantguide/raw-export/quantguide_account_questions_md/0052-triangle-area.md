# QuantGuide Question

## 52. Triangle Area

**Metadata**

- ID: `v7yAiDmB7OGlkcn1NHWC`
- URL: https://www.quantguide.io/questions/triangle-area
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Expected Value
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-7 12:45:22 America/New_York
- Last Edited By: Gabe

### 题干

$$X, Y \overset{\text{iid}}{\sim} \text{Unif}(\{1, 2, 3, 4, 5\})$. A triangle is drawn with vertices $(0, 0), (X, 0), (0, Y)$. Compute the expected area of the triangle.

### Hint

The expected area of the triangle is $\mathbb{E}[ \frac{1}{2} XY]$. Note that $X$ and $Y$ are independent.

### 解答

Note that $X$ and $Y$ are independent. The expected area of the triangle is $\mathbb{E}[ \frac{1}{2} XY] = \frac{1}{2} \mathbb{E}[X]\mathbb{E}[Y] = \frac{1}{2} \left(3\right) ^2 = \frac{9}{2}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "9/2"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "v7yAiDmB7OGlkcn1NHWC",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 12:45:22 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 379016,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Triangle Area",
    "topic": "probability",
    "urlEnding": "triangle-area",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "v7yAiDmB7OGlkcn1NHWC",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Triangle Area",
    "topic": "probability",
    "urlEnding": "triangle-area"
  }
}
```
