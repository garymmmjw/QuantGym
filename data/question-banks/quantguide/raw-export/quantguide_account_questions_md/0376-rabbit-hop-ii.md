# QuantGuide Question

## 376. Rabbit Hop II

**Metadata**

- ID: `rAUHYYmXJC9V9CVBrtgs`
- URL: https://www.quantguide.io/questions/rabbit-hop-ii
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Five Rings
- Source: 5r r2
- Tags: Combinatorics
- Premium: True
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-7 12:44:02 America/New_York
- Last Edited By: Gabe

### 题干

A rabbit starts at the floor in front of a staircase of $10$ stairs. The rabbit can hop up any amount of stairs at each move, but it must make an even amount of hops to get to the top. How many distinct paths are there from the floor to the top of the staircase (i.e. to the top of the $10$th stair)?

### Hint

Can you match up paths to some subsets of $\{1,2,\dots,9\}$? What is the restriction?

### 解答

Using the same idea as Rabbit Hop I, we are looking for subsets of $\{1,2,\dots,9\}$ that have odd size. This is because we have to select an odd amount of integers $1-9$ such that when we move to step $10$, the total number of moves is even. In other words, we need to find the number of odd-sized subsets of a set of size $9$. 

$$$$

We can match up odd and even subsets by matching a subset $A \subseteq \{1,2,\dots,9\}$ with odd cardinality to $A^c$, which would have even cardinality. This is since if $|A| = k$, where $k$ is odd, $9-k$ must be even, so we have a one-to-one matching of odd and even subsets, so there must be equal amounts of odd and even subsets. Thus, there are $\dfrac{1}{2} \cdot 2^9 = 256$ such paths.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "256"
    ],
    "companies": [
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "rAUHYYmXJC9V9CVBrtgs",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 12:44:02 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2933087,
    "source": "5r r2",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Rabbit Hop II",
    "topic": "probability",
    "urlEnding": "rabbit-hop-ii",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "easy",
    "id": "rAUHYYmXJC9V9CVBrtgs",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Rabbit Hop II",
    "topic": "probability",
    "urlEnding": "rabbit-hop-ii"
  }
}
```
