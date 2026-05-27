# QuantGuide Question

## 488. Basic Die Game VII

**Metadata**

- ID: `JBXVFuPU7Cjs5CInRYWv`
- URL: https://www.quantguide.io/questions/basic-die-game-vii
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Chicago Trading Company
- Source: abd
- Tags: Games, Conditional Expectation
- Premium: False
- Solution Free: False
- Version: 3
- Last Edited: 2023-11-4 23:23:04 America/New_York
- Last Edited By: Gabe

### 题干

A player rolls a standard fair $6-$sided die. If the player rolls a $6$, the game ends and the player receives no payout. Otherwise, the player may quit and receive $\$k$, where $k$ is the upface of the previous roll. Otherwise, the player may roll again under the same rules. Assuming optimal play from the player, what is their expected payout?

### Hint

Given that the player does not roll a $6$, what is the conditional expectation of their die roll? When should the person roll again?

### 解答

Intuitively, given that the player does not roll a $6$, the conditional expectation of their die roll is $3$. The sum of the rest of the faces of the die is $15$, which are distributed over $5$ faces. Therefore, the player should keep any value at least $3$ and re-roll any value below $3$. Let $e_3$ be the expected payout of this strategy. We have that $$e_3 = \dfrac{1}{3}\cdot e_3 + \dfrac{1}{2} \cdot 4$$ This is since with probability $1/3$, the person rolls $1$ or $2$, in which the game essentially restarts. With probability $1/2$, the person rolls $3,4,$ or $5$, which has conditional expectation $4$. Solving for this, we get that $e_3 = 3$, which is our optimal strategy. One can also show that if you re-roll anything below $4$, you get the same expected payout. This makes intuitive sense because of the fact that at $3$, you are indifferent to keeping or rolling again. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3"
    ],
    "companies": [
      {
        "company": "Chicago Trading Company"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "JBXVFuPU7Cjs5CInRYWv",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-4 23:23:04 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3880158,
    "source": "abd",
    "status": "published",
    "tags": [
      {
        "tag": "Games"
      },
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Basic Die Game VII",
    "topic": "probability",
    "urlEnding": "basic-die-game-vii",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "Chicago Trading Company"
      }
    ],
    "difficulty": "easy",
    "id": "JBXVFuPU7Cjs5CInRYWv",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Games"
      },
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Basic Die Game VII",
    "topic": "probability",
    "urlEnding": "basic-die-game-vii"
  }
}
```
