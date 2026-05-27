# QuantGuide Question

## 1138. Rabbit Hop III

**Metadata**

- ID: `x7mxE5KdBzS1N2yCQdL7`
- URL: https://www.quantguide.io/questions/rabbit-hop-iii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Five Rings, Goldman Sachs
- Source: 5r r2
- Tags: Combinatorics
- Premium: True
- Solution Free: False
- Version: 3
- Last Edited: 2023-11-7 12:44:16 America/New_York
- Last Edited By: Gabe

### 题干

A rabbit starts at the floor in front of a staircase of $10$ stairs. The rabbit can hop up $1$ or $2$ stairs at each step. How many distinct paths are there from the floor to the top of the staircase (i.e. to the top of the $10$th stair)?

### Hint

Let $p_n$ be the number of distinct paths to the top of a staircase of length $n$. Condition on the last jump.

### 解答

Let $p_n$ be the number of distinct paths to the top of a staircase of length $n$. We can condition on the last jump. If the last jump is a movement by $1$ stair, we need to count the number of ways to get to stair $n-1$. There are $p_{n-1}$ ways to do this by definition. Similarly, if the last movement is movement by $2$ stairs, we need to count the number of paths to get to stair $n-2$. There are $p_{n-2}$ ways to do this by definition. Since these two cases are disjoint and exhaustive, we have that $p_n = p_{n-1} + p_{n-2}$. The initial conditions are $p_1 = 1$ and $p_2 = 2$, which can just be enumerated directly. We can see that $p_n = F_{n+1}$, the $(n+1)$st Fibonacci number. In particular, $p_{10} = F_{11} = 89$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "89"
    ],
    "companies": [
      {
        "company": "Five Rings"
      },
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "x7mxE5KdBzS1N2yCQdL7",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 12:44:16 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9385649,
    "source": "5r r2",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Rabbit Hop III",
    "topic": "probability",
    "urlEnding": "rabbit-hop-iii",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "Five Rings"
      },
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "medium",
    "id": "x7mxE5KdBzS1N2yCQdL7",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Rabbit Hop III",
    "topic": "probability",
    "urlEnding": "rabbit-hop-iii"
  }
}
```
