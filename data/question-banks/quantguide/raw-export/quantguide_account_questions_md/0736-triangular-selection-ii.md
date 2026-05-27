# QuantGuide Question

## 736. Triangular Selection II

**Metadata**

- ID: `y5Uagxu0NXo34DXx3y13`
- URL: https://www.quantguide.io/questions/triangular-selection-ii
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Virtu Financial
- Source: original
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 3
- Last Edited: 2023-11-4 23:00:15 America/New_York
- Last Edited By: Gabe

### 题干

There are $6$ points in some space, no three of which lie on the same line. Matt and Aaron each uniformly at random select $3$ distinct points each in the space and draw a triangle with those three points as vertices. Note that while Matt can't choose the same point twice among his selections, Aaron and Matt can select the same point. What is the probability they share at least one vertex in common?

### Hint

The complement of this event is that Matt and Aaron select disjoint triangles.

### 解答

The complement of this event is that Matt and Aaron select disjoint triangles. Let Aaron's triangle be fixed arbitrarily. This consists of $3$ of the $6$ points in our space. Of the $\displaystyle \binom{6}{3} = 20$ ways that Matt can select his triangle, exactly $1$ has no vertices in common with Aaron's triangle. Namely, he has to pick the $3$ vertices Aaron did not pick. Therefore, the answer is just $1 - \dfrac{1}{20} = \dfrac{19}{20}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "19/20"
    ],
    "companies": [
      {
        "company": "Virtu Financial"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "y5Uagxu0NXo34DXx3y13",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-4 23:00:15 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6026055,
    "source": "original",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Triangular Selection II",
    "topic": "probability",
    "urlEnding": "triangular-selection-ii",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "Virtu Financial"
      }
    ],
    "difficulty": "easy",
    "id": "y5Uagxu0NXo34DXx3y13",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Triangular Selection II",
    "topic": "probability",
    "urlEnding": "triangular-selection-ii"
  }
}
```
