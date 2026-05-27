# QuantGuide Question

## 691. Confused Ant I

**Metadata**

- ID: `MABdIkrWbk8mekQM5uGi`
- URL: https://www.quantguide.io/questions/confused-ant
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: Akuna, Jane Street, WorldQuant
- Source: N/A
- Tags: Conditional Expectation, Expected Value
- Premium: True
- Solution Free: False
- Version: 4
- Last Edited: 2023-9-17 15:35:22 America/New_York
- Last Edited By: Gabe

### 题干

An ant is standing on one vertex of a cube and can only walk along the edges. The ant is confused and moves randomly along the edges at random. How many edges, on average, will the ant travel to reach the opposite vertex of the cube?

### Hint

Define the problem as calculating the expecting hitting time within a Markov chain. What are your states and what are the transition probabilities? As an additional hint, there should not be eight states.

### 解答

There are a total of eight vertices: one is the starting vertex denoted $v_0$, three are the vertices adjacent to the starting vertex denoted $v_1$, three are the vertices adjacent to the ending vertex denoted $v_2$, and one is the ending vertex denoted $v_3$. Let $E[v_i]$ be the expected number of edges travelled to arrive at $v_3$ from $v_i$. This problem has now been set up as calculating the expecting hitting time of a state within a Markov chain:

$$E[V_0] = 1 + \frac{1}{3}\times E[V_1] + \frac{1}{3}\times E[V_1] + \frac{1}{3}\times E[V_1]$$
$$E[V_1] = 1 + \frac{1}{3}\times E[V_0] + \frac{1}{3}\times E[V_2] + \frac{1}{3}\times E[V_2]$$
$$E[V_2] = 1 + \frac{1}{3}\times E[V_1] + \frac{1}{3}\times E[V_1] + \frac{1}{3}\times E[V_3]$$
$$E[V_3] = 0$$

Substituting in $E[V_3]$ and solving, we see that $E[V_0]=10$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "10"
    ],
    "companies": [
      {
        "company": "Akuna"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "WorldQuant"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "MABdIkrWbk8mekQM5uGi",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-17 15:35:22 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5641789,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Confused Ant I",
    "topic": "probability",
    "urlEnding": "confused-ant",
    "version": 4
  },
  "list_summary": {
    "companies": [
      {
        "company": "Akuna"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "WorldQuant"
      }
    ],
    "difficulty": "medium",
    "id": "MABdIkrWbk8mekQM5uGi",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Confused Ant I",
    "topic": "probability",
    "urlEnding": "confused-ant"
  }
}
```
