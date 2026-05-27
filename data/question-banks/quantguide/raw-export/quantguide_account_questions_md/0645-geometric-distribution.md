# QuantGuide Question

## 645. Geometric Distribution

**Metadata**

- ID: `DwoTSaq8wYfTSLCegDMP`
- URL: https://www.quantguide.io/questions/geometric-distribution
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Conditional Probability, Discrete Random Variables
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Suppose that $X \sim \text{Geom}\left(\dfrac{1}{4}\right)$. Compute $\mathbb{P}[X \leq 8 \mid X \geq 5]$.

### Hint

We can interpret the information as saying that it takes us at least $5$ coin flips to obtain our first heads. Use the memorylessness of the geometric distribution.

### 解答

We can interpret the information as saying that it takes us at least $5$ coin flips to obtain our first heads. We want to find the probability that it takes up no more than $8$ coin flips to obtain our first heads. The "at least $5$ flips" portion means that the first $4$ flips were all tails. Therefore, from $4$ tails, find the probability the first head occurs on or before the $8$th flip. Given the memorylessness of the geometric distribution, this is really asking the probability we obtain a heads in the next $4$ flips.


The complement is easy to compute, which is the event that we don't obtain a heads in the next $4$ flips. The probability of all tails for the next $4$ flips is $\dfrac{3^4}{4^4} = \dfrac{81}{256}$. Therefore, the probability we do get a heads in the next $4$ flips is $1 - \dfrac{81}{256} = \dfrac{175}{256}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "175/256"
    ],
    "difficulty": "easy",
    "id": "DwoTSaq8wYfTSLCegDMP",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 5150781,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Geometric Distribution",
    "topic": "probability",
    "urlEnding": "geometric-distribution"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "DwoTSaq8wYfTSLCegDMP",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Geometric Distribution",
    "topic": "probability",
    "urlEnding": "geometric-distribution"
  }
}
```
