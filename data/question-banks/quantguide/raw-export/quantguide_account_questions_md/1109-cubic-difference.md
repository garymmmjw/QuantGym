# QuantGuide Question

## 1109. Cubic Difference

**Metadata**

- ID: `flNdaz6wFfMkNMWWzsxf`
- URL: https://www.quantguide.io/questions/cubic-difference
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: 536
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-30 23:10:38 America/New_York
- Last Edited By: Gabe

### 题干

Find the smallest positive integer $y$ such that $y^2 = a^3 - b^3$ for some integers $a$ and $b$.

### Hint

Cubes are very large in difference, so to minimize the actual difference, one may want to consider both positive and negative integers. List out the first few squares and first few cubes.

### 解答

Cubes are very large in difference, so to minimize the actual difference, one may want to consider both positive and negative integers. In particular, listing out the first few squares, we see that they are $1,4,9,$ and $16$. One may note that $2^3 = 8$, so $2^3 - (-2)^3 = 8 - (-8) = 16 = 4^2$, so $y = 4$ is our solution. We can't do better because of the fact that the cubes grow too quickly, so the differences between them grow too fast after this.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "4"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "flNdaz6wFfMkNMWWzsxf",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 23:10:38 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9066682,
    "source": "536",
    "status": "published",
    "tags": [],
    "title": "Cubic Difference",
    "topic": "brainteasers",
    "urlEnding": "cubic-difference",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "flNdaz6wFfMkNMWWzsxf",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Cubic Difference",
    "topic": "brainteasers",
    "urlEnding": "cubic-difference"
  }
}
```
