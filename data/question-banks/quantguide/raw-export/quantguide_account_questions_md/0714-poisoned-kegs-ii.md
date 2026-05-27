# QuantGuide Question

## 714. Poisoned Kegs II

**Metadata**

- ID: `1tXRmNjQ71fVaUlIKjJu`
- URL: https://www.quantguide.io/questions/poisoned-kegs-ii
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 3
- Companies: Two Sigma, SIG, Goldman Sachs, Jane Street, Five Rings, Old Mission
- Source: classic
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: 5
- Last Edited: 2023-11-4 23:46:43 America/New_York
- Last Edited By: Gabe

### 题干

A king has $10$ servants that bravely risk their lives to test whether or not the wine in $n$ kegs is poisonous. It is known that exactly one of the $n$ kegs is poisonous. If someone drinks any amount of liquor from the poisoned keg, they will die in exactly $1$ month. Otherwise, the servant will be fine. The servants only agree to participate in the wine tasting for $1$ month. What is the maximum value of $n$ such that the king is guaranteed to determine which keg among the $n$ is poisoned?

### Hint

Label the kegs in binary. Use the servants as binary indicators.

### 解答

The idea here is that we can number of kegs in binary and $0-$index them. In other words, label the kegs $0$ to $n-1$. With $10$ servants, we can have up to $10$ digits in our binary expansion of $n-1$. Similarly, we can label the people $0-9$ and write keg label $i = a_{0i} + a_{1i} \cdot 2^1 + \dots + a_{9i} \cdot 2^9$, where each of $a_{0i}, a_{1i}, \dots, a_{9i} = 0,1$. We then give wine from urn $i$ to all servants whose indices are in the subset $$S_i = \{0 \leq k \leq 9 : a_{ki} = 1\}$$ For example, if $i = 17 = 0000010001_2$, we would give wine from keg $17$ to servants $0$ and $4$. Afterwards, the sequence of servants that die lets us uniquely see which keg is poisoned. For example, if servants $0$ and $4$ die, this means that keg $17$ is poisoned. We essentially are creating a one-to-one mapping between the kegs and binary sequences of length $10$, so this means that $n = 2^{10} = 1024$ is the maximum number of kegs we can test. We can't test any more than this because there are only $2^{10}$ possible subsets of the servants, meaning that we would need two subsets of servants to test two different bottles if $n > 2^{10}$, which wouldn't allow us to uniquely identify it. 


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1024"
    ],
    "companies": [
      {
        "company": "Two Sigma"
      },
      {
        "company": "SIG"
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
    "difficulty": "medium",
    "hasEdits": false,
    "id": "1tXRmNjQ71fVaUlIKjJu",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-4 23:46:43 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5818084,
    "randomizable": "",
    "source": "classic",
    "status": "published",
    "tags": [],
    "title": "Poisoned Kegs II",
    "topic": "brainteasers",
    "urlEnding": "poisoned-kegs-ii",
    "version": 5
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
    "difficulty": "medium",
    "id": "1tXRmNjQ71fVaUlIKjJu",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Poisoned Kegs II",
    "topic": "brainteasers",
    "urlEnding": "poisoned-kegs-ii"
  }
}
```
