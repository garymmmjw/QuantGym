# QuantGuide Question

## 1056. Rabbit Hop IV

**Metadata**

- ID: `90Ahz27AIyTdiZmEXSVj`
- URL: https://www.quantguide.io/questions/rabbit-hop-iv
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: Five Rings, DRW, Goldman Sachs
- Source: 5r r2
- Tags: Combinatorics
- Premium: True
- Solution Free: False
- Version: 3
- Last Edited: 2023-11-7 12:44:11 America/New_York
- Last Edited By: Gabe

### 题干

A rabbit starts at the floor in front of a staircase of $10$ stairs. The rabbit can hop up any amount of steps strictly larger than $1$ at each movement. In particular, this means that the rabbit can't go up a one stair staircase. How many distinct paths are there from the floor to the top of the staircase (i.e. to the top of the $10$th stair)?

### Hint

Let $h_n$ be the number of distinct paths to the top of a $n$ stair staircase. Condition on the size of the first jump.

### 解答

Let $h_n$ be the number of distinct paths to the top of a $n$ stair staircase. We can condition on the size of the first jump. The size of the first jump can be anywhere from $2$ to $n$, inclusive. If the rabbit hops $k$ stairs on the first step, it must make a unique path through the other $n-k$ stairs. Hence, you could view the problem now as stair $k$ being the floor and the top stair being $n-k$. This means that $$h_n = h_{n-2} + h_{n-3} + h_{n-4} + \dots + h_{1} + h_0$$ However, let's look at the tail term $h_{n-3} + h_{n-4} + \dots + h_1 + h_0$. This is equivalent to the problem where we start on stair $1$ (instead of the ground) and need to jump up strictly more than one stair at each jump. This is because stair $3$ would now be the first available stair to jump on, and the rabbit can jump to any other stair at least $3$. Thus, the tail term there is just $h_{n-1}$, as starting on stair $1$, the rabbit needs a path through the other $n-1$ stairs to the top. Our recurrence relation is now $$h_n = h_{n-1} + h_{n-2}$$ Our initial conditions are that $h_1 = 0$ and $h_2 = 1$, which can just be counted directly. We note now that this is just the Fibonacci sequence shifted by $1$ index up, as $F_0 = 0$ and $F_1 = 1$, so we can conclude that $h_n = F_{n-1}$. In particular, this means that $h_{10} = F_9 = 34$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "34"
    ],
    "companies": [
      {
        "company": "Five Rings"
      },
      {
        "company": "DRW"
      },
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "90Ahz27AIyTdiZmEXSVj",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 12:44:11 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8588266,
    "source": "5r r2",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Rabbit Hop IV",
    "topic": "probability",
    "urlEnding": "rabbit-hop-iv",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "Five Rings"
      },
      {
        "company": "DRW"
      },
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "medium",
    "id": "90Ahz27AIyTdiZmEXSVj",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Rabbit Hop IV",
    "topic": "probability",
    "urlEnding": "rabbit-hop-iv"
  }
}
```
