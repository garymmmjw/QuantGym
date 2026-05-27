# QuantGuide Question

## 746. Bread Slicer I

**Metadata**

- ID: `UgEMoCFixhWfwmi3y4ZT`
- URL: https://www.quantguide.io/questions/bread-slicer-i
- Topic: probability
- Difficulty: easy
- Internal Difficulty: N/A
- Companies: N/A
- Source: N/A
- Tags: Continuous Random Variables
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Gabe has 2 loaves of bread of lengths 5 and 8. He has no control of where he cuts the length $8$ bread piece, so he cuts it at a uniformly random position along its length. What is the probability that the loaf of length $5$ and the two resulting pieces of bread from the cut form a triangle?

### Hint

Recall that in order to form a triangle, the sum of any two sides must be greater than the third side.

### 解答

Let $X$ be the distance from the left endpoint that Gabe cuts the piece of bread. Then $X \sim \text{Unif}(0,8)$ by definition. The three resultant pieces are then of lengths $5,X,$ and $8 - X$. We can use the condition for triangles be valid i.e. the sum of any 2 sides is longer than the remaining side to determine the valid values of $X$ that make this a triangle.

$$$$

The three inequalities say that $5 < X + (8 - X) = 8$, which is useless. Then, $X < 5 + (8 - X)$, so $X < \dfrac{13}{2}$ is our first condition. In addition $8-X < 5 + X$, so that $X > \dfrac{3}{2}$ is our second condition. Therefore, finding a valid triangle is equivalent to finding $\mathbb{P}\left[\dfrac{3}{2} < X < \dfrac{13}{2}\right]$, which is simply just $\dfrac{5}{8}$ by realizing this interval is length 5 out of a total length $8$ interval.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "5/8"
    ],
    "difficulty": "easy",
    "id": "UgEMoCFixhWfwmi3y4ZT",
    "internalDifficulty": 0,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 6103992,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Bread Slicer I",
    "topic": "probability",
    "urlEnding": "bread-slicer-i"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "UgEMoCFixhWfwmi3y4ZT",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Bread Slicer I",
    "topic": "probability",
    "urlEnding": "bread-slicer-i"
  }
}
```
