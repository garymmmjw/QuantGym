# QuantGuide Question

## 683. Building Blocks

**Metadata**

- ID: `ZYGaCslFFdI0q4SfOsoV`
- URL: https://www.quantguide.io/questions/building-blocks
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Maven Securities
- Source: Kaushik - Maven Glassdoor
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-1 10:38:11 America/New_York
- Last Edited By: Gabe

### 题干

Max is building a tower from three distinct colors of building blocks (red, blue, and yellow). He has $7$ blocks of each color and randomly picks a block out at a time to build his tower of $5$ blocks in height. What is the probability the tower has composed of exactly two different colors?

### Hint

What are the ways to select the colors, total combinations of blocks, and combinations of blocks that fit our criteria?

### 解答

There are $\binom{3}{2}$ ways to select the two colors of interest for building the tower. There are $\binom{21}{5}$ total combinations of blocks able to be chosen to construct the tower. Finally, there are $\binom{14}{5}$ combinations to select the blocks for the tower. However, this overcounts as you are also counting towers that are composed of just one color. Thus we need to subtract $2\cdot\binom{7}{5}$ ways of this happening. Combining all of these, we get a final probability of $$ \binom{3}{2}\cdot\dfrac{\binom{14}{5}-2\cdot\binom{7}{5}}{\binom{21}{5}} = \dfrac{5880}{20349}
$$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "5880/20349"
    ],
    "companies": [
      {
        "company": "Maven Securities"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "ZYGaCslFFdI0q4SfOsoV",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-1 10:38:11 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5562692,
    "source": "Kaushik - Maven Glassdoor",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Building Blocks",
    "topic": "probability",
    "urlEnding": "building-blocks",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Maven Securities"
      }
    ],
    "difficulty": "medium",
    "id": "ZYGaCslFFdI0q4SfOsoV",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Building Blocks",
    "topic": "probability",
    "urlEnding": "building-blocks"
  }
}
```
