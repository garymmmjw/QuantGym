# QuantGuide Question

## 847. Picky Primes

**Metadata**

- ID: `nROiD79SNLJeTHYuMuew`
- URL: https://www.quantguide.io/questions/picky-primes
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Jane Street, SIG
- Source: N/A
- Tags: Events, Combinatorics
- Premium: False
- Solution Free: False
- Version: 3
- Last Edited: 2023-8-30 18:38:40 America/New_York
- Last Edited By: Gabe

### 题干

4 distinct integers are drawn from the set of the first $16$ positive prime integers. Find the probability that the sum is even.

### Hint

All primes besides $2$ are odd.

### 解答

All primes besides $2$ are odd, so we get a sum that is odd precisely when we select integers that are all not $2$. In other words, we select our $4$ integers from the other $15$ primes. There are $\displaystyle \binom{15}{4}$ ways to pick the $4$ from the other $15$ and $\displaystyle \binom{16}{4}$ total ways to pick $4$ primes from the $16$. Therefore, our probability is $$\displaystyle\dfrac{\displaystyle \binom{15}{4}}{\displaystyle \binom{16}{4}} = \dfrac{3}{4}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3/4"
    ],
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "nROiD79SNLJeTHYuMuew",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-30 18:38:40 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6917072,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      },
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Picky Primes",
    "topic": "probability",
    "urlEnding": "picky-primes",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "id": "nROiD79SNLJeTHYuMuew",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Events"
      },
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Picky Primes",
    "topic": "probability",
    "urlEnding": "picky-primes"
  }
}
```
