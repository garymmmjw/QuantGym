# QuantGuide Question

## 145. Private Documents

**Metadata**

- ID: `7xOqSg88a3jasx6qLNuZ`
- URL: https://www.quantguide.io/questions/private-documents
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: puzzledquant
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-8-30 19:53:50 America/New_York
- Last Edited By: Gabe

### 题干

A quant firm wants to protect their IP. The firm only has $7$ employees. They want to ensure that a safe can be opened only when at least $4$ of them want to open it. Therefore, they put some locks on the safe. All of the locks must be unlocked to open the safe. Let $n$ be the minimum number of locks needed to achieve this goal. Let $m$ be the number of keys each of the $7$ people carries. Find $10m + n$.

### Hint

For each group of $3$ people, there must be a lock none of them can access.

### 解答

For each group of $3$ people, there must be a lock none of them can access. Otherwise, a group of $3$ would be able to unlock all of them. Therefore, there must be $\displaystyle \binom{7}{3} = 35$ locks minimum, as that is the number of subsets of $3$ people that can be made. This means $n = 35$. Then, each lock has $4$ keys, as every lock has a subset of $3$ that can't access it, so there are $35 \cdot 4 = 140$ total keys, meaning that each person must receive $20$ keys. Therefore, we have that $m = 20$. Our answer is $10 \cdot 20 + 35 = 235$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "235"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "7xOqSg88a3jasx6qLNuZ",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-30 19:53:50 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1046923,
    "source": "puzzledquant",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Private Documents",
    "topic": "brainteasers",
    "urlEnding": "private-documents",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "7xOqSg88a3jasx6qLNuZ",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Private Documents",
    "topic": "brainteasers",
    "urlEnding": "private-documents"
  }
}
```
