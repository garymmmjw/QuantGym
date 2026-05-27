# QuantGuide Question

## 993. Double Evens

**Metadata**

- ID: `Wv27W02aXITfuvMeX9vJ`
- URL: https://www.quantguide.io/questions/double-evens
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: og
- Tags: Games, Expected Value, Conditional Expectation
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-22 09:53:06 America/New_York
- Last Edited By: Gabe

### 题干

A fair $6-$sided die is rolled. You are paid the face value if the value is odd and twice the face value if it is even. You are allowed to re-roll the die one time if you want and keep the last value rolled. Find the expected payoff of this game under a rational strategy.

### Hint

What is the expected value of the die? Based on this, when should you re-roll? What is the probability of a re-roll under this strategy?

### 解答

The expected value of a roll of this die is $\dfrac{1 + 4 + 3 + 8 + 5 + 12}{6} = 5.5$. Therefore, we should re-roll this die if we receive anything below $5.5$ in value. In other words, we keep only a $4$ or $6$ appearing. With probability $\dfrac{1}{3}$, we don't re-roll and our expected value would be $\dfrac{8+12}{2} = 10$ given that we don't re-roll under this strategy. Otherwise, with probability $\dfrac{2}{3}$ we re-roll, in which our expected value is $\dfrac{11}{2}$. Therefore, the expected payoff of the game is $\dfrac{2}{3} \cdot \dfrac{11}{2} + \dfrac{1}{3} \cdot 10 = 7$.


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "7"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "Wv27W02aXITfuvMeX9vJ",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-22 09:53:06 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8111717,
    "source": "og",
    "status": "published",
    "tags": [
      {
        "tag": "Games"
      },
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Double Evens",
    "topic": "probability",
    "urlEnding": "double-evens",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "Wv27W02aXITfuvMeX9vJ",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Games"
      },
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Double Evens",
    "topic": "probability",
    "urlEnding": "double-evens"
  }
}
```
