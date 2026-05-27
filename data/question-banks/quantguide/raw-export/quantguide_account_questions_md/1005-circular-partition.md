# QuantGuide Question

## 1005. Circular Partition

**Metadata**

- ID: `FfxRGmjD4T3NQQVWMcRp`
- URL: https://www.quantguide.io/questions/circular-partition
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: SIG, Virtu Financial
- Source: SIG interview
- Tags: Expected Value, Continuous Random Variables
- Premium: True
- Solution Free: False
- Version: 3
- Last Edited: 2023-10-29 22:55:53 America/New_York
- Last Edited By: Gabe

### 题干

Suppose $X_1,X_2,X_3,$ and $X_4$ are all independent random points selected uniformly from the perimeter of the unit circle. Draw a chord between $X_1$ and $X_2$. Draw another chord between $X_3$ and $X_4$. Find the expected number of disjoint regions the circle is partitioned into.

### Hint

Fix $X_1$ as the "smallest" point in the sense of smallest angle CCW from the origin. Consider the different orderings of $X_2,X_3,$ and $X_4$.

### 解答

Fix $X_1$ as the "smallest" point in the sense of smallest angle CCW from the origin. This doesn't matter since all of them are independent and uniform on the perimeter. If $X_2$ is the smallest (in terms of CCW angle from $(1,0)$) among $X_2,X_3,$ and $X_4$, then we get $3$ distinct regions, as the chords do not intersect. If $X_2$ is the median of the remaining $3$, then we get $4$ regions, as there is an intersection. If $X_2$ is the largest among the remaining $3$, there is no intersection of chords, so we have $3$ regions. As all orderings occur with equal probability, there are $3$ regions with probability $\dfrac{2}{3}$ and $4$ regions with probability $\dfrac{1}{3}$, so the expected number is $$3 \cdot \dfrac{2}{3} + 4 \cdot \dfrac{1}{3} = \dfrac{10}{3}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "10/3"
    ],
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Virtu Financial"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "FfxRGmjD4T3NQQVWMcRp",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-29 22:55:53 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8189189,
    "source": "SIG interview",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Circular Partition",
    "topic": "probability",
    "urlEnding": "circular-partition",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Virtu Financial"
      }
    ],
    "difficulty": "medium",
    "id": "FfxRGmjD4T3NQQVWMcRp",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Circular Partition",
    "topic": "probability",
    "urlEnding": "circular-partition"
  }
}
```
