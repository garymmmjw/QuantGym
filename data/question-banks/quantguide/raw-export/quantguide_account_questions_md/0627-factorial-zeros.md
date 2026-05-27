# QuantGuide Question

## 627. Factorial Zeros

**Metadata**

- ID: `pEMvIQFlzjHs1pZ2fQW7`
- URL: https://www.quantguide.io/questions/factorial-zeros
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Jump Trading, Flow Traders, JP Morgan, SIG, DRW
- Source: classic
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: 4
- Last Edited: 2023-11-5 10:21:15 America/New_York
- Last Edited By: Gabe

### 题干

How many zeros does the expansion of $100!$ have?

### Hint

We get a zero when we have a power of $10$. As there are more integers divisible by $2$ than by $5$ in the first $100$ integers, we really just need to count the exponent of $5$ in the prime factorization of $100!$.

### 解答

We get a zero when we have a power of $10$. As there are more integers divisible by $2$ than by $5$ in the first $100$ integers, we really just need to count the exponent of $5$ in the prime factorization of $100!$. We get one power of $5$ from each of the integers $5,10,15,\dots, 100$, yielding an exponent of $20$. However, we also need to account for the terms that are divisible by $5$ multiple times. In this case, those would be divisible by $25$, so these have an extra power of $5$ that has not been stripped yet, so the integers $25,50,75,$ and $100$ have an extra power of $5$ to strip, yielding $5^{24}$ in our prime factorization. Therefore, our answer is $24$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "24"
    ],
    "companies": [
      {
        "company": "Jump Trading"
      },
      {
        "company": "Flow Traders"
      },
      {
        "company": "JP Morgan"
      },
      {
        "company": "SIG"
      },
      {
        "company": "DRW"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "pEMvIQFlzjHs1pZ2fQW7",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 10:21:15 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5010383,
    "source": "classic",
    "status": "published",
    "tags": [],
    "title": "Factorial Zeros",
    "topic": "brainteasers",
    "urlEnding": "factorial-zeros",
    "version": 4
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jump Trading"
      },
      {
        "company": "Flow Traders"
      },
      {
        "company": "JP Morgan"
      },
      {
        "company": "SIG"
      },
      {
        "company": "DRW"
      }
    ],
    "difficulty": "easy",
    "id": "pEMvIQFlzjHs1pZ2fQW7",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Factorial Zeros",
    "topic": "brainteasers",
    "urlEnding": "factorial-zeros"
  }
}
```
