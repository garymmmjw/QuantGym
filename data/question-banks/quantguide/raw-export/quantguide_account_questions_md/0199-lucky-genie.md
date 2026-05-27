# QuantGuide Question

## 199. Lucky Genie

**Metadata**

- ID: `ZljCpAX86NgWCrGvi9B6`
- URL: https://www.quantguide.io/questions/lucky-genie
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: Games, Expected Value
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-8-26 14:26:21 America/New_York
- Last Edited By: Gabe

### 题干

A genie rolls a fair $6-$sided die. You can bet on the outcome of the die being even or odd. For every $\$4$ you bet on the die being even, you will receive $\$6$ back if correct. Similarly, for every $\$6$ you bet on the die being odd, you will receive $\$9$ back. Playing optimally, how much should you bet on this game?

### Hint

Compute the expected value with $x$ units on even and $y$ on odd.

### 解答

Suppose we bet $x$ units on even and $y$ on odd. Then our total bet is $4x+6y$. Our expected profit from this game would be $0.5 \cdot 6x + 0.5 \cdot 9y = 3x + 4.5y = \dfrac{3}{4} \cdot (4x + 6y)$. Therefore, our expected value in return is $\dfrac{3}{4}$ of our bet, so we should not play this game with an expected value of 0.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "ZljCpAX86NgWCrGvi9B6",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 14:26:21 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1514639,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Games"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Lucky Genie",
    "topic": "probability",
    "urlEnding": "lucky-genie",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "ZljCpAX86NgWCrGvi9B6",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Games"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Lucky Genie",
    "topic": "probability",
    "urlEnding": "lucky-genie"
  }
}
```
