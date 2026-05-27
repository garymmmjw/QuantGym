# QuantGuide Question

## 442. Dice Roll Intuition

**Metadata**

- ID: `QT6iaBAxA3S4oz4g53ta`
- URL: https://www.quantguide.io/questions/dice-roll-intuition
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: SIG
- Source: SIG
- Tags: Conditional Expectation
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-9 21:24:35 America/New_York
- Last Edited By: Gabe

### 题干

Do not use a pen for the question. We are playing a game; we roll a fair, 6-sided die repeatedly. We stop playing the game when we get two specific numbers in a row; the payoff is equal to the total number of rolls of the die. For our two specific numbers, should we have a preference for (case 1) 4 then 5, or (case 2) 4 then 4, or (case 3) would it not matter? Respond with the number of the case.

### Hint

Think about which one takes more time to appear on average.

### 解答

Consider the transition graph for both cases, where we consider three states: (A) no specific numbers, (B) the first specific number, and (C) 2 specific numbers in a row. There is a slight difference in the two transition graphs; namely, there is a $\frac{2}{3}$ probability of returning to state A when we work with case 1, whereas there is a $
\frac{5}{6}$ probability of returning to state A when considering case 2. Since we want to maximize the number of rolls it takes for us to finish the game, we would prefer case 2. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2"
    ],
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "QT6iaBAxA3S4oz4g53ta",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-9 21:24:35 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3515024,
    "source": "SIG",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Dice Roll Intuition",
    "topic": "probability",
    "urlEnding": "dice-roll-intuition",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "medium",
    "id": "QT6iaBAxA3S4oz4g53ta",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Dice Roll Intuition",
    "topic": "probability",
    "urlEnding": "dice-roll-intuition"
  }
}
```
