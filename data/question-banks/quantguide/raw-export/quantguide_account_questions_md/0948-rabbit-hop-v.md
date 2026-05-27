# QuantGuide Question

## 948. Rabbit Hop V

**Metadata**

- ID: `Xipk4QXt2TZuoFWdjq1M`
- URL: https://www.quantguide.io/questions/rabbit-hop-v
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: Five Rings
- Source: 5r r2
- Tags: Combinatorics
- Premium: True
- Solution Free: False
- Version: 3
- Last Edited: 2023-11-4 23:29:02 America/New_York
- Last Edited By: Gabe

### 题干

A rabbit starts at the floor in front of a staircase of $10$ stairs. The rabbit can hop up any odd amount of stairs at each movement. How many distinct paths are there from the floor to the top of the staircase (i.e. to the top of the $10$th stair)?

### Hint

Let $o_n$ be the number of distinct paths that the rabbit can take to go up a staircase of height $n$. Condition on the size of the first jump.

### 解答

Let $o_n$ be the number of distinct paths that the rabbit can take to go up a staircase of height $n$. We can condition on the size of the first jump. We can jump either $1,3,5,\dots, \alpha$, where $\alpha = n$ if $n$ is odd and $n-1$ if $n$ is even. In other words, $\alpha$ is the largest odd integer at most $n$. By conditioning, we have that $$o_n = o_1 + o_3 + \dots + o_{\alpha}$$ Let's take a closer look at the tail term $o_3 + \dots + o_{\alpha}$. If the rabbit started on the second stair, this is exactly the sum that would be obtained, as the rabbit must can up $1,3,5,\dots, \alpha - 1$ stairs from stair $2$. These correspond to the exact terms in the tail sum when taking the ground floor to be stair $2$. This means that $$o_2 = o_3 + \dots  + o_{\alpha}$$ so we can update our recurrence relation to be $$o_n = o_{n-1} + o_{n-2}$$ Our initial conditions are $o_1 = o_2 = 1$, which can be directly counted quite easily. These are exactly the first two terms and the recurrence of the Fibonacci sequence, so $o_n = F_n$. In particular, $o_{10} = F_{10} = 55$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "55"
    ],
    "companies": [
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "Xipk4QXt2TZuoFWdjq1M",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-4 23:29:02 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7751607,
    "source": "5r r2",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Rabbit Hop V",
    "topic": "probability",
    "urlEnding": "rabbit-hop-v",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "medium",
    "id": "Xipk4QXt2TZuoFWdjq1M",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Rabbit Hop V",
    "topic": "probability",
    "urlEnding": "rabbit-hop-v"
  }
}
```
