# QuantGuide Question

## 389. Dice Order I

**Metadata**

- ID: `KKMwzKTIUf7a61DjJa6L`
- URL: https://www.quantguide.io/questions/dice-order-i
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Squarepoint Capital
- Source: N/A
- Tags: Conditional Probability, Combinatorics
- Premium: False
- Solution Free: False
- Version: 3
- Last Edited: 2023-11-5 00:01:03 America/New_York
- Last Edited By: Gabe

### 题干

You roll two fair dice. What is the probability that the highest value rolled is a four?

### Hint

A brute force approach is possible, but a more analytical approach will be prove to be more useful. In order for the maximum to be exactly four, the maximum must be less than or equal to four, but not less than or equal to three.

### 解答

A brute force approach is possible, but a more analytical approach will be provided here. In order for the maximum to be exactly four, the maximum must be less than or equal to four, but not less than or equal to three. In order words:

$$P(\textrm{max} = 4) = P(\textrm{max} \leq 4) - P(\textrm{max} \leq 3)$$

$$=\frac{4}{6} \times \frac{4}{6} - \frac{3}{6} \times \frac{3}{6}$$

$$=\frac{7}{36}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "7/36"
    ],
    "companies": [
      {
        "company": "Squarepoint Capital"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "KKMwzKTIUf7a61DjJa6L",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 00:01:03 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3023241,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Dice Order I",
    "topic": "probability",
    "urlEnding": "dice-order-i",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "Squarepoint Capital"
      }
    ],
    "difficulty": "medium",
    "id": "KKMwzKTIUf7a61DjJa6L",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Dice Order I",
    "topic": "probability",
    "urlEnding": "dice-order-i"
  }
}
```
