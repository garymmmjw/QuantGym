# QuantGuide Question

## 875. Digit Multiplication I

**Metadata**

- ID: `2bYBU5s3K9bdcf0qUmG7`
- URL: https://www.quantguide.io/questions/digit-multiplication-i
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Jane Street
- Source: N/A
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 11:42:58 America/New_York
- Last Edited By: Gabe

### 题干

What is the smallest positive integer whose digits multiply to $10000$?

### Hint

Consider the prime factorization of $10000$. How can you order (and condense) the factors optimally to minimize the integer?

### 解答

The prime factorization of $10000$ is $10000 = 10^4 = 2^4 \cdot 5^4$. Therefore, our number needs to have $4$ of each $2$ and $5$. Note that $2^3 = 8$, so we can condense three of the $2$s into a single digit. Therefore, we need to make the smallest possible number using $4$ of the digit $5$ and one each of $2$ and $8$. We should arrange the digits from left to right in increasing order of value to make the number as small as possible. This is because the digits furthest to the left have the highest magnitude in terms of the final number. Therefore, the answer is $255558$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "255558"
    ],
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "2bYBU5s3K9bdcf0qUmG7",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 11:42:58 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7167824,
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Digit Multiplication I",
    "topic": "brainteasers",
    "urlEnding": "digit-multiplication-i"
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "medium",
    "id": "2bYBU5s3K9bdcf0qUmG7",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Digit Multiplication I",
    "topic": "brainteasers",
    "urlEnding": "digit-multiplication-i"
  }
}
```
