# QuantGuide Question

## 668. DisCard Game

**Metadata**

- ID: `c4P1S7YFpK175KfqgNGY`
- URL: https://www.quantguide.io/questions/discard-game
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Jane Street
- Source: N/A
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-25 22:56:05 America/New_York
- Last Edited By: Gabe

### 题干

A casino offers a card game using a normal deck of 52 cards. The rule is that you turn over two cards each time. For each pair, if both cards are black, they go to the dealer's pile; if both are red, they go to your pile; else, they are discarded. The process is repeated 26 times until all cards are exhausted. If you have more cards in your pile, you win $10. Else, including ties, you get nothing. What is the fair value of this game?

### Hint

Look at this problem through the lens of symmetry. Each discarded pair has one black card and one red card. What does this tell you about the number of black and red cards remaining?

### 解答

No matter how the cards are permuted, you and the dealer will always have the same number of cards in your respective piles because each pair of discarded cards has one black and one red card, so an equal number of red and black cards are always discarded. In other words, there are an equal number of red and black cards that are not discarded and in your piles. Thus, the number of red cards left for you and the number of black cards left for the dealer are always the same and the casino always wins. You should pay $\$0$ to play this game.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0"
    ],
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "c4P1S7YFpK175KfqgNGY",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-25 22:56:05 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5361361,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [],
    "title": "DisCard Game",
    "topic": "brainteasers",
    "urlEnding": "discard-game"
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "easy",
    "id": "c4P1S7YFpK175KfqgNGY",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "DisCard Game",
    "topic": "brainteasers",
    "urlEnding": "discard-game"
  }
}
```
