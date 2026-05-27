# QuantGuide Question

## 741. Option Dice I

**Metadata**

- ID: `vMk8dRhvUuisziYrruSq`
- URL: https://www.quantguide.io/questions/option-dice-i
- Topic: finance
- Difficulty: easy
- Internal Difficulty: 1
- Companies: SIG, TransMarket Group, Optiver, Old Mission
- Source: https://math.stackexchange.com/questions/179534/the-expected-payoff-of-a-dice-game
- Tags: Expected Value, Finance
- Premium: False
- Solution Free: False
- Version: 5
- Last Edited: 2023-11-10 10:39:07 America/New_York
- Last Edited By: Gabe

### 题干

Pretend you have a simple options chain on the expected value of the product of two dice rolls. What would the call option at $30$ be priced at in this market?

### Hint

When does our options contract make money?

### 解答

The only time that our contract will be in the money is when we roll two 6's. When we do roll two 6's, and obtain a product of 36, and will be profiting 6 units. ($36 - 30 = 6$). Putting this together, we have a $\frac{1}{36}$ chance of of profiting 6 units, so our option should be priced at $6 \cdot \frac{1}{36} = \frac{1}{6} $

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/6"
    ],
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "TransMarket Group"
      },
      {
        "company": "Optiver"
      },
      {
        "company": "Old Mission"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "vMk8dRhvUuisziYrruSq",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-10 10:39:07 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6065639,
    "source": "https://math.stackexchange.com/questions/179534/the-expected-payoff-of-a-dice-game",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Finance"
      }
    ],
    "title": "Option Dice I",
    "topic": "finance",
    "urlEnding": "option-dice-i",
    "version": 5
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "TransMarket Group"
      },
      {
        "company": "Optiver"
      },
      {
        "company": "Old Mission"
      }
    ],
    "difficulty": "easy",
    "id": "vMk8dRhvUuisziYrruSq",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Finance"
      }
    ],
    "title": "Option Dice I",
    "topic": "finance",
    "urlEnding": "option-dice-i"
  }
}
```
