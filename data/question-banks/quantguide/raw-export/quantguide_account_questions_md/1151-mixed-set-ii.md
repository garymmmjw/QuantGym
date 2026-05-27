# QuantGuide Question

## 1151. Mixed Set II

**Metadata**

- ID: `pw4ElYUhoZ0WGGFt6c3g`
- URL: https://www.quantguide.io/questions/mixed-set-ii
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: og
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-1 08:52:31 America/New_York
- Last Edited By: Gabe

### 题干

How many subsets of $\{1,2,\dots, 10\}$ contain exactly $2$ elements from $\{1,2,3\}$ AND only have odd elements?

### Hint

Consider breaking the selection process up into two parts.

### 解答

Since we must have exactly $2$ elements from $\{1,2,3\}$, we must have selected $\{1,3\}$, as the other $2$ combinations include a $2$, which is not odd. Then, we have the option to include or exclude any elements in $\{5,7,9\}$, which can be done in $2^3 = 8$ ways, so our answer is $1 \cdot 8 = 8$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "8"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "pw4ElYUhoZ0WGGFt6c3g",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-1 08:52:31 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9527432,
    "source": "og",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Mixed Set II",
    "topic": "probability",
    "urlEnding": "mixed-set-ii",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "pw4ElYUhoZ0WGGFt6c3g",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Mixed Set II",
    "topic": "probability",
    "urlEnding": "mixed-set-ii"
  }
}
```
