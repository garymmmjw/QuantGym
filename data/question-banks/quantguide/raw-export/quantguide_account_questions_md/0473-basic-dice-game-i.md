# QuantGuide Question

## 473. Basic Dice Game I

**Metadata**

- ID: `6SYodAWDG4UNJfNX5E53`
- URL: https://www.quantguide.io/questions/basic-dice-game-i
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Akuna, SIG, Citadel, Chicago Trading Company, Optiver, JP Morgan, Hudson River Trading, Jane Street, DRW, Goldman Sachs, Belvedere Trading, TransMarket Group
- Source: N/A
- Tags: Expected Value, Conditional Expectation
- Premium: False
- Solution Free: False
- Version: 13
- Last Edited: 2023-11-8 10:11:14 America/New_York
- Last Edited By: Gabe

### 题干

A casino offers you a game with a six-sided die where you are paid the value of the roll. The casino lets you roll the first time. If you are happy with your roll, you can cash out. Else, you can choose to re-roll and cash out on this second value. What is the fair value of this game?

### Hint

What is the expected value of the final roll and how does this affect your choice to re-roll?

### 解答

The fair value of the second roll is $\frac{1+2+3+4+5+6}{6} = 3.5$. Thus, you should only opt to re-roll if your first roll was below this, since you know that the second roll will do better on average. In other words, you will not re-roll if you obtain a 4, 5, or 6, which happens $\frac{1}{2}$ of the time with an expectation of 5. Hence, the fair value of this game is:

$$\frac{1}{2} \times 5 + \frac{1}{2} \times 3.5 = 4.25$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "4.25"
    ],
    "companies": [
      {
        "company": "Akuna"
      },
      {
        "company": "SIG"
      },
      {
        "company": "Citadel"
      },
      {
        "company": "Chicago Trading Company"
      },
      {
        "company": "Optiver"
      },
      {
        "company": "JP Morgan"
      },
      {
        "company": "Hudson River Trading"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "DRW"
      },
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "Belvedere Trading"
      },
      {
        "company": "TransMarket Group"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "6SYodAWDG4UNJfNX5E53",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-8 10:11:14 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3780885,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Basic Dice Game I",
    "topic": "probability",
    "urlEnding": "basic-dice-game-i",
    "version": 13
  },
  "list_summary": {
    "companies": [
      {
        "company": "Akuna"
      },
      {
        "company": "SIG"
      },
      {
        "company": "Citadel"
      },
      {
        "company": "Chicago Trading Company"
      },
      {
        "company": "Optiver"
      },
      {
        "company": "JP Morgan"
      },
      {
        "company": "Hudson River Trading"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "DRW"
      },
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "Belvedere Trading"
      },
      {
        "company": "TransMarket Group"
      }
    ],
    "difficulty": "easy",
    "id": "6SYodAWDG4UNJfNX5E53",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Basic Dice Game I",
    "topic": "probability",
    "urlEnding": "basic-dice-game-i"
  }
}
```
