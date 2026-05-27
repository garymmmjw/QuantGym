# QuantGuide Question

## 233. Compound Game

**Metadata**

- ID: `5fbWsNmb2lxzMJjfWRSV`
- URL: https://www.quantguide.io/questions/compound-game
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Conditional Expectation
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

You are given a fair $6-$sided die and play the following game: You are paid the upface of every roll. If you roll an odd value, the game is over. If you roll an even value, you flip a fair coin. If it lands on tails, the game is over. If it lands on heads, you roll again and repeat the same coin flip process after your roll. Find the expected payout from this game.

### Hint

Condition on the parity of the first roll.

### 解答

Let $T$ be the total payout and $X_1$ be your first roll. Since our potential future outcomes depend on whether or not $X_1$ is even or odd, we should condition on the parity of $X_1$. Namely, $\mathbb{E}[T] = \mathbb{E}[\mathbb{E}[T \mid X_1]]$. If $X_1$ is odd, we are done, and our expected payout is $\dfrac{1+3+5}{3} = 3$. If $X_1$ is even, our expected payout from the first round is $4$, and then we get to flip a fair coin. With probability $\dfrac{1}{2}$, we get to roll again, so in the even case, our expected payout is $4 + \dfrac{1}{2}\mathbb{E}[T]$, as with probability $\dfrac{1}{2}$ we go again. Therefore, by LOTE, $$\mathbb{E}[T]  = \dfrac{1}{2} \cdot 3 + \dfrac{1}{2}\left(4 + \dfrac{1}{2}\mathbb{E}[T]\right)$$ Solving for $\mathbb{E}[T]$ in the above yields $\mathbb{E}[T] = \dfrac{14}{3}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "14/3"
    ],
    "difficulty": "easy",
    "id": "5fbWsNmb2lxzMJjfWRSV",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 1837961,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Compound Game",
    "topic": "probability",
    "urlEnding": "compound-game"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "5fbWsNmb2lxzMJjfWRSV",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Compound Game",
    "topic": "probability",
    "urlEnding": "compound-game"
  }
}
```
