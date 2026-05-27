# QuantGuide Question

## 402. Particle Reach V

**Metadata**

- ID: `JOcZ0lrqSmwKznF6aGOT`
- URL: https://www.quantguide.io/questions/particle-reach-v
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: ross, edited
- Tags: Conditional Probability, Conditional Expectation
- Premium: False
- Solution Free: False
- Version: 3
- Last Edited: 2023-11-8 09:40:41 America/New_York
- Last Edited By: Gabe

### 题干

Consider a particle that performs a random walk on the integers starting at position $0$. At each step, the particle moves from position $i$ to position $i+1$ with probability $p$, while the probability it moves from $i$ to $i-1$ is $1-p$. If $p = 1/3$, find the expected number of steps until the particle reaches $1$. If the answer is infinite, answer $-1$.

### Hint

From Particle Reach I, we know that the probability that the particle ever reaches position $1$ is strictly less than $1$ for $p < 1/2$

### 解答

From Particle Reach I, we know that the probability that the particle ever reaches position $1$ is strictly less than $1$ for $p < 1/2$. Therefore, there is positive probability that the particle never reaches $1$ i.e. that infinitely many steps are needed to reach position $1$. This implies that the expected number of steps needed is $\infty$, so the answer is $-1$ here.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "-1"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "JOcZ0lrqSmwKznF6aGOT",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-8 09:40:41 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3152562,
    "randomizable": "",
    "source": "ross, edited",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Particle Reach V",
    "topic": "probability",
    "urlEnding": "particle-reach-v",
    "version": 3
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "JOcZ0lrqSmwKznF6aGOT",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Particle Reach V",
    "topic": "probability",
    "urlEnding": "particle-reach-v"
  }
}
```
