# QuantGuide Question

## 784. Lucky Chuck

**Metadata**

- ID: `a3GvaoF5l7j678tgXJeF`
- URL: https://www.quantguide.io/questions/lucky-chuck
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: https://math.stackexchange.com/questions/4746235/the-game-of-chuck-a-luck
- Tags: Games, Expected Value
- Premium: True
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-26 23:06:29 America/New_York
- Last Edited By: Aaron

### 题干

You are playing a game in which you may bet on any number 1 through 6. Three dice are then rolled. If the selected number appears on one, two, or three of the dice, you receive respectively one, two, or three times your original bet plus your money back; else you lose your bet. What is your expected payoff of playing this game with a bet size of $\$20$.

### Hint

Calculate loss on the unit level. With no dice being -1 unit, 1 match being 1 unit, and so on.

### 解答

This is a problem in which we need to calculate the probabilities of each event and then our net gain/loss from them. To roll 3 dice and not roll our selected number is a probability of $\frac{5}{6}^3$, in which case we lose our initial bet (a unit value we can denote as -1).
$$$$
Next, we calculate the odds of only getting 1 of our dice to match our selected number, which is $3\choose1$ $\cdot $$\frac{5}{6}^2 \cdot \frac{1}{6} = \frac{75}{216}$, in which case we gain 1 unit of value. 
$$$$
For 2 dice to match, it's $3\choose2$ $\cdot $$\frac{5}{6} \cdot \frac{1}{6}^2 = \frac{15}{216}$ with a value of 2 units. And for 3 dice to match, it's $\frac{1}{6}^3 = \frac{1}{216}$ with a value of 3 units.
$$$$
This makes our expected unit value of playing the game $\frac{−1 \cdot 125 + 1 \cdot 75 + 2 \cdot 15 + 3 \cdot 1}{216}= \frac{−17}{216}$
$$$$
With a bet size of $\$20$ and $1$ play, we are expecting to lose $20 \cdot \frac{-340}{216}$ on average, or $\frac{-85}{54}$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "-85/54"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "a3GvaoF5l7j678tgXJeF",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-26 23:06:29 America/New_York",
    "lastEditedBy": "Aaron",
    "orderId": 6376397,
    "source": "https://math.stackexchange.com/questions/4746235/the-game-of-chuck-a-luck",
    "status": "published",
    "tags": [
      {
        "tag": "Games"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Lucky Chuck",
    "topic": "probability",
    "urlEnding": "lucky-chuck",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "a3GvaoF5l7j678tgXJeF",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Games"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Lucky Chuck",
    "topic": "probability",
    "urlEnding": "lucky-chuck"
  }
}
```
