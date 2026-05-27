# QuantGuide Question

## 717. Conditioned Heads

**Metadata**

- ID: `xeY1FXkusk2ZJt6xWEvB`
- URL: https://www.quantguide.io/questions/binomial-distribution
- Topic: statistics
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: Conditional Probability, Discrete Random Variables
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-16 11:02:25 America/New_York
- Last Edited By: Gabe

### 题干

Let $H_n$ be the number of heads that have occurred in the first $n$ flips of a fair coin. Compute $\mathbb{P}[H_9 = 6 \mid H_6 = 5]$.

### Hint

Interpret the Binomial distribution in terms of coin flipping.

### 解答

We can interpret this information as saying that we have obtained $5$ heads in the first $6$ flips of our fair coin. We want the probability that in $9$ flips we obtain exactly $6$ heads. This is equivalent to saying that we want the probability that we observe one head in the next 3 flips of our fair coin. The probability of this, using the Binomial PMF or by calculating the combinatorics, is $\displaystyle \binom{3}{1}\dfrac{1}{2^3} = \dfrac{3}{8}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3/8"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "xeY1FXkusk2ZJt6xWEvB",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-16 11:02:25 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5852122,
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
    "title": "Conditioned Heads",
    "topic": "statistics",
    "urlEnding": "binomial-distribution",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "xeY1FXkusk2ZJt6xWEvB",
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
    "title": "Conditioned Heads",
    "topic": "statistics",
    "urlEnding": "binomial-distribution"
  }
}
```
