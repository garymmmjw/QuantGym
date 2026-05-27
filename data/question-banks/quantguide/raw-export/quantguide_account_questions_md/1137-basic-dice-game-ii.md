# QuantGuide Question

## 1137. Basic Dice Game II

**Metadata**

- ID: `5zUhm9chHvPtpj5XahTC`
- URL: https://www.quantguide.io/questions/basic-dice-game-ii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Hudson River Trading, JP Morgan, SIG, Chicago Trading Company, Optiver, Akuna, Citadel, Jane Street, DRW, Goldman Sachs, Belvedere Trading, TransMarket Group
- Source: N/A
- Tags: Expected Value
- Premium: True
- Solution Free: False
- Version: 11
- Last Edited: 2023-11-8 10:11:19 America/New_York
- Last Edited By: Gabe

### 题干

A casino offers you a game with a six-sided die where you are paid the value of the roll. The casino lets you roll the first time. If you are happy with your roll, you can cash out. Else, you can choose to roll a second time. If you are happy with your roll, you can cash out on this second value. Else, you can choose to roll for your third and final time and cash out on this third value. What is the fair value of this game?

### Hint

From the expected value of the last roll, you know the expected value of the second roll. Based on the expected value of the second roll, you can understand when you want to re-roll and find your expected value at the start of the game.

### 解答

The fair value of the last roll is 3.5, and thus you should only opt to roll a third time if your second roll is less than 3.5. Your expected value for the second roll is then $\frac{3}{6} \times 5 + \frac{3}{6} \times 3.5 = 4.25$. Similarly, you should only opt to roll your second time if the first roll is less than 4.25. Your expected value for the first roll is thus $\frac{2}{6} \times 5.5 + \frac{4}{6} \times 4.25 \approx 4.67.$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "14/3"
    ],
    "companies": [
      {
        "company": "Hudson River Trading"
      },
      {
        "company": "JP Morgan"
      },
      {
        "company": "SIG"
      },
      {
        "company": "Chicago Trading Company"
      },
      {
        "company": "Optiver"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "Citadel"
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
    "difficulty": "medium",
    "hasEdits": false,
    "id": "5zUhm9chHvPtpj5XahTC",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-8 10:11:19 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9381433,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Basic Dice Game II",
    "topic": "probability",
    "urlEnding": "basic-dice-game-ii",
    "version": 11
  },
  "list_summary": {
    "companies": [
      {
        "company": "Hudson River Trading"
      },
      {
        "company": "JP Morgan"
      },
      {
        "company": "SIG"
      },
      {
        "company": "Chicago Trading Company"
      },
      {
        "company": "Optiver"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "Citadel"
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
    "difficulty": "medium",
    "id": "5zUhm9chHvPtpj5XahTC",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Basic Dice Game II",
    "topic": "probability",
    "urlEnding": "basic-dice-game-ii"
  }
}
```
