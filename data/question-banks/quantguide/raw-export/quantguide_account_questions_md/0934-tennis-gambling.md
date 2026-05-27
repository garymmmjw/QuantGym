# QuantGuide Question

## 934. Tennis Gambling

**Metadata**

- ID: `MzTrSL3RbdlzxT3OFMV8`
- URL: https://www.quantguide.io/questions/tennis-gambling
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: SIG, Optiver, Citadel, Goldman Sachs, DE Shaw
- Source: N/A
- Tags: Conditional Probability
- Premium: True
- Solution Free: False
- Version: 5
- Last Edited: 2023-11-7 13:13:46 America/New_York
- Last Edited By: Gabe

### 题干

The rules of tennis are the following: The scores go $0-15-30-40$ to start. If one player has 40 points and the other has less than 40 and the player with 40 points wins the next serve, this player wins the game. If both players have 40 points, the player who wins the next serve gets advantage. If the player with advantage wins again, they win the game. Otherwise, if the advantaged player loses, the game goes back to having no advantages (40-40). Imagine Rob and Bob are in a tennis match that starts out $30-30$. Rob has a probability $0.6$ of winning each serve, independent between serves. Find the probability Rob wins the game.

### Hint

What needs to happen for a winner to occur?

### 解答

The clever idea is to see that the winning player needs to obtain two consecutive wins. The probability that Rob obtains two consecutive wins is $0.6^2 = 0.36$. The probability that Bob obtains two consecutive wins is $0.4^2 = 0.16$. The probability that in the next two serves they each receive one win is $2 \cdot 0.6 \cdot 0.4 = 0.48$. If they each obtain one win in the next two serves, then the scenario is exactly the same as being tied and needing 2 consecutive wins on the next serves to win the game. Therefore, to get a winner, we just need one of the two players to obtain two consecutive wins. Accordingly, we can condition on the event that someone has obtained two consecutive wins. Given this, the probability the winner is Rob is $\dfrac{0.6^2}{0.6^2  + 0.4^2} = \dfrac{9}{13}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "9/13"
    ],
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Optiver"
      },
      {
        "company": "Citadel"
      },
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "DE Shaw"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "MzTrSL3RbdlzxT3OFMV8",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 13:13:46 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7620596,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Tennis Gambling",
    "topic": "probability",
    "urlEnding": "tennis-gambling",
    "version": 5
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Optiver"
      },
      {
        "company": "Citadel"
      },
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "DE Shaw"
      }
    ],
    "difficulty": "medium",
    "id": "MzTrSL3RbdlzxT3OFMV8",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Tennis Gambling",
    "topic": "probability",
    "urlEnding": "tennis-gambling"
  }
}
```
