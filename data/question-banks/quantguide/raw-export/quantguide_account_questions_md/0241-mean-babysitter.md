# QuantGuide Question

## 241. Mean Babysitter

**Metadata**

- ID: `EVpJ7RmFZzqQk2273pRn`
- URL: https://www.quantguide.io/questions/mean-babysitter
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: edited from discrete math book
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-14 11:31:42 America/New_York
- Last Edited By: Gabe

### 题干

$$10$ kids are really hungry! Their babysitter has $12$ units of food to give. However, she decides she only wants to give $4$ of the children food. How many ways can she distribute the food units such that $6$ of the children are hungry (receive no food), and the other $4$ children receive at least $1$ unit of food each?

### Hint

There are $\displaystyle \binom{10}{4} = 210$ ways to pick the $4$ children that will receive food. Once the $4$ children are picked, let $x_1,\dots,x_4$ represent the amount of units of food that each of the children get. We want to find the number of non-negative integer solutions to $x_1 + x_2 + x_3 + x_4 = 12$ with each $x_i \geq 1$. 

### 解答

There are $\displaystyle \binom{10}{4} = 210$ ways to pick the $4$ children that will receive food. Once the $4$ children are picked, let $x_1,\dots,x_4$ represent the amount of units of food that each of the children get. We want to find the number of non-negative integer solutions to $x_1 + x_2 + x_3 + x_4 = 12$ with each $x_i \geq 1$. This is equivalent to saying that we fix one unit of food per child before we distribute the rest and then distribute the other $8$ units of food with no restrictions. Namely, the equation prior has the same number of solutions as the equation $x_1 + x_2 + x_3 + x_4 = 8$ with each $x_i \geq 0$ an integer. There are $\displaystyle \binom{11}{3} = 165$ solutions to this equation by stars and bars. Therefore, the babysitter has $210 \cdot 165 = 34650$ ways to distribute the food units.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "34650"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "EVpJ7RmFZzqQk2273pRn",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-14 11:31:42 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1902003,
    "source": "edited from discrete math book",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Mean Babysitter",
    "topic": "probability",
    "urlEnding": "mean-babysitter",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "EVpJ7RmFZzqQk2273pRn",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Mean Babysitter",
    "topic": "probability",
    "urlEnding": "mean-babysitter"
  }
}
```
