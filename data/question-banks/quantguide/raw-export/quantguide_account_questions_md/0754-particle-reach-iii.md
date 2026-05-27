# QuantGuide Question

## 754. Particle Reach III

**Metadata**

- ID: `SKLbQbqvxauyaZERwH6C`
- URL: https://www.quantguide.io/questions/particle-reach-iii
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: ross edited
- Tags: Conditional Probability
- Premium: True
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-8 09:40:17 America/New_York
- Last Edited By: Gabe

### 题干

$$\textbf{Complete Particle Reach I and II First!}$ Consider a particle that performs a random walk on the integers starting at position $0$. At each step, the particle moves from position $i$ to position $i+1$ with probability $p$, while the probability it moves from $i$ to $i-1$ is $1-p$. If $p = 1/3$, find the probability the particle ever reaches position $7$.

### Hint

Use the result from Particle Reach I and iterate.

### 解答

We know from Particle Reach I that the probability that the particle eventually hits $1$ from $0$ is $1/2$. Therefore, by the Markov property, this the same as the probability that the particle ever reaches $i+1$ from position $i$. We can then say that the probability $7$ is ever reached from $0$ is the product of the probabilities that $1$ is reached from $0$, $2$ is reached from $1$, and so on, until $7$ is reached from $6$. All of these probabilities are just $1/2$, so the answer is $\dfrac{1}{2^7} = \dfrac{1}{128}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/128"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "SKLbQbqvxauyaZERwH6C",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-8 09:40:17 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6153806,
    "source": "ross edited",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Particle Reach III",
    "topic": "probability",
    "urlEnding": "particle-reach-iii",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "SKLbQbqvxauyaZERwH6C",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Particle Reach III",
    "topic": "probability",
    "urlEnding": "particle-reach-iii"
  }
}
```
