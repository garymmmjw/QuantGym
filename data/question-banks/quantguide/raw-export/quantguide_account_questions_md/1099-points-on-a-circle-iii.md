# QuantGuide Question

## 1099. Points on a Circle III

**Metadata**

- ID: `eviLd9qGRhZE2AT1jCog`
- URL: https://www.quantguide.io/questions/points-on-a-circle-iii
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Events, Continuous Random Variables
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-7 23:32:39 America/New_York
- Last Edited By: Gabe

### 题干

There are 8 points on a circle. You draw all possible chords that can be formed by connecting pairs each pair of points. Then, you randomly selects 4 chords. What is the probability that the 4 chords form a convex quadrilateral?

### Hint

Given any 4 points on a circle, we can draw $\binom{4}{2} = 6$ unique chords between pairs of those 4 points.

### 解答

As there are $8$ points on the circle, there are $\displaystyle \binom{8}{2} = 28$ different chords on the circle. This is because each pair of points can have a chord drawn between them. Therefore, there are $\displaystyle \binom{28}{4}$ different subsets of the chords that could be selected.

$$$$

Additionally, each set of $4$ points corresponds to exactly one quadrilateral. This is because each set of $4$ points can have exactly $1$ quadrilateral where the chords connect between those $4$ points specifically. Therefore, there are $\displaystyle \binom{8}{4}$ ways to pick $4$ points. This means our probability is $$\dfrac{\binom{8}{4}}{\binom{28}{4}} = \dfrac{2}{585}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2/585"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "eviLd9qGRhZE2AT1jCog",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-7 23:32:39 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8994493,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Points on a Circle III",
    "topic": "probability",
    "urlEnding": "points-on-a-circle-iii",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "eviLd9qGRhZE2AT1jCog",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Events"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Points on a Circle III",
    "topic": "probability",
    "urlEnding": "points-on-a-circle-iii"
  }
}
```
