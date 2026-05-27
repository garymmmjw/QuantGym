# QuantGuide Question

## 351. Delayed Ruin

**Metadata**

- ID: `dVfaWDcITd2GARpRY6de`
- URL: https://www.quantguide.io/questions/delayed-ruin
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: ross edited
- Tags: Conditional Probability, Discrete Random Variables
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-4 13:55:14 America/New_York
- Last Edited By: Gabe

### 题干

A gambler starts with $\$n$, where $n \geq 1$ is an integer. Each round, the gambler wins or loses $\$1$ with respective probabilities $p$ and $1-p$. Once the gambler has $\$0$ left, he leaves the table. Find the probability that the gambler ruins after $n + 2k$ rounds of playing the game, where $k \geq 0$ is an integer. The probability can be written as a function $f(p,n,k)$. Compute $f(1/3, 5,3)$ to the nearest ten-thousandth.


### Hint

Use the result of Voter Mayhem I and consider using the result looking back from the end of the ruin sequence.

### 解答

We are going to use the result of Voter Mayhem I (often called the "Ballot Theorem"). For the gambler to ruin in exactly $n + 2k$ rounds, the gambler must win exactly $k$ of the rounds and lose $n+k$ of the rounds. The probability that the gambler obtains exactly $k$ wins in $n + 2k$ rounds of the game is $$\binom{n+2k}{k}p^k(1-p)^{n+k}$$ 

Now, consider looking from the last round back to the start. The number of losses must always be strictly leading compared to the number of wins. If the number of wins/losses equalize beforehand, the gambler would be bankrupt at an earlier state than $n+2k$, which we don't want to happen. Therefore, given that $n+2k$ rounds are played, the probability this is the position at which the gambler goes bankrupt is just the probability that the number of losses always is strictly ahead of the number of wins (when counted from the point of ruin), which is $$\dfrac{(n+k)-k}{n+2k} = \dfrac{n}{n+2k}$$ Therefore, the answer is $$\binom{n+2k}{k}p^k(1-p)^{n+k} \cdot \dfrac{n}{n+2k}$$ Plugging in the respective values, the answer is approximately $0.1084$.


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0.1084"
    ],
    "companies": [],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "dVfaWDcITd2GARpRY6de",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-4 13:55:14 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2695975,
    "randomizable": "",
    "source": "ross edited",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Delayed Ruin",
    "topic": "probability",
    "urlEnding": "delayed-ruin",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "hard",
    "id": "dVfaWDcITd2GARpRY6de",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Delayed Ruin",
    "topic": "probability",
    "urlEnding": "delayed-ruin"
  }
}
```
