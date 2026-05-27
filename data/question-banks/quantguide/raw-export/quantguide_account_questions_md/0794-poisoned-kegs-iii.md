# QuantGuide Question

## 794. Poisoned Kegs III

**Metadata**

- ID: `vcg6MxY4GPf1Ez7cuxJK`
- URL: https://www.quantguide.io/questions/poisoned-kegs-iii
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 3
- Companies: Two Sigma, SIG, Five Rings, Goldman Sachs, Jane Street, Old Mission
- Source: og
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: 3
- Last Edited: 2024-1-20 16:55:17 America/New_York
- Last Edited By: Kaushik

### 题干

A king has $10$ servants that bravely risk their lives to test whether or not the wine in $n$ kegs is poisonous. It is known that exactly one of the $n$ kegs is poisonous. If someone drinks any amount of liquor from the poisoned keg, they will die in exactly $1$ month. Otherwise, the servant will be fine. The servants only agree to participate in the wine tasting for $1$ month. What is the maximum value of $n$ such that the king is guaranteed to have at least a $10\%$ chance to determine which keg among the $n$ is poisoned?

### Hint

Use a similar idea to Poisoned Kegs II, but now the number of kegs needs to only be narrowed down to at most $10$ possibilities.

### 解答

Using the same idea as Poisoned Kegs II, we can let each of the $10$ servants represent a binary indicator for the first $2^{10}$ kegs. Thus, in the first $2^{10}$ kegs, we will know exactly which keg is poisoned. However, now we just need to narrow it down to $10$ kegsper possible death sequence. The easiest way to do this is to have each of the $2^{10}$ subsets of servants test $10$ different kegs. Then,  if some subset of servants die, the king will know that one of those $10$ kegs that the subset of servants died to has the poison. Therefore, the king can test $10$ times as many kegs if he only wants at least a $10\%$ chance of identifying it. Therefore, the king can test up to $n = 2^{10} \cdot 10 = 10240$ kegs

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "10240"
    ],
    "companies": [
      {
        "company": "Two Sigma"
      },
      {
        "company": "SIG"
      },
      {
        "company": "Five Rings"
      },
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "Old Mission"
      }
    ],
    "difficulty": "medium",
    "hasEdits": true,
    "id": "vcg6MxY4GPf1Ez7cuxJK",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2024-1-20 16:55:17 America/New_York",
    "lastEditedBy": "Kaushik",
    "orderId": 6469891,
    "randomizable": "",
    "source": "og",
    "status": "published",
    "tags": [],
    "title": "Poisoned Kegs III",
    "topic": "brainteasers",
    "urlEnding": "poisoned-kegs-iii",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "Two Sigma"
      },
      {
        "company": "SIG"
      },
      {
        "company": "Five Rings"
      },
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "Old Mission"
      }
    ],
    "difficulty": "medium",
    "id": "vcg6MxY4GPf1Ez7cuxJK",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Poisoned Kegs III",
    "topic": "brainteasers",
    "urlEnding": "poisoned-kegs-iii"
  }
}
```
