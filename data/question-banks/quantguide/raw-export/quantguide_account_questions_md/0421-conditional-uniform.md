# QuantGuide Question

## 421. Conditional Uniform

**Metadata**

- ID: `d33yw8LMoxS9w95eKYuw`
- URL: https://www.quantguide.io/questions/conditional-uniform
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Five Rings
- Source: 5r, edited
- Tags: Conditional Probability, Continuous Random Variables
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-1 14:17:52 America/New_York
- Last Edited By: Gabe

### 题干

Suppose $X,Y \sim \text{Unif}(0,1)$ IID. Compute $\mathbb{P}[X - Y > 1/2 \mid X + Y < 1]$.

### Hint

Draw the region out in the plane and take ratios of areas.

### 解答

Drawing this out in the plane, the region that is bound by the axes and $x + y = 1$ is a triangle with side lengths $1$. The region of interest for our event is the region that is below $y = x - 1/2$. Shading in this region, we see that it is also a triangle. The intersection point is $(3/4,1/4)$, so the length of each side of the triangle of our region of interest is $\dfrac{\sqrt{2}}{4}$. Since $X$ and $Y$ are IID $\text{Unif}(0,1)$, their conditional joint distribution is uniform over the bigger triangle bound by $x+y = 1$ and the axes. Thus, we can take ratios of areas, and determine that the area of the big triangle is $1/2$, while the area of our smaller region of interest is $\dfrac{1}{16}$, meaning our probability is $\dfrac{1}{8}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/8"
    ],
    "companies": [
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "d33yw8LMoxS9w95eKYuw",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-1 14:17:52 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3385253,
    "source": "5r, edited",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Conditional Uniform",
    "topic": "probability",
    "urlEnding": "conditional-uniform",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "easy",
    "id": "d33yw8LMoxS9w95eKYuw",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Conditional Uniform",
    "topic": "probability",
    "urlEnding": "conditional-uniform"
  }
}
```
