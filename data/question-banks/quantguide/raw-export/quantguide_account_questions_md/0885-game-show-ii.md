# QuantGuide Question

## 885. Game Show II

**Metadata**

- ID: `OtE1M3B7dWFMwW3YIsX3`
- URL: https://www.quantguide.io/questions/game-show-ii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Squarepoint Capital
- Source: N/A
- Tags: Conditional Probability
- Premium: True
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-4 23:59:35 America/New_York
- Last Edited By: Gabe

### 题干

You're on a game show and are given the choice of three doors to choose from. Behind one door is a car and behind the other two are goats. You pick one of the doors at random and announce your choice to the game show host. The game show host then chooses an audience member at random, who is unaware of the prizes behind the doors, to open one of the two doors you did not choose at random. The audience member opens a door that you did not choose and happens to reveal a goat. The game show host offers you the opportunity to either keep your original door or switch to the other closed door. What is the probability that you win the car if you switch?

### Hint

What is the size of the sample space after the audience member reveals a goat and how can you use this to solve for the probability of winning the car if you switch?

### 解答

Note that we cannot use a frequentist approach to solve this problem, as the audience member would reveal the car $\frac{1}{3}$ of the time in repeated play, which is not the case in this instance. Instead, the audience member has just happened to open a door and revealed a goat. That is, the audience member removed one door from the sample space. The probability that you win the car if you switch is $\frac{1}{2}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/2"
    ],
    "companies": [
      {
        "company": "Squarepoint Capital"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "OtE1M3B7dWFMwW3YIsX3",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-4 23:59:35 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7278151,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Game Show II",
    "topic": "probability",
    "urlEnding": "game-show-ii",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Squarepoint Capital"
      }
    ],
    "difficulty": "medium",
    "id": "OtE1M3B7dWFMwW3YIsX3",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Game Show II",
    "topic": "probability",
    "urlEnding": "game-show-ii"
  }
}
```
