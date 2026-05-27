# QuantGuide Question

## 1119. Paired Pumpkins I

**Metadata**

- ID: `JJDY9NMVh11aF8SFcI9l`
- URL: https://www.quantguide.io/questions/paired-pumpkins
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Jane Street, SIG
- Source: js
- Tags: Linear Algebra
- Premium: False
- Solution Free: False
- Version: 4
- Last Edited: 2023-9-30 18:27:24 America/New_York
- Last Edited By: Gabe

### 题干

Dracula has $3$ pumpkins, labeled $1-3$. He knows the mass of each pair of pumpkins is (in kgs) is $19, 21,$ and $28$. Let $w_1,w_2,$ and $w_3$ be the weights of the three pumpkins. If possible, find $w_1^2 +  w_2^2 + w_3^2$. If this is impossible, enter $-1$.

### Hint

Set up a system of equations. You have three unknowns (the weights) and three equations.

### 解答

Using the notation here, we can set up the system of equations $w_1 + w_2 = 19, w_2 + w_3 = 21,$ and $w_1 + w_3 = 28$. By subtracting the second equation from the first, we get that $w_1 - w_3 = -2$. Adding this new equation to the third equation yields $2w_1 = 26$, meaning $w_1 = 13$. Substituting this back in, we get $w_2 = 6$ and $w_3 = 15$. Therefore, $w_1^2 + w_2^2 + w_3^2 = 15^2 + 6^2 + 13^2 = 430$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "430"
    ],
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "JJDY9NMVh11aF8SFcI9l",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 18:27:24 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9201354,
    "source": "js",
    "status": "published",
    "tags": [
      {
        "tag": "Linear Algebra"
      }
    ],
    "title": "Paired Pumpkins I",
    "topic": "brainteasers",
    "urlEnding": "paired-pumpkins",
    "version": 4
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "id": "JJDY9NMVh11aF8SFcI9l",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Linear Algebra"
      }
    ],
    "title": "Paired Pumpkins I",
    "topic": "brainteasers",
    "urlEnding": "paired-pumpkins"
  }
}
```
