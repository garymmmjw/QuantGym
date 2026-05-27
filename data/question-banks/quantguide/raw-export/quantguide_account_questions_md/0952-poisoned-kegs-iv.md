# QuantGuide Question

## 952. Poisoned Kegs IV

**Metadata**

- ID: `j2fLLevrqdhp030papX3`
- URL: https://www.quantguide.io/questions/poisoned-kegs-iv
- Topic: brainteasers
- Difficulty: hard
- Internal Difficulty: 3
- Companies: SIG, Two Sigma, Goldman Sachs, Jane Street, Five Rings, Old Mission
- Source: og
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: 3
- Last Edited: 2023-11-4 23:46:51 America/New_York
- Last Edited By: Gabe

### 题干

A king has $5$ servants that bravely risk their lives to test whether or not the wine in $n$ kegs is poisonous. It is known that exactly one of the $n$ kegs is poisonous. If someone drinks any amount of liquor from the poisoned keg, they will die in exactly $1$ month. Otherwise, the servant will be fine. The servants agree to participate in the wine tasting for $3$ months. What is the maximum value of $n$ such that the king is guaranteed to determine which keg among the $n$ is poisoned?

### Hint

Think about a base $4$ expansion.

### 解答

We are going to use a similar idea to Poisoned Kegs II. We used binary expansion in Poisoned Kegs II since we only had $1$ month, so each servant could either drink or not drink from a given keg. Now, we can assign some servants to drink at the first month, second month, and third month. With $5$ servants, we convert each keg label $i = a_{0i} + a_{1i} \cdot 4^1 + a_{2i} \cdot 4^2 + a_{3i} \cdot 4^3 + a_{4i} \cdot 4^4$, where each $a_{ki} = 0,1,2,3$ for $0 \leq k \leq 4$. If $a_{ki} = 0$, we don't have servant $k$ drink from keg $i$ at all. If $a_{ki} = r$ for $r > 0$, servant $k$ drinks from keg $i$ in month $r$. 

$$$$

When a servant dies, we now record which servant died and what hour they died in. From that, we can reconstruct the keg that was poisoned. For example, if our sequence is $10321$, the poisoned keg was $1 + 2 \cdot 4^1 + 3 \cdot 4^2 + 0 \cdot 4^3 + 1 \cdot 4^4 = 313$. We have now created a bijection between base $4$ expansions of length $5$ and the keg labels, so we can test up to $n = 4^5 = 1024$ kegs. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1024"
    ],
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Two Sigma"
      },
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "Five Rings"
      },
      {
        "company": "Old Mission"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "j2fLLevrqdhp030papX3",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-4 23:46:51 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7773119,
    "randomizable": "",
    "source": "og",
    "status": "published",
    "tags": [],
    "title": "Poisoned Kegs IV",
    "topic": "brainteasers",
    "urlEnding": "poisoned-kegs-iv",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Two Sigma"
      },
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "Five Rings"
      },
      {
        "company": "Old Mission"
      }
    ],
    "difficulty": "hard",
    "id": "j2fLLevrqdhp030papX3",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Poisoned Kegs IV",
    "topic": "brainteasers",
    "urlEnding": "poisoned-kegs-iv"
  }
}
```
