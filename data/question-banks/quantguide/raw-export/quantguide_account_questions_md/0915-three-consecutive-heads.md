# QuantGuide Question

## 915. Three Consecutive Heads

**Metadata**

- ID: `25SogzUFLtqvTYPs4mfC`
- URL: https://www.quantguide.io/questions/three-consecutive-heads
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Citadel, Jane Street, Squarepoint Capital, WorldQuant, Two Sigma, SIG, IMC, Goldman Sachs
- Source: N/A
- Tags: Expected Value
- Premium: True
- Solution Free: False
- Version: 7
- Last Edited: 2023-11-7 12:22:25 America/New_York
- Last Edited By: Gabe

### 题干

On average, how many fair coin tosses will it take to observe three consecutive heads?

### Hint

This can be done in a myriad of ways: Markov chains, recursive equations, Law of Total Probability, binary trees, and others.

### 解答

Let $x$ be the expected number of coin tosses it takes to observe three consecutive heads. On the first toss, there is a $\frac{1}{2}$ probability that you observe a tail and essentially start over with 0 consecutive heads, except that your expected number of coin tosses is $x+1$ since you wasted a toss observing a tail. There is a $\frac{1}{4}$ probability of receiving HT and essentially starting over with 0 consecutive heads, except that your expected number of coin tosses is $x+2$ since you wasted two tosses observing HT. There is a $\frac{1}{8}$ probability of receiving HHT and essentially starting over with 0 consecutive heads, except that your expected number of coin tosses is $x+3$ since you wasted three tosses observing tails HHT. Finally, there is a $\frac{1}{8}$ probability of receiving HHH and requiring three tosses. Thus, we can write this as:

$$x = \frac{1}{2}(x+1) + \frac{1}{4}(x+2) + \frac{1}{8}(x+3) + \frac{1}{8} \times 3 \newline x=14$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "14"
    ],
    "companies": [
      {
        "company": "Citadel"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "Squarepoint Capital"
      },
      {
        "company": "WorldQuant"
      },
      {
        "company": "Two Sigma"
      },
      {
        "company": "SIG"
      },
      {
        "company": "IMC"
      },
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "25SogzUFLtqvTYPs4mfC",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 12:22:25 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7489194,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Three Consecutive Heads",
    "topic": "probability",
    "urlEnding": "three-consecutive-heads",
    "version": 7
  },
  "list_summary": {
    "companies": [
      {
        "company": "Citadel"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "Squarepoint Capital"
      },
      {
        "company": "WorldQuant"
      },
      {
        "company": "Two Sigma"
      },
      {
        "company": "SIG"
      },
      {
        "company": "IMC"
      },
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "medium",
    "id": "25SogzUFLtqvTYPs4mfC",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Three Consecutive Heads",
    "topic": "probability",
    "urlEnding": "three-consecutive-heads"
  }
}
```
