# QuantGuide Question

## 694. Zero Appearance

**Metadata**

- ID: `POKBjbcAYRNjqOW6Ry0e`
- URL: https://www.quantguide.io/questions/zero-appearance
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Akuna
- Source: Akuna glassdoor
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-2 20:14:39 America/New_York
- Last Edited By: Gabe

### 题干

How many positive integers at most $10000$ have the number $0$ somewhere?

### Hint

Perform complementary counting.

### 解答

We should perform complementary counting. There are $10000$ positive integers at most $10000$. There are $9$ single-digit integers that don't have a $0$. There are $9^2$ two-digit integers without $0$. There are $9^3$ three-digit integers that don't have $0$. Lastly, there are $9^4$ four-digit integers that don't have $0$. Therefore, the answer is $$10000 - (9 + 9^2 + 9^3 + 9^4) = 2620$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2620"
    ],
    "companies": [
      {
        "company": "Akuna"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "POKBjbcAYRNjqOW6Ry0e",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-2 20:14:39 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5693847,
    "source": "Akuna glassdoor",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Zero Appearance",
    "topic": "brainteasers",
    "urlEnding": "zero-appearance",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Akuna"
      }
    ],
    "difficulty": "easy",
    "id": "POKBjbcAYRNjqOW6Ry0e",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Zero Appearance",
    "topic": "brainteasers",
    "urlEnding": "zero-appearance"
  }
}
```
