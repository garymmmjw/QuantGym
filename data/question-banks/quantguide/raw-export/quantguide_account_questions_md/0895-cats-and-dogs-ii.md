# QuantGuide Question

## 895. Cats and Dogs II

**Metadata**

- ID: `xk90ZcIOCXovMhQkSdHs`
- URL: https://www.quantguide.io/questions/cats-and-dogs-ii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: prob hw
- Tags: Combinatorics
- Premium: True
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-1 09:10:58 America/New_York
- Last Edited By: Gabe

### 题干

Six dogs and six cats are sitting at a circular table uniformly at random. Find the probability that there are exactly four dogs in a row somewhere in the circle.

### Hint

Since this table is circular, there are $\dfrac{12!}{12} = 11!$ arrangements of the animals. As we want exactly $4$ dogs in a row, this implies that we need to have the sequence $CDDDDC$ somewhere.

### 解答

Since this table is circular, there are $\dfrac{12!}{12} = 11!$ arrangements of the animals. As we want exactly $4$ dogs in a row, this implies that we need to have the sequence $CDDDDC$ somewhere. In particular, there are $6$ ways to pick the first cat. Then, there are $6 \cdot 5 \cdot 4 \cdot 3$ ways to order the $4$ dogs in our sequence. Then, there are $5$ ways to pick the cat on the other side. Afterwards, we still have $6$ animals left over, so there are $6!$ ways to order the remaining animals. This implies that our probability is $$\dfrac{6 \cdot 6 \cdot 5 \cdot 4 \cdot 3 \cdot 5 \cdot 6!}{11!} = \dfrac{15}{77}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "15/77"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "xk90ZcIOCXovMhQkSdHs",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-1 09:10:58 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7341075,
    "source": "prob hw",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Cats and Dogs II",
    "topic": "probability",
    "urlEnding": "cats-and-dogs-ii",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "xk90ZcIOCXovMhQkSdHs",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Cats and Dogs II",
    "topic": "probability",
    "urlEnding": "cats-and-dogs-ii"
  }
}
```
