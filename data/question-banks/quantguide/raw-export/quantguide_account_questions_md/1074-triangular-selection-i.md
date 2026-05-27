# QuantGuide Question

## 1074. Triangular Selection I

**Metadata**

- ID: `zXAnfMYFmdcmDKl6KB8z`
- URL: https://www.quantguide.io/questions/triangular-selection-i
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Virtu Financial
- Source: MAO
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 4
- Last Edited: 2023-11-4 23:00:11 America/New_York
- Last Edited By: Gabe

### 题干

There are $8$ points in some space, no three of which lie on the same line. Matt and Aaron each uniformly at random select $3$ points in the space. Matt and Aaron respectively draw a triangle whose vertices are the $3$ points they selected. What is the probability they end up with the same triangle?

### Hint

There are $\displaystyle \binom{8}{3} = 56$ triangles that can be formed from the $8$ points

### 解答

There are $\displaystyle \binom{8}{3} = 56$ triangles that can be formed from the $8$ points, as any selection of $3$ points will yield a triangle. Fix Aaron's triangle first. Then of the $56$ triangles Matt can form, exactly $1$ will be Aaron's so the answer is $\dfrac{1}{56}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/56"
    ],
    "companies": [
      {
        "company": "Virtu Financial"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "zXAnfMYFmdcmDKl6KB8z",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-4 23:00:11 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8752548,
    "source": "MAO",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Triangular Selection I",
    "topic": "probability",
    "urlEnding": "triangular-selection-i",
    "version": 4
  },
  "list_summary": {
    "companies": [
      {
        "company": "Virtu Financial"
      }
    ],
    "difficulty": "easy",
    "id": "zXAnfMYFmdcmDKl6KB8z",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Triangular Selection I",
    "topic": "probability",
    "urlEnding": "triangular-selection-i"
  }
}
```
