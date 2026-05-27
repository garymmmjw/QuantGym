# QuantGuide Question

## 947. Optimal Marbles II

**Metadata**

- ID: `8nFwlPozqJXC3ggfgfz3`
- URL: https://www.quantguide.io/questions/optimal-marbles-ii
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: TQD
- Tags: Expected Value, Games
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-25 22:57:02 America/New_York
- Last Edited By: Gabe

### 题干

Two players, say $A$ and $B$, play the following game: Both players have $100$ marbles and may put anywhere between $1$ and $100$ marbles in the box each. This decision is not revealed to the other player. Then, they draw $1$ marble. If the marble belongs to $A$, then assuming that $A$ put $a$ marbles in the box, $A$ is paid $100-a$ monetary units from player $B$. Similarly if the marble belongs to $B$, then assuming $B$ put $b$ marbles in the box, $B$ is paid $100-b$ monetary units from player $A$. Assume both players play optimally. How many marbles should player $A$ select?

### Hint

Set up a function $A(a,b)$ the represents the expected payout if $A$ puts in $a$ marbles and $b$ puts in $b$ marbles. Find the equilibrium.

### 解答

Similar to Optimal Marbles I, this game is symmetric for the two players, so their optimal strategy will be the same. This point will be important later. One main difference is that this is a zero-sum game, unlike Optimal Marbles I. The function we have to optimize will be significantly different.

$$$$

Let $A(a,b)$ be the expected profit/loss of player $A$ when $A$ puts in $a$ marbles and $B$ puts in $b$ marbles. Then $$A(a,b) = \dfrac{a}{a+b}\cdot (100 - b) - \dfrac{b}{a+b} \cdot (100 - b)$$ because $a$ wins with probability $\dfrac{a}{a+b}$ and $b$ wins with probability $\dfrac{b}{a+b}$. We want to optimize $A(a,b)$ for $a$ when $b$ is a fixed value. Therefore, we are going to take the derivative of $A(a,b)$ (treating $A(a,b)$ as continuous in its arguments) with respect to $a$ and try to optimize that. Taking the derivative, we get $$\dfrac{\partial}{\partial a} A(a,b) = -\dfrac{a^2 + 2ba + b^2 - 200b}{(a+b)^2} = 0 \iff a^2 + 2ba + b^2 - 200b = 0 \iff a^* = \dfrac{-2b \pm \sqrt{4b^2 - 4b^2 + 800b}}{2}$$ However, note that the root involving subtraction of the square root would be negative, so we must add our square root instead. Simplifying, we get $a^* = 10\sqrt{2b} - b$. As the game is symmetric, $b^* = 10\sqrt{2a} - a$. 

$$$$

To find the optimal strategy, we must solve for when $a^* = b^*$. In other words, we let $b$ in the equation for $a^*$ be $b^* = a^*$. This means that $$a^* = 10\sqrt{2a^*} - a^* \iff 4(a^*)^2 = 200a^* \iff a^* = 0,50$$ Once again, as $a^* > 0$, we must have $a^* = b^* = 50$, which means $(50,50)$ is our Nash equilibrium. Therefore, player $A$ should place $50$ marbles in.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "50"
    ],
    "companies": [],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "8nFwlPozqJXC3ggfgfz3",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-25 22:57:02 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7716215,
    "randomizable": "",
    "source": "TQD",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Games"
      }
    ],
    "title": "Optimal Marbles II",
    "topic": "probability",
    "urlEnding": "optimal-marbles-ii"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "hard",
    "id": "8nFwlPozqJXC3ggfgfz3",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Games"
      }
    ],
    "title": "Optimal Marbles II",
    "topic": "probability",
    "urlEnding": "optimal-marbles-ii"
  }
}
```
