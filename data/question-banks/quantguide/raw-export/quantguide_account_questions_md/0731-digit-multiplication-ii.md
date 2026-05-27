# QuantGuide Question

## 731. Digit Multiplication II

**Metadata**

- ID: `UOM4YNDVIrjthIPqIQXM`
- URL: https://www.quantguide.io/questions/digit-multiplication-ii
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Jane Street
- Source: N/A
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 11:53:23 America/New_York
- Last Edited By: Gabe

### 题干

Let $A$ be the set of all integers whose digits multiply to $96$. Furthermore, let $x$ and $y$ be the minimal and maximal elements of $A$, respectively. What is $y - x$? Note that no digit can be 1, so that A is finite.

### Hint

What is the prime factorization of $96$?

### 解答

The prime factorization of $96$ is $3 \cdot 32 = 3 \cdot 2^5$. Therefore, we need to have $5$ twos and a three in our number accounted for. For the largest possible value, we should arrange the values in descending order left to right, as this would give the largest weight to digits of largest value. Therefore, our largest value is $322222$. For the smallest value, note that $2^3 = 8$ and $2 \cdot 3 = 6$. Therefore, we condense down 4 of the twos and the three into an $8$ and $6$. We can't condense more, as otherwise those digits will be larger than $10$, so the smallest value that can be made from $8$, $2$, and $6$ is clearly $268$. Thus, our answer is $322222 - 268 = 321954$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "321954"
    ],
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "UOM4YNDVIrjthIPqIQXM",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 11:53:23 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5994376,
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Digit Multiplication II",
    "topic": "brainteasers",
    "urlEnding": "digit-multiplication-ii"
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "medium",
    "id": "UOM4YNDVIrjthIPqIQXM",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Digit Multiplication II",
    "topic": "brainteasers",
    "urlEnding": "digit-multiplication-ii"
  }
}
```
