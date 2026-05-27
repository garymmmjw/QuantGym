# QuantGuide Question

## 343. Russian Roulette I

**Metadata**

- ID: `lUZ4706dJLR2TESWSuzi`
- URL: https://www.quantguide.io/questions/russian-roulette-i
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Jane Street, TransMarket Group
- Source: N/A
- Tags: Conditional Probability
- Premium: False
- Solution Free: False
- Version: 4
- Last Edited: 2023-11-8 09:57:11 America/New_York
- Last Edited By: Gabe

### 题干

You're playing a game of Russian Roulette with a friend. The six-chambered revolver is loaded with one bullet. Initially, the cylinder is spun to randomize the order of the chambers. The two of you take turns pulling the trigger until the person who fires the gun loses. Given that the cylinder is not re-spun after each turn, what is the probability that you win if your friend goes first?

### Hint

After the cylinder is initially spun, the position of the bullet is fixed.

### 解答

After the cylinder is initially spun, the position of the bullet is fixed. Thus, you win if the bullet is in chambers 1, 3, or 5, and lose if the bullet is in chambers 2, 4, or 6. The probability of winning is $\frac{1}{2}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/2"
    ],
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "TransMarket Group"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "lUZ4706dJLR2TESWSuzi",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-8 09:57:11 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2607332,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Russian Roulette I",
    "topic": "probability",
    "urlEnding": "russian-roulette-i",
    "version": 4
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "TransMarket Group"
      }
    ],
    "difficulty": "medium",
    "id": "lUZ4706dJLR2TESWSuzi",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Russian Roulette I",
    "topic": "probability",
    "urlEnding": "russian-roulette-i"
  }
}
```
