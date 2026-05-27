# QuantGuide Question

## 872. Game Show I

**Metadata**

- ID: `KMVlVzNb9aE2rLa10nkY`
- URL: https://www.quantguide.io/questions/game-show-i
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: IMC, Squarepoint Capital
- Source: N/A
- Tags: Conditional Probability
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-4 23:59:33 America/New_York
- Last Edited By: Gabe

### 题干

You're on a game show and are given the choice of three doors to choose from. Behind one door is a car and behind the other two are goats. You pick one of the doors at random and announce your choice to the game show host. The game show host, knowing which prize is behind each door, opens a door that you did not choose and shows a goat after hearing your initial choice. He offers you the opportunity to either keep your original door or switch to the other closed door. What is the probability that you win the car if you switch?

### Hint

How can you use Bayes' theorem to solve the conditional probability?

### 解答

Let us look at the strategy in which you switch. With this strategy, you would only lose if you happen to pick the door with the car behind it on the first try, which happens with probability $\frac{1}{3}$. In other words, you would win whenever you happen to choose a goat on the first try, which happens with probability $\frac{2}{3}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2/3"
    ],
    "companies": [
      {
        "company": "IMC"
      },
      {
        "company": "Squarepoint Capital"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "KMVlVzNb9aE2rLa10nkY",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-4 23:59:33 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7107115,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Game Show I",
    "topic": "probability",
    "urlEnding": "game-show-i",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "IMC"
      },
      {
        "company": "Squarepoint Capital"
      }
    ],
    "difficulty": "medium",
    "id": "KMVlVzNb9aE2rLa10nkY",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Game Show I",
    "topic": "probability",
    "urlEnding": "game-show-i"
  }
}
```
