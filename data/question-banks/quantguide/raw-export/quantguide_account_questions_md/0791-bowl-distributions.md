# QuantGuide Question

## 791. Bowl Distributions

**Metadata**

- ID: `brFvke9ouIB0Z22Nl3tk`
- URL: https://www.quantguide.io/questions/bowl-distributions
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: AOPS
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

How many ways can 7 white balls and 8 black balls be distributed into 5 bowls such that each bowl receives exactly 3 balls?

### Hint

Consider the complementary event.

### 解答

Once the white balls are distributed, there exists only one way for the black balls to be distributed such that each bowl gets 3 balls. There are $\binom{7+5-1}{5-1} = 330$ ways to do this without restrictions. However, we need to ensure that no bowl gets more than 3 white balls. Luckily for us, only one bowl can get more than 3 balls, which means we can avoid PIE. There are 5 ways to choose a bowl to assign 4 white balls to. Then, the remaining 3 balls need to be partitioned amongst the 5 bowls; there are a total of $\binom{3 + 5 - 1}{5 - 1} = 35$ ways to do this. Our answer is $$330 - 5 \cdot 35 = 155$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "155"
    ],
    "difficulty": "medium",
    "id": "brFvke9ouIB0Z22Nl3tk",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 6444705,
    "source": "AOPS",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Bowl Distributions",
    "topic": "probability",
    "urlEnding": "bowl-distributions"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "brFvke9ouIB0Z22Nl3tk",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Bowl Distributions",
    "topic": "probability",
    "urlEnding": "bowl-distributions"
  }
}
```
