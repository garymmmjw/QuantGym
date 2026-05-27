# QuantGuide Question

## 491. Game Show III

**Metadata**

- ID: `0HJsrzmxm8M5KRA8W3bb`
- URL: https://www.quantguide.io/questions/game-show-iii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Akuna, Squarepoint Capital
- Source: Kaushik - Akuna Interview
- Tags: Events
- Premium: True
- Solution Free: False
- Version: 4
- Last Edited: 2023-11-4 23:59:44 America/New_York
- Last Edited By: Gabe

### 题干

You're on a game show and are given the choice of $10$ doors to choose from. Behind one door is $\$1000$ and behind the other nine are goats. You pick one of the doors at random and announce your choice to the game show host. The game show host, knowing which prize is behind each door, opens three doors that you did not choose and shows goats behind all of them after hearing your initial choice. He offers you the opportunity to either keep your original door or switch to the other closed door. What is the expected value of this game in dollars? Assume goats are worth $\$0$.

### Hint

Which strategy should you go into this game with?

### 解答

If you have not done the problem "Game Show I", please do so before this question. From "Game Show I", we already know the best choice is to always switch doors. Now the problem is to calculate the EV of the game. 
$$$$
$\frac{9}{10}^{\text{ths}}$ of the time, you pick a door with a goat initially. Given the strategy of always switching after the three doors with goats behind them are revealed, we are left with $6$ doors to switch to, one of which has the cash prize. Thus the probability we switch to the cash prize door is $\frac{9}{10}\cdot\frac{1}{6} = 0.15$. 
$$$$
The other $\frac{1}{10}^{\text{th}}$ of the time, we initially pick the cash prize door and switch to a losing door.
Thus the EV of this game is $0.15\cdot\$1000 = \$150$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "150"
    ],
    "companies": [
      {
        "company": "Akuna"
      },
      {
        "company": "Squarepoint Capital"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "0HJsrzmxm8M5KRA8W3bb",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-4 23:59:44 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3898635,
    "source": "Kaushik - Akuna Interview",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Game Show III",
    "topic": "probability",
    "urlEnding": "game-show-iii",
    "version": 4
  },
  "list_summary": {
    "companies": [
      {
        "company": "Akuna"
      },
      {
        "company": "Squarepoint Capital"
      }
    ],
    "difficulty": "medium",
    "id": "0HJsrzmxm8M5KRA8W3bb",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Game Show III",
    "topic": "probability",
    "urlEnding": "game-show-iii"
  }
}
```
