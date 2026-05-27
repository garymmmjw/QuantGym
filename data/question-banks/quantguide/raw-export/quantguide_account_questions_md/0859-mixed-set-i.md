# QuantGuide Question

## 859. Mixed Set I

**Metadata**

- ID: `HItkBCzb7FJc5ZHH5kth`
- URL: https://www.quantguide.io/questions/mixed-set-i
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: og
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-1 08:49:58 America/New_York
- Last Edited By: Gabe

### 题干

How many subsets of $\{1,2,\dots, 10\}$ contain exactly $2$ elements from $\{1,2,3\}$?

### Hint

Consider treating the selection process in two steps.

### 解答

There are $\displaystyle \binom{3}{2} = 3$ ways to pick the two elements from $\{1,2,3\}$ that we want to include. Then, we are able to include or exclude any amount of the remaining$7$ elements, which can be done in $2^7 = 128$ ways. Therefore, our answer is $3 \cdot 128 = 384$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "384"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "HItkBCzb7FJc5ZHH5kth",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-1 08:49:58 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7026457,
    "source": "og",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Mixed Set I",
    "topic": "probability",
    "urlEnding": "mixed-set-i",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "HItkBCzb7FJc5ZHH5kth",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Mixed Set I",
    "topic": "probability",
    "urlEnding": "mixed-set-i"
  }
}
```
