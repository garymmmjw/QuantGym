# QuantGuide Question

## 687. Laser Game

**Metadata**

- ID: `sBKLrKKOo6rZbDzONczQ`
- URL: https://www.quantguide.io/questions/laser-game
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-9 22:16:09 America/New_York
- Last Edited By: Gabe

### 题干

Mordecai has a large target of radius $10$ and a laser pointer. He is clumsy, so he points the laser at a uniformly random point on the target. Let $D$ represent the random distance from the laser to the center of the target. He offers you to play the following game: Mordecai points the laser at the target one time. Before doing so, you fix a value $0 \leq r \leq 10$. If your laser is within distance $r$ away from the center, you must pay Mordecai $\$(10-r)$. Otherwise, Mordecai pays you $\$r$. Find the value of $r$ that maximizes your expected winnings from this game.

### Hint

Calculate the probability the dart is within or outside a distance $r$ and optimize the quadratic.

### 解答

If we pick $r$, the probability that the dart is within a radius $r$ of the center is $\dfrac{r^2}{100}$, as that is the ratio of the area of the circle of radius $r$ to the circle of radius $10$. This means the probability it is outside that circle is $1 - \dfrac{r^2}{100}$. Thus, our expected profit when we select $r$ is $p(r) = \dfrac{r^2}{100} \cdot -(10 - r) + \left(1-\dfrac{r^2}{100}\right) \cdot r = -\dfrac{r^2}{10} + r = -r\left(\dfrac{r}{10} - 1\right)$. The maximum of a downwards facing parabola is halfway between the zeroes. The zeroes here are $r = 0, 10$. Therefore, the maximum value is at $r = 5$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "5"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "sBKLrKKOo6rZbDzONczQ",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-9 22:16:09 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5586149,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Laser Game",
    "topic": "probability",
    "urlEnding": "laser-game",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "sBKLrKKOo6rZbDzONczQ",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Laser Game",
    "topic": "probability",
    "urlEnding": "laser-game"
  }
}
```
