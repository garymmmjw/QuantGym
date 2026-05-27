# QuantGuide Question

## 435. Poisoned Kegs I

**Metadata**

- ID: `jmnqqJzzgJrmY0tEmOFp`
- URL: https://www.quantguide.io/questions/poisoned-kegs
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 3
- Companies: SIG, Goldman Sachs, Two Sigma, Five Rings, Jane Street, Old Mission
- Source: SIG Glassdoor
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: 10
- Last Edited: 2023-11-7 12:27:34 America/New_York
- Last Edited By: Gabe

### 题干

A king has 8 kegs of liquor. 1 of the kegs is poisonous. If someone drinks any amount of liquor from the poisoned keg, they will die in exactly 1 month. 3 servants have volunteered to risk their lives for the king and test the kegs. What is the minimum number of months needed before the poisoned keg can be identified?

### Hint

Each patient can serve as a binary indicator for each keg.

### 解答

Each patient can serve as a binary indicator for each keg. Hence, only 1 month is needed to determine the poisoned keg. As an example, suppose our kegs are labeled $K_1, K_2, \ldots, K_8$. Then, we could have servant 1 try $K_1, K_3, K_5, K_7$, servant 2 try $K_2, K_3, K_6,K_7$, and servant 3 try $K_4, K_5, K_6, K_7$. Each possible configuration of how the $3$ servants die corresponds to one possible poisoned keg.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1"
    ],
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "Two Sigma"
      },
      {
        "company": "Five Rings"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "Old Mission"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "jmnqqJzzgJrmY0tEmOFp",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 12:27:34 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3482908,
    "randomizable": "",
    "source": "SIG Glassdoor",
    "status": "published",
    "tags": [],
    "title": "Poisoned Kegs I",
    "topic": "brainteasers",
    "urlEnding": "poisoned-kegs",
    "version": 10
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "Two Sigma"
      },
      {
        "company": "Five Rings"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "Old Mission"
      }
    ],
    "difficulty": "medium",
    "id": "jmnqqJzzgJrmY0tEmOFp",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Poisoned Kegs I",
    "topic": "brainteasers",
    "urlEnding": "poisoned-kegs"
  }
}
```
