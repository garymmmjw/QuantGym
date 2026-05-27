# QuantGuide Question

## 556. Shiny Pennies

**Metadata**

- ID: `tRPxYvLLIvd8CAZZ5snh`
- URL: https://www.quantguide.io/questions/shiny-pennies
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: AHSME
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

There are 3 shiny and 4 dull pennies in a box. Pennies are drawn from the box without replacement. Compute the probability that it takes more than 4 draws for the third shiny penny to appear. 

### Hint

Work the complement of this event. Then break it up into two cases.

### 解答

We can use complimentary probability; we'll begin by compute the probability that the third shiny penny appears within the first 4 draws. There are two cases: (1) the third shiny penny appears on the third draw, and (2) the third shiny penny appears on the fourth draw. This is now a very simple ordering problem. There are $\binom{7}{3} = 35$ total orderings. There is 1 ordering that satisfies case 1, and 3 orderings that satisfy case 2 (there is exactly 1 dull penny that appears in the first 4 draws, and the last of the first 4 draws must be a shiny penny). Our answer is $\frac{31}{35}$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "31/35"
    ],
    "difficulty": "easy",
    "id": "tRPxYvLLIvd8CAZZ5snh",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 4447907,
    "source": "AHSME",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Shiny Pennies",
    "topic": "probability",
    "urlEnding": "shiny-pennies"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "tRPxYvLLIvd8CAZZ5snh",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Shiny Pennies",
    "topic": "probability",
    "urlEnding": "shiny-pennies"
  }
}
```
