# QuantGuide Question

## 863. Coordinate Jumper

**Metadata**

- ID: `MzXK3NVxYXUtxodyMedO`
- URL: https://www.quantguide.io/questions/coordinate-jumper
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Morgan Stanley
- Source: Glassdoor
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-25 23:35:47 America/New_York
- Last Edited By: Gabe

### 题干

How many paths are there from $(0,0,0)$ to $(3,4,5)$ in 3D space if we move only right, forward or up one unit at each step?

### Hint

Any path from $(0,0,0)$ to $(3,4,5)$ will consist of $3,4,$ and $5$ movements in the $x,y,$ and $z-$directions, respectively.

### 解答

Any path from $(0,0,0)$ to $(3,4,5)$ will consist of $3,4,$ and $5$ movements in the $x,y,$ and $z-$directions, respectively. Therefore, the number of distinct paths can really be written as an anagram of $XXXYYYYZZZZZ$, where $X,Y,$ and $Z$ represent movements in the $x,y,$ and $z-$directions, respectively.  There are $$\displaystyle \binom{12}{3,4,5} = \dfrac{12!}{3!4!5!} = 27720$$ such sequences, so this is our answer.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "27720"
    ],
    "companies": [
      {
        "company": "Morgan Stanley"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "MzXK3NVxYXUtxodyMedO",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-25 23:35:47 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7043191,
    "source": "Glassdoor",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Coordinate Jumper",
    "topic": "probability",
    "urlEnding": "coordinate-jumper"
  },
  "list_summary": {
    "companies": [
      {
        "company": "Morgan Stanley"
      }
    ],
    "difficulty": "easy",
    "id": "MzXK3NVxYXUtxodyMedO",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Coordinate Jumper",
    "topic": "probability",
    "urlEnding": "coordinate-jumper"
  }
}
```
