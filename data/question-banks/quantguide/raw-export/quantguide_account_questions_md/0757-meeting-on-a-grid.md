# QuantGuide Question

## 757. Meeting on a Grid

**Metadata**

- ID: `ZSfVjkVeczR7Pf3iTL8S`
- URL: https://www.quantguide.io/questions/meeting-on-a-grid
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: Optiver
- Source: optiver oa
- Tags: Combinatorics
- Premium: True
- Solution Free: False
- Version: 6
- Last Edited: 2023-9-8 17:32:54 America/New_York
- Last Edited By: Gabe

### 题干

Alan is sitting at $(0,0)$ and Barbara is sitting at $(4,4)$. Each minute, Alan moves up or to the right one unit with equal probability, unless he is on the border of the $4 \times 4$ grid centered at $(2,2)$, in which case he moves in the only possible direction that keeps him within range. Barbara behaves similarly, but moves down or to the left instead. What is the probability that the two meet before they reach the opposite corner?

### Hint

Can Alan and Barbara meet at any point?

### 解答

Observe that the sum of Alan's coordinates increases by $1$ each minute, and Barbara's decreases by $1$. Since this sum starts at $8$ for Barbara and $0$ for Alan, if they meet at all, they must meet after $4$ minutes, and they must do so on the diagonal $y=4-x$. During the first $4$ minutes, both players are allowed to move in their originally permitted directions unconstrained, so there are $2^4$ equally likely ways for each player to reach the diagonal and therefore $2^8 = 256$ ways for both players. There exists a bijection between the number of ways to travel from one corner to the other and the number of viable paths for Alan and Barbara to meet, as any distinct example of one can be viewed uniquely as an example of the other. Hence, we have ${8 \choose 4} = 70$ ways for Alan and Barbara to meet of the original $256$, so the probability is $\dfrac{70}{256}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "70/256"
    ],
    "companies": [
      {
        "company": "Optiver"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "ZSfVjkVeczR7Pf3iTL8S",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "lastEditedAt": "2023-9-8 17:32:54 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6177614,
    "source": "optiver oa",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Meeting on a Grid",
    "topic": "probability",
    "urlEnding": "meeting-on-a-grid",
    "version": 6
  },
  "list_summary": {
    "companies": [
      {
        "company": "Optiver"
      }
    ],
    "difficulty": "medium",
    "id": "ZSfVjkVeczR7Pf3iTL8S",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Meeting on a Grid",
    "topic": "probability",
    "urlEnding": "meeting-on-a-grid"
  }
}
```
