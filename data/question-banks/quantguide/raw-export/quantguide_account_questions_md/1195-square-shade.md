# QuantGuide Question

## 1195. Square Shade

**Metadata**

- ID: `Q1T8zg2Py2c4VDRu5HnI`
- URL: https://www.quantguide.io/questions/square-shade
- Topic: brainteasers
- Difficulty: hard
- Internal Difficulty: N/A
- Companies: N/A
- Source: N/A
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Consider a $2023 \times 2023$ grid. The grid squares from the middle row are shaded in. What is the probability that a randomly selected rectangle contains at least one shaded square?

### Hint

Our $2023 \times 2023$ grid is essentially split into two $1011 \times 2023$ mini grids by the shaded row. How many rectangles can be made from each split, and how many rectangles can be made in total? Consider the complementary event.

### 解答

Our $2023 \times 2023$ grid is essentially split into two $1011 \times 2023$ mini grids. Let's first determine how many rectangles we can make from a $2023 \times 2023$ grid. We must choose two rows of grid lines from each side to mark the boundaries of the rectangle, so we can make a total of $\binom{2024}{2} \cdot \binom{2024}{2}$ rectangles. Similarly, there are a total of $\binom{1012}{2} \cdot \binom{2024}{2}$ rectangles that can be made from each $1011 \times 2023$ mini grid. Our probability is then $\frac{2 \cdot \binom{1012}{2} \cdot \binom{2024}{2}}{\binom{2024}{2} \cdot \binom{2024}{2}} = \frac{1011}{2023}$. The complement and answer is $\frac{1012}{2023}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1012/2023"
    ],
    "difficulty": "hard",
    "id": "Q1T8zg2Py2c4VDRu5HnI",
    "internalDifficulty": 0,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 9932333,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Square Shade",
    "topic": "brainteasers",
    "urlEnding": "square-shade"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "hard",
    "id": "Q1T8zg2Py2c4VDRu5HnI",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Square Shade",
    "topic": "brainteasers",
    "urlEnding": "square-shade"
  }
}
```
