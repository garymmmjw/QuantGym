# QuantGuide Question

## 459. Crossing Pairs

**Metadata**

- ID: `EsUdQDWAv0sxwZN6IrQ3`
- URL: https://www.quantguide.io/questions/crossing-pairs
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 1
- Companies: Five Rings
- Source: 5R
- Tags: Events
- Premium: False
- Solution Free: False
- Version: 5
- Last Edited: 2023-11-10 13:30:17 America/New_York
- Last Edited By: Gabe

### 题干

Suppose $6$ points are chosen uniformly at random along the perimeter of the circle. The $6$ points are then divided into three pairs, and a chord is drawn between every pair of points. What is the probability none of the chords intersect?


### Hint

Imagine we pick the pairs sequentially, and say we pick a random point of the six. Which of the remaining 5 points can we pair with the chosen one? Condition on the selected pair. 

### 解答

Suppose the pairs of points are picked sequentially, then for our first point pick any point along the circle. As for the possible partner of the first point, we can either choose to pick its left or right neighbor, or the point across from it. Any other choice will result in one point trapped inside the formed chord forcing an intersection. 

$$$$
First, the probability that the first point is matched with a left/right neighbor is $\frac{2}{5}$. Applying the same logic now to the remaining four points, we get that the probability these pairs do not intersect is $\frac{2}{3}$.

$$$$
In the other $\frac{1}{5}$ chance that the first point is paired with the point directly across, we need the remaining four points not to intersect the chord. The only way for this to happen is if the pairs on each side of the chord are paired with each other. This has probability of $\frac{1}{3}$. 

$$$$
Putting these together, we find that the probability of no intersection is $\frac{2}{5}(\frac{2}{3}) + \frac{1}{5}(\frac{1}{3}) = \frac{1}{3}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/3",
      "0.33",
      ".33"
    ],
    "companies": [
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "EsUdQDWAv0sxwZN6IrQ3",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-10 13:30:17 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3674189,
    "source": "5R",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Crossing Pairs",
    "topic": "probability",
    "urlEnding": "crossing-pairs",
    "version": 5
  },
  "list_summary": {
    "companies": [
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "medium",
    "id": "EsUdQDWAv0sxwZN6IrQ3",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Crossing Pairs",
    "topic": "probability",
    "urlEnding": "crossing-pairs"
  }
}
```
