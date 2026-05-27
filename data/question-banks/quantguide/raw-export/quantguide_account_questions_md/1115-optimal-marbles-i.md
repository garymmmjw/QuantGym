# QuantGuide Question

## 1115. Optimal Marbles I

**Metadata**

- ID: `qU30v79qdGXghQmBDPen`
- URL: https://www.quantguide.io/questions/optimal-marbles-i
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: Jane Street
- Source: TQD
- Tags: Expected Value, Games
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-30 17:57:23 America/New_York
- Last Edited By: Gabe

### 题干

Two players, say $A$ and $B$, play the following game: Both players have $100$ marbles and may put anywhere between $1$ and $100$ marbles in the box each. This decision is not revealed to the other player. Then, they draw $2$ marbles with replacement between trials. If the marble belongs to $A$, then assuming that $A$ put $a$ marbles in the box, $A$ is paid $100-a$ monetary units from a third party. Similarly if the marble belongs to $B$, then assuming $B$ but $b$ marbles in the box, $B$ is paid $100-b$ monetary units from a third party. Assume both players play optimally. Find the expected total payout of player $A$.

### Hint

If the strategy is optimal, then if this game were to be repeated many times, they would not change their strategy. Therefore, the optimal strategy for the game where there are $2$ consecutive marble draws is the same as the optimal strategy for the game with one draw. Then, we just multiply the expected profit by $2$ to represent the two draws. Furthermore, as this game is symmetric for the two players, their optimal strategy will be the same. Set up a function $A(a,b)$ the represents the expected payout if $A$ puts in $a$ marbles and $b$ puts in $b$ marbles. Find the equilibrium.

### 解答

We can first make some simplifications to the game. Firstly, if the strategy is optimal, then if this game were to be repeated many times, they would not change their strategy. Therefore, the optimal strategy for the game where there are $2$ consecutive marble draws is the same as the optimal strategy for the game with one draw. Then, we just multiply the expected profit by $2$ to represent the two draws. Furthermore, as this game is symmetric for the two players, their optimal strategy will be the same. This point will be important later.

$$$$

Let $A(a,b)$ be the expected profit that $A$ obtains with player $A$ putting in $a$ balls and $B$ putting in $b$ balls. Namely, for the one draw game, $$A(a,b) = \dfrac{a}{a+b} \cdot (100 - a)$$ As player $a$ draws his ball with probability $\dfrac{a}{a+b}$ and $100-a$ is the payout. Let's fix $b$ and find the $a$ that is the best response to this $b$. In other words, given $b$, what $a$ optimizes $A(a,b)$? To do this, we take the partial derivative of $A(a,b)$ in $a$ and treat $a$ as continuous for now. We will then account for discreteness at the end.

$$$$

This yields that $$\dfrac{\partial}{\partial a}A(a,b) = -\dfrac{a^2 + 2ba - 100b}{(a+b)^2} = 0 \iff a^2 + 2ba - 100b = 0$$

Solving the above with the quadratic equation yields that $a^* = \dfrac{-2b \pm \sqrt{4b^2 + 400b}}{2}$. However, the $-$ root results in a negative value, so $a^* = \sqrt{b^2 + 100b} - b$ is the best response for player $A$ if player $B$ puts $b$ marbles in. Similarly, as this game is symmetric, the optimal response for player $B$ if player $A$ puts $a$ marbles in is $b^* = \sqrt{a^2 - 100a} - a$. 

$$$$

To find the optimal strategy for each player, this means that we need to find the combo $(a^*,b^*)$ such that neither of the players can do better by adjusting their strategy. We already are aware from before that $a^* = b^*$ by the symmetry of the game. Therefore, to solve for this, we just substitute in $b$ as $b^* = a^*$ in the first equation. This yields we can say that $$a^* = \sqrt{(a^*)^2 + 100a^*} - a^* \iff 4(a^*)^2 = (a^*)^2 + 100a^* \iff a^*(3a^* - 100) = 0 \iff a^* = 0,\dfrac{100}{3}$$ As $0$ is not possible, we conclude that $a^* = b^* = \dfrac{100}{3}$ is the optimal strategy. However, this is not actually possible, as our marbles must be an integer value. Therefore, we should test $(33,33)$ and $(34,34)$ to see if they are Nash equilibria. 

$$$$

For $(33,33)$, the expected payout for one draw for each player is $\dfrac{67}{2}$. One can check that by varying $a$ and keeping $b$ fixed at $33$, player $A$ can't do any better. Therefore, $(33,33)$ is a Nash equilibrium. For $(34,34)$, the expected payout is $33$. However, one can also verify that the expected payout for $(33,34)$ is also $33$. However, this can't be an equilibrium, as $b$ should change to $33$ marbles to yield higher expected payout. Thus, while $(34,34)$ is also a Nash equilibrium, $(33,33)$ is preferrable because of the higher expected payout. This means that the optimal strategy is for both players to place $33$ marbles and have a total expected payout of $\dfrac{67}{2} \cdot 2 = 67$.


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "67"
    ],
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "qU30v79qdGXghQmBDPen",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-30 17:57:23 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9129571,
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
    "title": "Optimal Marbles I",
    "topic": "probability",
    "urlEnding": "optimal-marbles-i",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "hard",
    "id": "qU30v79qdGXghQmBDPen",
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
    "title": "Optimal Marbles I",
    "topic": "probability",
    "urlEnding": "optimal-marbles-i"
  }
}
```
