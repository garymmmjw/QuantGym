# QuantGuide Question

## 916. Squid Game I

**Metadata**

- ID: `Ppu1fKAYo6hdqprGYWtI`
- URL: https://www.quantguide.io/questions/squid-game-
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: Expected Value, Discrete Random Variables
- Premium: False
- Solution Free: False
- Version: 5
- Last Edited: 2023-10-27 14:23:24 America/New_York
- Last Edited By: Gabe

### 题干

10 contestants are arranged into a line on a bridge and in front of them lay ten left tiles and ten right tiles side by side. In order to cross the bridge, the contestants must cross 10 tiles, and at each step, the person in front must pick either the left or right tile to step on. However, for each left & right tile pair, there is exactly one sturdy tile and one faulty tile, but the contestants cannot tell them apart. The contestants cross the bridge in their assigned order with the first person picking either the left or right tile, and continuing to lead unless either a faulty tile is picked (resulting in elimination) or person one reaches the other side. If the first person is eliminated before reaching the other side, the person second in line assumes the lead picking until he/she is eliminated (or reaches the other side), and so on. The winner of the game is the $\textit{first}$ person to reach the other side. Which position in line (1-indexed) should a contestant choose if they are playing optimally to win?

### Hint

What is the expected number of tiles a person will get right until they fail?

### 解答

Since a given contestant is not able to distinguish the tile, we can assume that each contest guesses a tile incorrectly with $p = 0.5$. Therefore, the expected number of tiles until a person falls is $\frac{1}{p} = 2$. Therefore, we should expect that after 5 people have gone, 10 tiles will have been chosen with the last being chosen incorrectly by the 5th person meaning we should choose to be in slot 6. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "6"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "Ppu1fKAYo6hdqprGYWtI",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-27 14:23:24 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7494564,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Squid Game I",
    "topic": "probability",
    "urlEnding": "squid-game-",
    "version": 5
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "Ppu1fKAYo6hdqprGYWtI",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Squid Game I",
    "topic": "probability",
    "urlEnding": "squid-game-"
  }
}
```
