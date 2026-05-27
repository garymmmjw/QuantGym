# QuantGuide Question

## 226. Miscalculated Fibonacci

**Metadata**

- ID: `WxxtKwO8zvxKAowbmbVO`
- URL: https://www.quantguide.io/questions/miscalculated-fibonacci
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: mazur combo
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-9 13:52:23 America/New_York
- Last Edited By: Gabe

### 题干

Suppose that you are trying to calculate the terms in the Fibonacci sequence. You calculate the values of $F_0, F_1, \dots, F_{99}$ correctly. However, you say that the value of $F_{100}$ is $G_{100} = 1 + F_{100}$. Assuming you carry over this error into your subsequent calculations of terms of $F_{101},\dots, F_{110}$, let $G_{110}$ be the value that you calculate for $F_{110}$. Find $G_{110} - F_{110}$.

### Hint

You would calculate that $G_{101} = G_{100} + F_{99} = 1 + (F_{100} + F_{99}) = 1 + F_{101}$. Then, you would calculate that $G_{102} = G_{101} + G_{100} = 2 + (F_{101} + F_{100}) = 2 + F_{102}$. How does the error accumulate between calculations?

### 解答

You would calculate that $G_{101} = G_{100} + F_{99} = 1 + (F_{100} + F_{99}) = 1 + F_{101}$. Then, you would calculate that $G_{102} = G_{101} + G_{100} = 2 + (F_{101} + F_{100}) = 2 + F_{102}$. More generally, we see that the error is going to accumulate just like the Fibonacci sequence itself! This is because the error in each of the two previous values is summed up. In particular, the error terms start as $1$ and $1$ rather than $0$ and $1$. Therefore, we have that the error term is $F_{n+1}$. Plugging in $n = 10$, as we are calculating $10$ terms out above $100$, we get that our error is going to be $F_{11} = 89$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "89"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "WxxtKwO8zvxKAowbmbVO",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-9 13:52:23 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1796864,
    "source": "mazur combo",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Miscalculated Fibonacci",
    "topic": "brainteasers",
    "urlEnding": "miscalculated-fibonacci",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "WxxtKwO8zvxKAowbmbVO",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Miscalculated Fibonacci",
    "topic": "brainteasers",
    "urlEnding": "miscalculated-fibonacci"
  }
}
```
