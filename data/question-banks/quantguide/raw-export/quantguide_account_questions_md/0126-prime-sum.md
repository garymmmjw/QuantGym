# QuantGuide Question

## 126. Prime Sum

**Metadata**

- ID: `5L97yoZafJqEbTa5sif3`
- URL: https://www.quantguide.io/questions/prime-sum
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Jane Street
- Source: Jane Street Glassdoor
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Two distinct prime integers between $1$ and $20$, inclusive, are selected uniformly at random. Find the probability their sum is even.

### Hint

The prime integers at most $20$ are $2,3,5,7,11,13,17,$ and $19$, which yields $8$ total integers.

### 解答

The prime integers at most $20$ are $2,3,5,7,11,13,17,$ and $19$, which yields $8$ total integers. There are $8 \cdot 7 = 56$ ways to pick $2$ integers ordered for the sum. Our sum is even exactly when we don't select $2$. Therefore, there are $7 \cdot 6 = 42$ ways to pick two prime integers that aren't $2$. Therefore, our probability is $$\dfrac{42}{56} = \dfrac{3}{4}$$

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
      }
    ],
    "difficulty": "easy",
    "id": "5L97yoZafJqEbTa5sif3",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 878613,
    "source": "Jane Street Glassdoor",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Prime Sum",
    "topic": "probability",
    "urlEnding": "prime-sum"
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "easy",
    "id": "5L97yoZafJqEbTa5sif3",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Prime Sum",
    "topic": "probability",
    "urlEnding": "prime-sum"
  }
}
```
