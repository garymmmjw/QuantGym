# QuantGuide Question

## 599. Option Dice II

**Metadata**

- ID: `g3lsfS30ZrFoGxLXU6H9`
- URL: https://www.quantguide.io/questions/option-dice-ii
- Topic: finance
- Difficulty: easy
- Internal Difficulty: 2
- Companies: TransMarket Group, SIG, Optiver, Old Mission
- Source: https://math.stackexchange.com/questions/179534/the-expected-payoff-of-a-dice-game
- Tags: Games, Finance, Expected Value
- Premium: False
- Solution Free: False
- Version: 4
- Last Edited: 2023-11-10 10:39:03 America/New_York
- Last Edited By: Gabe

### 题干

Pretend you have a simple options chain on the expected value of the product of two dice rolls. What would the put option at $4$ be priced at in this market?

### Hint

When does our contract make money and how much?

### 解答

First, we need to see how many combinations of dice rolls land us in profit. Listed in increasing order they are $(1,1), (1,2), (2,1), (1,3), (3,1)$. With these combinations, a roll of $(1,1)$ yields a profit of $3$ units ($4-1 = 3$) with a $\frac{1}{36}$ chance in doing so, a roll of $(1,2)$ or $(2,1)$ yields a profit of $2$ units ($4-2 = 2$) with a $\frac{2}{36}$ chance in doing so, and a roll of $(1,3)$ or $(3,1)$ yields a profit of $1$ units ($4-3 = 1$) with a $\frac{2}{36}$ chance in doing so.
$$$$
Putting this all together we have $\frac{1}{36} \cdot 3 + \frac{2}{36} \cdot 2 + \frac{2}{36} \cdot 1 = \frac{9}{36}$, showing our contract should be priced at $1/4$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/4"
    ],
    "companies": [
      {
        "company": "TransMarket Group"
      },
      {
        "company": "SIG"
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
    "id": "g3lsfS30ZrFoGxLXU6H9",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-10 10:39:03 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4771484,
    "source": "https://math.stackexchange.com/questions/179534/the-expected-payoff-of-a-dice-game",
    "status": "published",
    "tags": [
      {
        "tag": "Games"
      },
      {
        "tag": "Finance"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Option Dice II",
    "topic": "finance",
    "urlEnding": "option-dice-ii",
    "version": 4
  },
  "list_summary": {
    "companies": [
      {
        "company": "TransMarket Group"
      },
      {
        "company": "SIG"
      },
      {
        "company": "Optiver"
      },
      {
        "company": "Old Mission"
      }
    ],
    "difficulty": "easy",
    "id": "g3lsfS30ZrFoGxLXU6H9",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Games"
      },
      {
        "tag": "Finance"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Option Dice II",
    "topic": "finance",
    "urlEnding": "option-dice-ii"
  }
}
```
