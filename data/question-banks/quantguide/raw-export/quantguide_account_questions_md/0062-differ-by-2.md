# QuantGuide Question

## 62. Differ By 2

**Metadata**

- ID: `OXHVzFG44DxJwFpd4cIO`
- URL: https://www.quantguide.io/questions/differ-by-2
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: Kaushik - Dice PDF
- Tags: Expected Value, Conditional Expectation
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-10-3 15:09:28 America/New_York
- Last Edited By: Gabe

### 题干

How many times do we have to roll a fair $6$-sided die till we roll two numbers in a row that differ by $2$?


### Hint

Are there any symmetric rolls?

### 解答

Use Markov Chains to solve this question. You’ll notice some symmetry in each dice roll. Rolling a $1$ is functionally the same as rolling a $2$, $5$, or $6$. In the same sense, rolling a $3$ is the same as rolling a $4$. Using this symmetry, we can drastically decrease the number of states to find the answer to this question. Let $E_{0}$ be the starting state where we don’t have any rolls yet. Let $E_{1}$ be the states of rolling a $1$, $2$, $5$, or $6$ (they all have only one following roll that gets to the goal state) and not previously rolling a number that's a difference of $2$. Let $E_{2}$ be the states of rolling a $3$ or $4$ (both have $2$ possible following goal states) and not previously rolling a number that's a difference of $2$. Finally, let $E_{goal}$ be the goal state where the two previous rolls differ by $2$. Then our equations become:

$$
E_{0} = \frac{2}{3}E_{1}+\dfrac{1}{3}E_{2}+1
$$
$$
E_{1} = \frac{1}{6}E_{goal} +\frac{2}{3}E_{1} + \frac{1}{6}E_{2} + 1
$$
$$
E_{2} = \frac{1}{3}E_{goal} + \frac{1}{3}E_{1} + \frac{1}{3}E_{2} + 1
$$
$$
E_{goal} = 0
$$

Solving these systems of equations, we get $E_{0} = \dfrac{17}{3}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "17/3"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "OXHVzFG44DxJwFpd4cIO",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-3 15:09:28 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 447706,
    "source": "Kaushik - Dice PDF",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Differ By 2",
    "topic": "probability",
    "urlEnding": "differ-by-2",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "OXHVzFG44DxJwFpd4cIO",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Differ By 2",
    "topic": "probability",
    "urlEnding": "differ-by-2"
  }
}
```
