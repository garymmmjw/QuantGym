# QuantGuide Question

## 886. Colorful Cube

**Metadata**

- ID: `P1ByOVsEguAdcTsmWnic`
- URL: https://www.quantguide.io/questions/colorful-cube
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: Original
- Tags: Combinatorics
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 11:49:35 America/New_York
- Last Edited By: Gabe

### 题干

Consider coloring the 6 sides of a cube each a distinct color among red, blue, green, yellow, purple, and pink. Find the probability that the sides that are colored red, green, and blue all share a vertex of the cube (i.e. corner) in common.

### Hint

There are $8$ vertices on a cube. Fix one of the colors arbitrarily.

### 解答

There are $6!$ colorings of the sides total. There are 8 ways to pick the corner of intersection. Then, there are $3! = 6$ ways to arrange the 3 colors among the sides that intersect at that corner. Then, there are $3! = 6$ ways to arrange the other 3 colors 
among the other 3 sides. Thus, our probability is $\dfrac{8 \cdot 6^2}{6!} = \dfrac{2}{5}$. 

$$$$

Alternatively, fix one color on any given side. The second color among blue, green, and red has a $\dfrac{4}{5}$ chance of sharing an edge with the first color (only the side opposite of the first color doesn't share an edge). Then, after that, 2 of the remaining 4 sides share one of the two vertices in common with the other two sides. Thus, the probability is $\dfrac{4}{5} \cdot \dfrac{1}{2} = \dfrac{2}{5}$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2/5"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "P1ByOVsEguAdcTsmWnic",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 11:49:35 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7285317,
    "source": "Original",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Colorful Cube",
    "topic": "probability",
    "urlEnding": "colorful-cube"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "P1ByOVsEguAdcTsmWnic",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Colorful Cube",
    "topic": "probability",
    "urlEnding": "colorful-cube"
  }
}
```
