# QuantGuide Question

## 230. Three Repeat II

**Metadata**

- ID: `z5gcfSQSQozb29LWAGS6`
- URL: https://www.quantguide.io/questions/three-repeat-ii
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Old Mission, Jane Street, TransMarket Group, Optiver, SIG
- Source: N/A
- Tags: Combinatorics
- Premium: True
- Solution Free: False
- Version: 3
- Last Edited: 2023-11-8 10:01:40 America/New_York
- Last Edited By: Gabe

### 题干

A fair coin is flipped $6$ times. Find the probability of obtaining exactly $3$ consecutive heads somewhere in the $6$ flips.

### Hint

What are the possible forms of such a sequence? Do you notice any symmetry in the sequences?

### 解答

We have 4 forms that the sequence can be in, which are $HHH---$, $-HHH--$, $--HHH-$, and $---HHH$. Note that the first and second are respectively reflection of the fourth and third sequences, so we can just do the first two sequences and then multiply by $2$. For the first sequence, the 4th flip must be tails, but the other two can be either parity, so this yields $4$ possibilities. For the second outcome, the first and second dashes must be $T$, but the last can be either, so this yields $2$ outcomes. Therefore, we have a total of $2(4 + 2) = 12$ sample points that have a single run of three heads, so the probability is $\dfrac{12}{64} = \dfrac{3}{16}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3/16"
    ],
    "companies": [
      {
        "company": "Old Mission"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "TransMarket Group"
      },
      {
        "company": "Optiver"
      },
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "z5gcfSQSQozb29LWAGS6",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-8 10:01:40 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1806936,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Three Repeat II",
    "topic": "probability",
    "urlEnding": "three-repeat-ii",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "Old Mission"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "TransMarket Group"
      },
      {
        "company": "Optiver"
      },
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "id": "z5gcfSQSQozb29LWAGS6",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Three Repeat II",
    "topic": "probability",
    "urlEnding": "three-repeat-ii"
  }
}
```
