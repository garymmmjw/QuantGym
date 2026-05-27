# QuantGuide Question

## 132. Colorful Bracelet

**Metadata**

- ID: `5E36FtiEtgdXG1LroFe9`
- URL: https://www.quantguide.io/questions/colorful-bracelet
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Old Mission
- Source: OMC OA
- Tags: Combinatorics
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-9 21:17:28 America/New_York
- Last Edited By: Gabe

### 题干

How many unique bracelet configurations can be made with $3$ red and $3$ blue beads? Configurations that can be made as rotations of other configurations are considered indistinguishable. Do not consider symmetry over flipping the bracelet. For example, $$RRGRGG \neq RRGGRG$$

### Hint

Consider cases based on the number of distinct regions that the red beads form.

### 解答

There are three cases to consider here. The first is that all three red beads are together. In this case, we get exactly $1$ distinguishable bracelet, as the others are just rotations. The second case is that we have 2 distinct regions i.e. $2$ beads are together separated from the last one. This means that blue beads are at both ends of the $2$ consecutive red bead region. Therefore, you get $2$ distinct bracelets by ordering the last red and blue bead. The last case is that all of the red bead are separated from one another, in which case we also get $1$ bead that alternates in color. Adding these up yields $4$ bracelets. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "4"
    ],
    "companies": [
      {
        "company": "Old Mission"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "5E36FtiEtgdXG1LroFe9",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-9 21:17:28 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 915548,
    "source": "OMC OA",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Colorful Bracelet",
    "topic": "probability",
    "urlEnding": "colorful-bracelet",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Old Mission"
      }
    ],
    "difficulty": "easy",
    "id": "5E36FtiEtgdXG1LroFe9",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Colorful Bracelet",
    "topic": "probability",
    "urlEnding": "colorful-bracelet"
  }
}
```
