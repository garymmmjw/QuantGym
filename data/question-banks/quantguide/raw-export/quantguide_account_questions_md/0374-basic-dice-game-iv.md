# QuantGuide Question

## 374. Basic Dice Game IV

**Metadata**

- ID: `cWWlmjTQF8LMq6PA9uFV`
- URL: https://www.quantguide.io/questions/basic-dice-game-iv
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Hudson River Trading, DRW
- Source: N/A
- Tags: Conditional Expectation, Expected Value
- Premium: True
- Solution Free: False
- Version: 5
- Last Edited: 2023-11-7 12:32:13 America/New_York
- Last Edited By: Gabe

### 题干

You roll a fair die. Then, you get to roll until you obtain a value that differs from your first roll. You get paid out the value equal to the sum of all of your rolls (including the first one). What is the fair value of this game?

### Hint

Condition on the value of the first roll. Afterwards, once you have conditioned on the value of the first roll, condition on the value of the second roll to see if it matches the first roll.

### 解答

We know that the value we need to not roll depends on the value we roll first. This implores us to use Law of Total Expectation and condition on the first value that we roll. Namely, if $X_1$ is our first roll and $T$ is our total, $\mathbb{E}[T] = \displaystyle \mathbb{E}[\mathbb{E}[T \mid X_1]] = \sum_{i=1}^6 \mathbb{E}[T \mid X_1 = i]\mathbb{P}[X_1 = i]$.  $$$$  We know $\mathbb{P}[X_1 = i] = \dfrac{1}{6}$ for all $1 \leq i \leq 6$, so $\mathbb{E}[T] = \displaystyle \dfrac{1}{6}\sum_{i=1}^6 \mathbb{E}[T \mid X_1 = i]$  $$$$  To compute $\mathbb{E}[T \mid X_1 = i]$, we first know that we start with $i$ in the bank from our first roll. Therefore, $\mathbb{E}[T \mid X_1 = i] = i + \mathbb{E}[T' \mid X_1 = i]$, where $T'$ is the money that is made after the first roll.  $$$$  We know that with probability $\dfrac{1}{6}$, we roll the value $i$ again, and our bank is now $i$ larger than before and we are at the same game as before. Otherwise, with probability $\dfrac{5}{6}$, we cash out next round, as we don't roll the value $i$. If we are given that we don't roll $i$ on the second die, then our expected value would be $\dfrac{21 - i}{5}$, as the sum of the other faces is $21-i$ and each of those 5 would be equally likely if it is not the value $i$. Therefore, by Law of Total Expectation, $$\mathbb{E}[T' \mid X_1 = i] = \dfrac{1}{6}\left(i + \mathbb{E}[T' \mid X_1 = i]\right) + \dfrac{5}{6} \cdot \dfrac{21 - i}{5}$$ Solving this, we see that $i$ cancels and we obtain that $\mathbb{E}[T' \mid X_1 = i] = \dfrac{21}{5}$ for each $i$. Adding back the first roll, $\mathbb{E}[T \mid X_1 = i] = i + \dfrac{21}{5}$.  $$$$  Therefore, as $\mathbb{E}[T]$ is just the average of $\mathbb{E}[T \mid X_1 = i]$ for each $i$, so $\mathbb{E}[T] = \dfrac{1}{6} \displaystyle \sum_{i=1}^6 \left(\dfrac{21}{5} + i\right) = \dfrac{21}{5} + \dfrac{7}{2} = \dfrac{77}{10}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "7.7"
    ],
    "companies": [
      {
        "company": "Hudson River Trading"
      },
      {
        "company": "DRW"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "cWWlmjTQF8LMq6PA9uFV",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 12:32:13 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2900431,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Basic Dice Game IV",
    "topic": "probability",
    "urlEnding": "basic-dice-game-iv",
    "version": 5
  },
  "list_summary": {
    "companies": [
      {
        "company": "Hudson River Trading"
      },
      {
        "company": "DRW"
      }
    ],
    "difficulty": "medium",
    "id": "cWWlmjTQF8LMq6PA9uFV",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Basic Dice Game IV",
    "topic": "probability",
    "urlEnding": "basic-dice-game-iv"
  }
}
```
