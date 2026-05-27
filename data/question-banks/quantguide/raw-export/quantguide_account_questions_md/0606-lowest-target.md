# QuantGuide Question

## 606. Lowest Target

**Metadata**

- ID: `Od57KAWeLkJET1zWrTYo`
- URL: https://www.quantguide.io/questions/lowest-target
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Optiver
- Source: test
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 3
- Last Edited: 2023-11-4 20:30:20 America/New_York
- Last Edited By: Gabe

### 题干

An archer is shooting at targets. There are 4 columns of identical targets, each with $2,3,3,$ and $4$ targets stacked vertically, respectively. The archer first selects a column and then shoots the lowest-hanging target in that column that is not broken. Once a column is out of targets, it is no longer able to be selected. In how many ways can the archer break all the targets? 

### Hint

There are $12$ total targets and $4$ columns. Label the columns $1-4$. How can you identify each unique breaking pattern?

### 解答

There are $12$ total targets and $4$ columns. Label the columns $1-4$. Then we are just counting the number of anagrams that can be made with $2$ $1$s, $3$ 2s, $3$ 3s, and $4$ 4s. This is because we can identify a unique breaking order by the column we shoot in at each step. The number of anagrams is just given by the multinomial coefficient $\displaystyle \binom{12}{2,3,3,4} = 277200$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "277200"
    ],
    "companies": [
      {
        "company": "Optiver"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "Od57KAWeLkJET1zWrTYo",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-4 20:30:20 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4818182,
    "source": "test",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Lowest Target",
    "topic": "probability",
    "urlEnding": "lowest-target",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "Optiver"
      }
    ],
    "difficulty": "easy",
    "id": "Od57KAWeLkJET1zWrTYo",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Lowest Target",
    "topic": "probability",
    "urlEnding": "lowest-target"
  }
}
```
