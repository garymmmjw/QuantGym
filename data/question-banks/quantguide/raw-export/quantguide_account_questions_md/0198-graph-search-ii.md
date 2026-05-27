# QuantGuide Question

## 198. Graph Search II

**Metadata**

- ID: `eOm4crWrYJTv8E3tC87L`
- URL: https://www.quantguide.io/questions/graph-search-ii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: My brain
- Tags: Expected Value
- Premium: False
- Solution Free: False
- Version: 7
- Last Edited: 2023-10-31 22:41:09 America/New_York
- Last Edited By: Gabe

### 题干

You are given an undirected graph with $11$ nodes. From every node, you are able to access any other node (not including itself), all with an equal probability of $1/10$. What is the expected number of steps to reach all nodes at least once (rounded to the nearest step)?

### Hint

What if instead of an undirected graph, we had an $11$ sided die? Are these close to the same idea?

### 解答

When rewording it to think about it as a $11-$sided die, and we are trying to figure out how many rolls it will take to see all $11$ sides at least once, it is easy to see that this is a variation of the coupon collector's problem.
$$$$
The time until the first result appears is $1$ as it takes one step to start somewhere. After that, once again we are guaranteed to visit another node in 1 step, so we add another one. The random time until a third (different) result appears is geometrically distributed with parameter of success $\frac{9}{10}$, hence a mean $\frac{10}{9}$ (as the mean of a geometrically distributed random variable is the inverse of its parameter). After that, the random time until a fourth (different) result appears is geometrically distributed with parameter of success $\frac{8}{10}$, hence a mean of $\frac{10}{8}$. And so on, until the random time of appearance of the last and tenth node, which is geometrically distributed with parameter of success $\frac{1}{10}$, hence with mean $\frac{10}{1}$.

We now know the mean time to see the first through last numbers pop up, so our total expectation will be summing all of the individual expectations up. 
$$$$
$$\sum_{k=1}^{10} \frac{10}{k} + 1 \approx 30.29$$ This yields our solution of $30$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "30"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "eOm4crWrYJTv8E3tC87L",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-31 22:41:09 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1503427,
    "source": "My brain",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Graph Search II",
    "topic": "probability",
    "urlEnding": "graph-search-ii",
    "version": 7
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "eOm4crWrYJTv8E3tC87L",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Graph Search II",
    "topic": "probability",
    "urlEnding": "graph-search-ii"
  }
}
```
