# QuantGuide Question

## 991. Circular Charlie

**Metadata**

- ID: `oxYwmnxpv5rxjpHIwJqf`
- URL: https://www.quantguide.io/questions/circular-charlie
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

There are $14$ boys standing around in a circle, of which one of them is Charlie. $10$ girls walk up and join the circle at random to form a larger circle. Each girl must be between $2$ boys. If the girls arrange such that all ways of forming a larger circle are equally likely, find the probability Charlie is still standing between two boys.

### Hint

The $14$ boys make $14$ adjacencies for the girls to fill in. There are $\displaystyle \binom{14}{10}$ ways for the girls to arrange since each girl must be between two boys.

### 解答

The $14$ boys make $14$ adjacencies for the girls to fill in. There are $\displaystyle \binom{14}{10}$ ways for the girls to arrange since each girl must be between two boys. We know that Charlie must be between two boys, so the two spots adjacent to him must be empty. Therefore, for our event to occur, the girls must arrange themselves into the 12 spots not adjacent to Charlie, so there are $\displaystyle \binom{12}{10}$ ways to do that. Therefore, our probability of interest is $\dfrac{\binom{12}{10}}{\binom{14}{10}} = \dfrac{6}{91}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "6/91"
    ],
    "difficulty": "easy",
    "id": "oxYwmnxpv5rxjpHIwJqf",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 8074758,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Circular Charlie",
    "topic": "probability",
    "urlEnding": "circular-charlie"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "oxYwmnxpv5rxjpHIwJqf",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Circular Charlie",
    "topic": "probability",
    "urlEnding": "circular-charlie"
  }
}
```
