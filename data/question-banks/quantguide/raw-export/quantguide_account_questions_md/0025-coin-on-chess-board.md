# QuantGuide Question

## 25. Coin on Chess Board

**Metadata**

- ID: `PFfnRhCOoaKUv9aMGkGD`
- URL: https://www.quantguide.io/questions/coin-on-chess-board
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: SIG
- Source: SIG Example Questions (https://tracking.icims.com/f/a/WmUt3FA4fVxK2AfweB7bTQ~~/AAIB5gA~/RgRmtRoJP0Q1aHR0cHM6Ly9zaWcuY29tL2V4dHJhL0Fzc2Vzc21lbnRfU2FtcGxlX1F1ZXN0aW9ucy5wZGZXA3NwY0IKZMkJldJkTjTOm1ITa2thbmNoYXJsYUB3aXNjLmVkdVgEAAABSA~~)
- Tags: Events
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

A chess board consists of 2 inch by 2 inch squares. We toss a coin (diameter of 1 inch) that lands somewhere on the board randomly. What is the probability that the coin is completely within one of the 2 inch by 2 inch squares (not on more than 1 square)?


### Hint

Instead of analyzing the whole chess board, think about the coin only landing inside one square. 

### 解答

Because of the layout and symmetry of squares, we only need to consider if the coin fits in a 2 inch by 2 inch square. If it doesn’t, we know that it overlaps onto a neighboring square and thus doesn’t fit the criteria. In order to find the probability that a coin is fully within a square, we can calculate the area that the center of the coin can land in and divide it by the total area of a square. Given the radius of the coin is $0.5$ inches, it can’t be any closer than $0.5$ inches to any edge of the square. This gives a total area that the center can land in of $(2-0.5-0.5)^2 = 1$ square inch. The total area of the square (and thus total area that the center of the coin can land in) is $2^2=4$ square inches. This gives us the answer of $\frac{1}{4}$ = $0.25$.


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0.25",
      "1/4"
    ],
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "id": "PFfnRhCOoaKUv9aMGkGD",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 183529,
    "source": "SIG Example Questions (https://tracking.icims.com/f/a/WmUt3FA4fVxK2AfweB7bTQ~~/AAIB5gA~/RgRmtRoJP0Q1aHR0cHM6Ly9zaWcuY29tL2V4dHJhL0Fzc2Vzc21lbnRfU2FtcGxlX1F1ZXN0aW9ucy5wZGZXA3NwY0IKZMkJldJkTjTOm1ITa2thbmNoYXJsYUB3aXNjLmVkdVgEAAABSA~~)",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Coin on Chess Board",
    "topic": "probability",
    "urlEnding": "coin-on-chess-board"
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "id": "PFfnRhCOoaKUv9aMGkGD",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Coin on Chess Board",
    "topic": "probability",
    "urlEnding": "coin-on-chess-board"
  }
}
```
