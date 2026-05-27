# QuantGuide Question

## 80. 1 or Bust

**Metadata**

- ID: `0DMnZaxiw8Twwz47YLps`
- URL: https://www.quantguide.io/questions/dice-game
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: heard on the street
- Tags: Discrete Random Variables, Expected Value
- Premium: False
- Solution Free: False
- Version: 4
- Last Edited: 2023-9-14 00:40:10 America/New_York
- Last Edited By: Michael

### 题干

You roll a die. If it is $1$, $2$, or $3$, you obtain $1$ and roll again. If you roll $4$ or $5$, you cash out and the game ends. If the dice is $6$, you lose your gains and the game ends. How much would you pay to play this game?

### Hint

Initially, the question may look like a Markov chain, but it is not straight forward to solve it this way. Try to directly evaluate the expectation.

### 解答

Initially, the question may look like a Markov chain, but it is not straight forward to solve it this way. For example, if you roll a $1$, $2$, or $3$, this doesn't necessarily increase your payoff by $\$1$. This is due to the fact that there is still a chance you will end the game with $\$0$. Instead, it is easier to solve this expectation directly using an infinite geometric series. Namely, the probability we receive $\$k$ payout is to roll $k$ values $1-3$ and then either a $4$ or a $5$. The probability of this is $\dfrac{1}{2^k} \cdot \dfrac{1}{3}$. Therefore,

$$\mathbb{E}(X) = \sum_{k=1}^{\infty}k \cdot\left(\frac{1}{2}\right)^k\left(\frac{1}{3}\right) = \dfrac{1}{3} \mathbb{E}[G] = \frac{2}{3}$$ where we evaluate the sum by recognizing the remaining term is the PMF of a $\text{Geom}(1/2)$ random variable, so we can say the sum is just $\mathbb{E}[G]$ for $G \sim \text{Geom}(1/2)$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2/3"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "0DMnZaxiw8Twwz47YLps",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-14 00:40:10 America/New_York",
    "lastEditedBy": "Michael",
    "orderId": 539684,
    "randomizable": "",
    "source": "heard on the street",
    "status": "published",
    "tags": [
      {
        "tag": "Discrete Random Variables"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "1 or Bust",
    "topic": "probability",
    "urlEnding": "dice-game",
    "version": 4
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "0DMnZaxiw8Twwz47YLps",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Discrete Random Variables"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "1 or Bust",
    "topic": "probability",
    "urlEnding": "dice-game"
  }
}
```
