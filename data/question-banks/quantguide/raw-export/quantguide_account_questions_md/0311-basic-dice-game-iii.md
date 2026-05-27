# QuantGuide Question

## 311. Basic Dice Game III

**Metadata**

- ID: `yMH1jlCaVuaxqrPQn5P0`
- URL: https://www.quantguide.io/questions/basic-dice-game-iii
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: DRW
- Source: N/A
- Tags: Conditional Expectation, Expected Value
- Premium: True
- Solution Free: False
- Version: 7
- Last Edited: 2023-11-7 12:32:06 America/New_York
- Last Edited By: Gabe

### 题干

A casino offers you a game with a six-sided die where you are paid the value of the roll. If you roll a $1, 2,$ or $3$, the game stops and you are paid out. Else, you add the value to your total sum and get to continue rolling. What is the fair value of this game?

### Hint

Your total payoff is dependent on the outcome of the first dice. What are the possible outcomes, their associated probabilities, and how can you utilize the Law of Total Expectation?

### 解答

Your payoff is dependent on the first roll, so we can use the Law of Total Expectation.  Let $x$ be the fair value of this game. There is a $\frac{1}{2}$ probability that you roll a 1, 2, or 3 (on average 2). The other $\frac{1}{2}$ of the time, you roll a 4, 5, or 6 (on average 5), add this to your total, and essentially restart the game with an expected value of $x$. Thus, we can write: $$x = \frac{1}{2} \times (2) + \frac{1}{2} \times (x + 5)$$ $$x = 7$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "7"
    ],
    "companies": [
      {
        "company": "DRW"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "yMH1jlCaVuaxqrPQn5P0",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 12:32:06 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2431683,
    "randomizable": "",
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
    "title": "Basic Dice Game III",
    "topic": "probability",
    "urlEnding": "basic-dice-game-iii",
    "version": 7
  },
  "list_summary": {
    "companies": [
      {
        "company": "DRW"
      }
    ],
    "difficulty": "easy",
    "id": "yMH1jlCaVuaxqrPQn5P0",
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
    "title": "Basic Dice Game III",
    "topic": "probability",
    "urlEnding": "basic-dice-game-iii"
  }
}
```
