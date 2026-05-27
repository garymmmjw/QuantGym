# QuantGuide Question

## 1085. Face Value

**Metadata**

- ID: `RLBt0N7vA5HV5SiTqijf`
- URL: https://www.quantguide.io/questions/face-value
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Jane Street
- Source: N/A
- Tags: Conditional Expectation, Expected Value, Games
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-9 21:25:24 America/New_York
- Last Edited By: Gabe

### 题干

Ten cards with values $1-10$ are face down in front of you. You select one card at random and look at it. You can either choose the payout of $\$3.50$ or the face value of the card. What is the fair value of this game?

### Hint

Use Law of Total Expectation to condition on the outcome of the card.

### 解答

With probability $\dfrac{3}{10}$, the card is worth less than the payout, so you should choose the payout of $3.5$. Otherwise, you should take the face value of the card. Therefore, the expected value is $$\dfrac{3}{10} \cdot \dfrac{7}{2} + \dfrac{7}{10} \cdot \dfrac{4 + 5 + 6 + 7 + 8 + 9 + 10}{7} = \$5.95$$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "5.95"
    ],
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "RLBt0N7vA5HV5SiTqijf",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-9 21:25:24 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8867211,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Games"
      }
    ],
    "title": "Face Value",
    "topic": "probability",
    "urlEnding": "face-value",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "easy",
    "id": "RLBt0N7vA5HV5SiTqijf",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Games"
      }
    ],
    "title": "Face Value",
    "topic": "probability",
    "urlEnding": "face-value"
  }
}
```
