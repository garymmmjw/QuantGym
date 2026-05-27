# QuantGuide Question

## 86. Multinomial Sum

**Metadata**

- ID: `ipzz45f1ZLqERuqwCYdM`
- URL: https://www.quantguide.io/questions/multinomial-sum
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: original
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-27 10:45:23 America/New_York
- Last Edited By: Gabe

### 题干

Find the sum of all multinomial coefficients $\displaystyle \binom{7}{b_1,b_2,b_3,b_4}$, where $b_1 + \dots + b_4 = 7$ and each $b_i \geq 0$ is an integer.

### Hint

Try to interpret this combinatorially. What is this counting?

### 解答

Looking at an individual multinomial coefficient, it counts the number of ways to put $7$ distinct balls into $4$ distinct boxes with a certain amount in each box. Therefore, the sum over all such multinomial coefficients is just the number of ways to put $7$ distinct balls into $4$ distinct boxes, which can be done in $4^7 = 16384$ ways.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "16384"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "ipzz45f1ZLqERuqwCYdM",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-27 10:45:23 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 581209,
    "source": "original",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Multinomial Sum",
    "topic": "probability",
    "urlEnding": "multinomial-sum",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "ipzz45f1ZLqERuqwCYdM",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Multinomial Sum",
    "topic": "probability",
    "urlEnding": "multinomial-sum"
  }
}
```
