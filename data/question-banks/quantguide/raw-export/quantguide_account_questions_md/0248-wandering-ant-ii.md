# QuantGuide Question

## 248. Wandering Ant II

**Metadata**

- ID: `rZn1Y5vO42ft5PrlYm9Z`
- URL: https://www.quantguide.io/questions/wandering-ant-ii
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: N/A
- Tags: Conditional Expectation, Expected Value
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-8-28 15:36:24 America/New_York
- Last Edited By: Gabe

### 题干

An ant starts at the origin in the plane. At each step, with probability $\dfrac{1}{4}$, the ant will move one unit north, south, east, or west. Find the expected number of steps until the ant first hits the square with vertices at $(\pm 2, \pm 2)$.

### Hint

Let $N_{(a,b)}$ be the number of steps starting from $(a,b)$ needed to reach the square boundary. You want $\mathbb{E}[N_{(0,0}]$. Use Law of Total Expectation here to condition on the first step and use the symmetry of the random walk to simplify this problem greatly.

### 解答

Let $N_{(a,b)}$ be the number of steps starting from $(a,b)$ needed to reach the square boundary. We want $\mathbb{E}[N_{(0,0}]$. We use Law of Total Expectation here to condition on the first step and use the symmetry of our random walk to simplify this problem greatly.

$$$$

Starting from the origin, the ant moves to $(\pm 1,0)$ or $(0, \pm 1)$ all with equal probability. However, by the symmetry of our square and our walk, 


$\mathbb{E}[N_{(0,1)}] = \mathbb{E}[N_{(0,-1)}] = \mathbb{E}[N_{(1,0)}] = \mathbb{E}[N_{(-1,0)}]$. Therefore, by Law of Total Expectation,

\[\begin{aligned}
    \mathbb{E}[N_{(0,0)}] &= \dfrac{1}{4}\left[(1 + \mathbb{E}[N_{(0,1)}]) + (1 + \mathbb{E}[N_{(0,-1)}]) + (1 + \mathbb{E}[N_{(1,0)}]) + (1 + \mathbb{E}[N_{(-1,0)}])\right] \\ &= 1 + \mathbb{E}[N_{(1,0)}]
\end{aligned}\]

The additional $1$ added to all of these represents the fact that we take $1$ step to get from the origin to one of these spots.

$$$$

From $(1,0)$, we can reach the boundary in one more step if we move right. If we move up or down, we are going to reach $(1,1)$ or $(1,-1)$. The expected time to reach the boundary from each of these positions is equal by the symmetry of our random walk. If we move left, we are back at the origin. Therefore, by Law of Total Expectation:

\[\begin{aligned}
    \mathbb{E}[N_{(1,0)}] &= \dfrac{1}{4}\left(1 + (1 + \mathbb{E}[N_{(1,1)}]) + (1 + \mathbb{E}[N_{(1,-1)}]) + (1 + \mathbb{E}[N_{(0,0)}]\right) \\ &= 1 + \dfrac{1}{2}\mathbb{E}[N_{(1,1)}] + \dfrac{1}{4}\mathbb{E}[N_{(0,0)}]
\end{aligned}\]

$$$$

From $(1,1)$, we can reach the boundary in one more step if we move right or up, which occurs with probability $\dfrac{1}{2}$. Otherwise, we end up at $(1,0)$ or $(0,1)$, and we already know by symmetry that the expected time to hit the boundary from these positions are equal. Therefore, by LOTE, $\mathbb{E}[N_{(1,1)}] = \dfrac{1}{2} \cdot 1 + \dfrac{1}{2} \cdot \left(1 + \mathbb{E}[N_{(1,0)}]\right) = 1 + \dfrac{1}{2}\mathbb{E}[N_{(1,0)}]$ by doing the substitution.

$$$$

Substituting the expressions for $\mathbb{E}[N_{(1,1)}]$ and $\mathbb{E}[N_{(0,0)}]$ into the expression for $\mathbb{E}[N_{(1,0)}]$, we find that $\mathbb{E}[N_{(1,0)}] = 1 + \dfrac{1}{2}\left(1 + \dfrac{1}{2}\mathbb{E}[N_{(1,0)}]\right) + \dfrac{1}{4}(1 + \mathbb{E}[N_{(1,0)}])$. We solve and see that $\mathbb{E}[N_{(1,0)}] = \dfrac{7}{2}$. Substituting this into the expression for $\mathbb{E}[N_{(0,0)}]$, we get $\mathbb{E}[N_{(0,0)}] = \dfrac{9}{2}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "9/2"
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "rZn1Y5vO42ft5PrlYm9Z",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-28 15:36:24 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1968407,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Wandering Ant II",
    "topic": "probability",
    "urlEnding": "wandering-ant-ii",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "hard",
    "id": "rZn1Y5vO42ft5PrlYm9Z",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Wandering Ant II",
    "topic": "probability",
    "urlEnding": "wandering-ant-ii"
  }
}
```
