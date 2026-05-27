# QuantGuide Question

## 1180. Dice Order II

**Metadata**

- ID: `2ydosQmJNnrqIy1KjcBc`
- URL: https://www.quantguide.io/questions/dice-order-ii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Squarepoint Capital
- Source: N/A
- Tags: Combinatorics, Discrete Random Variables
- Premium: True
- Solution Free: False
- Version: 3
- Last Edited: 2023-11-5 00:30:21 America/New_York
- Last Edited By: Gabe

### 题干

You roll three fair dice. What is the probability that the highest value rolled is a four?

### Hint

In order for the maximum to be exactly four, the maximum must be less than or equal to four, but not less than or equal to three.

### 解答

A brute force approach is possible, but a more analytical approach will be provided here. In order for the maximum to be exactly four, the maximum must be less than or equal to four, but not less than or equal to three. In order words: $$P(\textrm{max} = 4) = P(\textrm{max} \leq 4) - P(\textrm{max} \leq 3)$$ $$=\frac{4}{6} \times \frac{4}{6} \times \frac{4}{6} - \frac{3}{6} \times \frac{3}{6} \times \frac{3}{6}$$ $$=\frac{37}{216}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "37/216"
    ],
    "companies": [
      {
        "company": "Squarepoint Capital"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "2ydosQmJNnrqIy1KjcBc",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 00:30:21 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9803734,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Dice Order II",
    "topic": "probability",
    "urlEnding": "dice-order-ii",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "Squarepoint Capital"
      }
    ],
    "difficulty": "medium",
    "id": "2ydosQmJNnrqIy1KjcBc",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Dice Order II",
    "topic": "probability",
    "urlEnding": "dice-order-ii"
  }
}
```
