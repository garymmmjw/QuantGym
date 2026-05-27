# QuantGuide Question

## 223. Red Card Deal

**Metadata**

- ID: `XAVhdtbX4K7LKgxW56Ca`
- URL: https://www.quantguide.io/questions/red-card-deal
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Jump Trading
- Source: jump
- Tags: Games
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-16 13:52:42 America/New_York
- Last Edited By: Gabe

### 题干

A dealer presents to you the following game: The dealer is going to deal cards from the top of a standard deck one card at a time and turn them over on a table for you to see. You can tell the dealer to stop dealing at any time. If the next card is red, you win. Assuming optimal play, what is the highest probability you can achieve of being correct?

### Hint

Initially, it seems as if you can gain a small advantage in this game by waiting for the first moment when the red cards in the remaining deck outnumber the black. However, this may never happen. The question is now if that benefit outweighs the risk. 

### 解答

Initially, it seems as if you can gain a small advantage in this game by waiting for the first moment when the red cards in the remaining deck outnumber the black. However, this may never happen. The question is now if that benefit outweighs the risk. The answer is no, and we can show this now. 

$$$$

Suppose you elect to use some strategy, say $S$, to this game. Now, apply $S$ to the game where instead of the next card being red, the last card in the deck is red. The probability of you winning is the same in each game, as each of the remaining unturned cards has the same probability of being red. However, the probability of winning in the second game, regardless of your strategy, is $1/2$, as we always ask for the last card to be red. Therefore, it doesn't matter what strategy you use for this game, as it will always be probability $1/2$ of winning. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/2"
    ],
    "companies": [
      {
        "company": "Jump Trading"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "XAVhdtbX4K7LKgxW56Ca",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-16 13:52:42 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1790876,
    "source": "jump",
    "status": "published",
    "tags": [
      {
        "tag": "Games"
      }
    ],
    "title": "Red Card Deal",
    "topic": "probability",
    "urlEnding": "red-card-deal",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jump Trading"
      }
    ],
    "difficulty": "medium",
    "id": "XAVhdtbX4K7LKgxW56Ca",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Games"
      }
    ],
    "title": "Red Card Deal",
    "topic": "probability",
    "urlEnding": "red-card-deal"
  }
}
```
