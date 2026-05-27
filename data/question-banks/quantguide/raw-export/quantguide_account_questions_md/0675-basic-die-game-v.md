# QuantGuide Question

## 675. Basic Die Game V

**Metadata**

- ID: `tBV1rw3ujb99lcI3U6j1`
- URL: https://www.quantguide.io/questions/basic-die-game-v
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Jane Street
- Source: quantbible
- Tags: Expected Value, Conditional Expectation, Games
- Premium: False
- Solution Free: False
- Version: 4
- Last Edited: 2023-11-7 12:32:16 America/New_York
- Last Edited By: Gabe

### 题干

Alice rolls a fair $6-$sided die with the values $1-6$ on the sides. She sees that value showing up and then is allowed to decide whether or not she wants to roll again. The re-roll costs $\$1$. If she decides to stop, Alice receives a payout equal to the upface of the die. If she rolls again, she receives a payout equal to the upfaces of the second roll. Assuming optimal play by Alice, what is her expected payout on this game?

### Hint

The expected value of a fair die roll is $3.5$. The cost of the re-roll is $\$1$. Therefore, the expected payout if Alice decides to roll again is $2.5$. What values should Alice not roll again?

### 解答

The expected value of a fair die roll is $3.5$. The cost of the re-roll is $\$1$. Therefore, the expected payout if Alice decides to roll again is $2.5$. This means Alice should accept any value at least $3$ on her first roll and roll again otherwise. Namely, if $P$ is Alice's payout and $X_1$ is the value of the first die roll, then $$\mathbb{E}[P] = \mathbb{E}[P \mid X_1 \leq 2]\mathbb{P}[X_1 \leq 2] + \mathbb{E}[P \mid X_1 > 2]\mathbb{P}[X_1 > 2]$$ The two probabilities are $1/3$ and $2/3$, respectively. Then, $\mathbb{E}[P \mid X_1 \leq 2] = 2.5$ by our discussion above about the expected payout upon rolling again. $\mathbb{E}[P \mid X_1 > 2] = \dfrac{3 + 4 + 5 + 6}{4} = 4.5$, as each of the values $> 2$ are equally-likely. Therefore, $$\mathbb{E}[P] = \dfrac{1}{3} \cdot \dfrac{5}{2} + \dfrac{2}{3} \cdot \dfrac{9}{2} = \dfrac{23}{6}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "23/6"
    ],
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "tBV1rw3ujb99lcI3U6j1",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 12:32:16 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5451877,
    "source": "quantbible",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Games"
      }
    ],
    "title": "Basic Die Game V",
    "topic": "probability",
    "urlEnding": "basic-die-game-v",
    "version": 4
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "easy",
    "id": "tBV1rw3ujb99lcI3U6j1",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Games"
      }
    ],
    "title": "Basic Die Game V",
    "topic": "probability",
    "urlEnding": "basic-die-game-v"
  }
}
```
