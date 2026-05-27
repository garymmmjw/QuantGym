# QuantGuide Question

## 103. Black or Yellow

**Metadata**

- ID: `WtKmEI99j9rD55UBax9C`
- URL: https://www.quantguide.io/questions/black-or-yellow
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Games, Expected Value, Conditional Probability
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-5 10:25:49 America/New_York
- Last Edited By: Gabe

### 题干

There are four balls, two black and two yellow, in a box. You pick out one at a time at random without replacement. Before picking each one out, you guess at the color, and if you're right, you receive in dollars the number of balls left in the container before you chose it. For example, if you guess the first ball correctly, you would receive $\$4$ because there were 4 balls remaining in the box before you picked one out. Assuming optimal play, what is the expected payoff for this game?

### Hint

Consider each pick separately, starting with the last pick. What is the payoff of the last pick? The first pick? What is the third pick conditioned on?

### 解答

The first pick has a $\frac{1}{2}$ probability of being right with a payoff of $\$4$. The second pick has a $\frac{2}{3}$ probability of being right with a payoff of $\$3$, since you will always pick the majority choice. The third pick has two cases: with probability $\frac{1}{3}$, you chose a ball that was the last of its color in the previous turn, and thus know the color of the current ball, and with probability $\frac{2}{3}$, you chose a ball that was of the majority in the previous turn such that now there is one of each and thus the probability of being right is $\frac{1}{2}$. Both cases have a payoff of $\$2$. And finally, by elimination you know the fourth ball with a payoff of $\$1$. Thus, the total payoff of the game is:  $$\frac{1}{2} \times 4 + \frac{2}{3} \times 3 + \frac{1}{3} \times 2 + \frac{2}{3} \times \frac{1}{2} \times 2 + \frac{1}{1} \times 1 = \frac{19}{3}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "19/3"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "WtKmEI99j9rD55UBax9C",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 10:25:49 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 752024,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Games"
      },
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Black or Yellow",
    "topic": "brainteasers",
    "urlEnding": "black-or-yellow",
    "version": 2
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "WtKmEI99j9rD55UBax9C",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Games"
      },
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Black or Yellow",
    "topic": "brainteasers",
    "urlEnding": "black-or-yellow"
  }
}
```
