# QuantGuide Question

## 144. 2 Below I

**Metadata**

- ID: `6ckoRXAQAoeFkQkNKcRO`
- URL: https://www.quantguide.io/questions/2-below-i
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: Jane Street, Citadel
- Source: tqd
- Tags: Games
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-10 19:09:13 America/New_York
- Last Edited By: Gabe

### 题干

You and friend play a game where you both select an integer $1-100$. The winner receives $\$1$ from the loser. The winner is the player who selects the strictly higher number. If there is a tie, then nothing happens. However, a player can also win by selecting a value exactly $2$ below the larger integer. For example, if you select $80$ and your friend selects $82$, you are the winner in this case. Assume both you and your friend play optimally. The optimal strategy here is a mixed strategy, where you select a random value $X$ from some appropriately determined distribution. Find $\text{Var}(X)$.

### Hint

Suppose you were planning to select a value $n$. Note that $n+3$ is strictly better than $n$, as $n+3$ will beat all integers $n$ would beat, as well as the integer $n+2$. Therefore, whenever you can select $n$, you should select $n+3$.

### 解答

Suppose you were planning to select a value $n$. Note that $n+3$ is strictly better than $n$, as $n+3$ will beat all integers $n$ would beat, as well as the integer $n+2$. Therefore, whenever you can select $n$, you should select $n+3$. This means that your strategy should be to select $98,99,$ or $100$ with some probabilities. 

$$$$

By the symmetry of the game, your friend should also select those values with the same probabilities. In particular, if you select $98-100$ with equal probability, no matter what probabilities your friend selects $98,99,$ and $100$ with, the expected payout for each player is $0$ by symmetry. This is because we see that $98$ is beat by $99$, $99$ is beat by $100$, and $100$ is beat by $98$, so each of the three outcomes is dominated by one other outcome. 

$$$$

Furthermore, if you select a non-uniform distribution on $98,99,100$ for your values, there exists a strategy your friend can select that yields positive expected payout for them. The probabilities of selecting each of the values for you would be $p_1,p_2,$ and $1-p_1-p_2$. For a numerical demonstration, say $p_1 = 1/5$ and $p_2 = 1/2$. Then your friend should always select the value that maximizes their probability of winning. In this case, they should select $100$, as the expected payout would be $$(-1) \cdot \dfrac{1}{5} + (1) \cdot \dfrac{1}{2} + (0) \cdot \dfrac{3}{10} > 0$$ Namely, if $x$ is the value assigned to probability $\text{max}\{p_1,p_2,1-p_1-p_2\}$, then your friend should always select the value that beats $x$. Therefore, to eliminate this opportunity, you should select a uniform distribution among $98-100$. 

$$$$

This means $X \sim \text{DiscreteUnif}(\{98,99,100\})$, so $\mathbb{E}[X] = 99$ and $\text{Var}(X) = \dfrac{(98-99)^2 + (99-99)^2 + (100-99)^2}{3} = \dfrac{2}{3}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2/3"
    ],
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "Citadel"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "6ckoRXAQAoeFkQkNKcRO",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-10 19:09:13 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1035478,
    "source": "tqd",
    "status": "published",
    "tags": [
      {
        "tag": "Games"
      }
    ],
    "title": "2 Below I",
    "topic": "probability",
    "urlEnding": "2-below-i",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "Citadel"
      }
    ],
    "difficulty": "medium",
    "id": "6ckoRXAQAoeFkQkNKcRO",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Games"
      }
    ],
    "title": "2 Below I",
    "topic": "probability",
    "urlEnding": "2-below-i"
  }
}
```
