# QuantGuide Question

## 891. Uniform Equilibrium II

**Metadata**

- ID: `ja6ySwVJnBfz6hXZXq8A`
- URL: https://www.quantguide.io/questions/uniform-equilibrium-ii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: https://math.stackexchange.com/questions/3049003/does-this-simple-continuous-game-have-nash-equilibria?rq=1
- Tags: Games
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-3 10:58:21 America/New_York
- Last Edited By: Gabe

### 题干

Two players, say $1$ and $2$, simultaneously pick real numbers in the interval $[0,1]$. The payoff of Player $1$ (equal to the loss of Player $2$) is the absolute distance between those numbers. There exists a non-pure Nash equilibrium. Under rational play from both players, find the expected payoff for Player $1$.

### Hint

The idea here is that Player $2$ should go for the point that minimizes the maximum possible distance that Player $1$ can be from the point. What does player $1$ need to do?

### 解答

The idea here is that Player $2$ should go for the point that minimizes the maximum possible distance that Player $1$ can be from the point. Having Player $2$ always select $1/2$ would limit Player $1$ to earning at most $1/2$. For player $1$, they would want to select the values $0$ or $1$ only. If player $1$ always selects $0$, for example, then player $2$ can do better by just lowering his value. Therefore, he should run a mixed strategy with values $0$ and $1$. If player $1$ biases towards one of $0$ or $1$, player $2$ can do better on average by selecting a value closer to whichever one has higher probability. Therefore, player $1$ should choose equally at random between $0$ and $1$. 

$$$$

All of this yields an expected payout of $1/2$ for player $1$, as no matter which of $0$ or $1$ player $1$ selects, the payout is $1/2$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/2"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "ja6ySwVJnBfz6hXZXq8A",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-3 10:58:21 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7316431,
    "source": "https://math.stackexchange.com/questions/3049003/does-this-simple-continuous-game-have-nash-equilibria?rq=1",
    "status": "published",
    "tags": [
      {
        "tag": "Games"
      }
    ],
    "title": "Uniform Equilibrium II",
    "topic": "probability",
    "urlEnding": "uniform-equilibrium-ii",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "ja6ySwVJnBfz6hXZXq8A",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Games"
      }
    ],
    "title": "Uniform Equilibrium II",
    "topic": "probability",
    "urlEnding": "uniform-equilibrium-ii"
  }
}
```
