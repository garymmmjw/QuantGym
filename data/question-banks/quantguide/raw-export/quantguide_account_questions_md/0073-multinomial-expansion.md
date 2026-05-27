# QuantGuide Question

## 73. Multinomial Expansion

**Metadata**

- ID: `5iJReArd0SzcVShClhCZ`
- URL: https://www.quantguide.io/questions/multinomial-expansion
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: gabe, edited
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-10-2 22:48:07 America/New_York
- Last Edited By: Gabe

### 题干

How many terms are there in the expansion of $(x_1 + x_2 + x_3 + x_4 + x_5 + x_6)^{18}$ after all like terms have been combined?

### Hint

 Note that each term of the expansion is going to be in the form $x_1^{e_1}\dots x_6^{e_6}$. What is the sum of these exponents?

### 解答

 Note that each term of the expansion is going to be in the form $x_1^{e_1}\dots x_6^{e_6}$, where $e_1 + \dots + e_6 = 18$ and $e_i \geq 0$ are integers. This is because we choose one of the $x_i$'s from each of the $18$ terms of the product, so the exponents of all the $x_i$ together must sum to $18$. Therefore, we have that we just want the number of non-negative solutions to $e_1 + \dots + e_6 = 18$, with $e_i \geq 0$ are integers. By stars and bars, this is $\displaystyle \binom{23}{5}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "33649"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "5iJReArd0SzcVShClhCZ",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-2 22:48:07 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 500813,
    "source": "gabe, edited",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Multinomial Expansion",
    "topic": "probability",
    "urlEnding": "multinomial-expansion",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "5iJReArd0SzcVShClhCZ",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Multinomial Expansion",
    "topic": "probability",
    "urlEnding": "multinomial-expansion"
  }
}
```
