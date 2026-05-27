# QuantGuide Question

## 57. 3 Larger Die

**Metadata**

- ID: `sY8mpHhFsXtZETBUuTua`
- URL: https://www.quantguide.io/questions/3-larger-die
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: DRW
- Source: DRW OA, edited
- Tags: Discrete Random Variables, Expected Value, Conditional Expectation
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-11 13:45:42 America/New_York
- Last Edited By: Gabe

### 题干

You have two fair $10-$sided dice that are colored green and yellow with values $1-10$ on each side. You roll both dice simultaneously. If they show the same value, then the game is over. If the two dice are not equal, but the yellow die shows a value at least $3$ larger than the green die, you receive $\$1$ and can roll both dice again. In all other cases, you receive nothing and can roll again. The game only ends once the two dice show the same value. What is your expected payout on this game?

### Hint

 The yellow die is at least $3$ larger than the green die with probability $\dfrac{7}{25}$.

### 解答

Let $e$ be the expected payout. The yellow die is at least $3$ larger than the green die with probability $\dfrac{7}{25}$. You can verify this by conditioning on the value of the green die and noting the number of outcomes that are satisfactory if the green die shows $k$ is $8-k$. Summing those up, you get $28$ of $100$ equally-likely outcomes. The dice show the same value with probability $\dfrac{1}{10}$. Therefore, they show different values with probability $\dfrac{31}{50}$. Applying the Law of Total Expectation on the outcome of the first roll,

$$e = \dfrac{7}{25}\cdot (e+1) + \dfrac{31}{50}e$$

If we roll a value at least $3$ larger on the yellow than the green, then it is as if our game restarts with our money being $1$ instead of $0$. Solving for $e$, we get that $\dfrac{1}{10}e = \dfrac{7}{25}$, so $e = \dfrac{14}{5}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "14/5"
    ],
    "companies": [
      {
        "company": "DRW"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "sY8mpHhFsXtZETBUuTua",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-11 13:45:42 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 420575,
    "source": "DRW OA, edited",
    "status": "published",
    "tags": [
      {
        "tag": "Discrete Random Variables"
      },
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "3 Larger Die",
    "topic": "probability",
    "urlEnding": "3-larger-die",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "DRW"
      }
    ],
    "difficulty": "easy",
    "id": "sY8mpHhFsXtZETBUuTua",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Discrete Random Variables"
      },
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "3 Larger Die",
    "topic": "probability",
    "urlEnding": "3-larger-die"
  }
}
```
