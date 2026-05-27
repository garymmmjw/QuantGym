# QuantGuide Question

## 205. Valuable Hearts

**Metadata**

- ID: `rANc3xfwocUuLpoDHUh2`
- URL: https://www.quantguide.io/questions/valuable-hearts
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Optiver
- Source: optiver glassdoor
- Tags: Expected Value
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-4 20:05:32 America/New_York
- Last Edited By: Gabe

### 题干

Suppose that each card in a standard deck is given a value equal to it's face, with $A = 1, J = 11, Q = 12,$ and $K = 13$. However, any card that is heart is doubled in value (ex: Ace of Hearts is worth $2$). Find the expected value of a uniformly at random selected card from the deck.

### Hint

Consider the sum of all values in the deck.

### 解答

The sum of all the values of the cards in the deck is $5 \cdot \sum_{i=1}^{13} i$, as each suit contribute $1 + 2 + \dots + 13$ to the total expect hearts, which contributes $2 \cdot (1 + 2 + \dots + 13)$. There are $52$ total cards in the deck, so the expected value of a random card is $$\dfrac{5 \cdot \frac{13 \cdot 14}{2}}{52} = \dfrac{35}{4}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "35/4"
    ],
    "companies": [
      {
        "company": "Optiver"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "rANc3xfwocUuLpoDHUh2",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-4 20:05:32 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1574008,
    "source": "optiver glassdoor",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Valuable Hearts",
    "topic": "probability",
    "urlEnding": "valuable-hearts",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Optiver"
      }
    ],
    "difficulty": "easy",
    "id": "rANc3xfwocUuLpoDHUh2",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Valuable Hearts",
    "topic": "probability",
    "urlEnding": "valuable-hearts"
  }
}
```
