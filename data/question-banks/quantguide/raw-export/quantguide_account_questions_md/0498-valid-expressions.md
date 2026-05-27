# QuantGuide Question

## 498. Valid Expressions

**Metadata**

- ID: `2maMQkGQ7o9XpJiXah2w`
- URL: https://www.quantguide.io/questions/valid-expressions
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: IMC
- Source: combinatorics jhu
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-27 14:11:51 America/New_York
- Last Edited By: Gabe

### 题干

How many valid arithmetic expressions using only $*$ and $+$ are there that include the values $123456789$ in order? Some examples include $1 + 2 + 3456 + 7 * 89, 123 + 456 * 78 + 9,$ and $123456789$.

### Hint

Consider all sequences in the form $1-2-3-4-5-6-7-8-9$. What can fill each dash?

### 解答

Consider all sequences in the form $1-2-3-4-5-6-7-8-9$. We know that each $-$ can either be a $+,*,$ or nothing. That gives $3$ options for each of the $8$ dashes that we listed, so there are $3^8$ possible sequences by the multiplication rule.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "6561"
    ],
    "companies": [
      {
        "company": "IMC"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "2maMQkGQ7o9XpJiXah2w",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-27 14:11:51 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3959912,
    "source": "combinatorics jhu",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Valid Expressions",
    "topic": "probability",
    "urlEnding": "valid-expressions",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "IMC"
      }
    ],
    "difficulty": "easy",
    "id": "2maMQkGQ7o9XpJiXah2w",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Valid Expressions",
    "topic": "probability",
    "urlEnding": "valid-expressions"
  }
}
```
