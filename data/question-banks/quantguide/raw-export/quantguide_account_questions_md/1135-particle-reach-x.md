# QuantGuide Question

## 1135. Particle Reach X

**Metadata**

- ID: `N1h5hOqZEUHrD6LkbO46`
- URL: https://www.quantguide.io/questions/particle-reach-x
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: og
- Tags: Conditional Expectation
- Premium: True
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-8 09:41:53 America/New_York
- Last Edited By: Gabe

### 题干

Consider a particle that performs a random walk on the integers starting at position $0$. At each step, the particle moves from position $i$ to position $i+1$ with probability $p$, while the probability it moves from $i$ to $i-1$ is $1-p$. If $p = 2/3$, find the variance of the number of steps until the particle reaches $7$. If the answer is infinite, answer $-1$.

### Hint

Write $T$ as the sum of random variables. Are these random variables independent?

### 解答

From Particle Reach IX, we know that $\text{Var}(T_1) = 24$. Let $T$ be the total amount of steps needed to reach $7$ from $0$. We have that $T = T_1 + \dots + T_7$, where $T_i$ is the amount of steps needed to go from position $i-1$ to position $i$. Furthermore, note that the $T_i$ random variables are independent, as moving from one position to the next position is independent of how many steps were needed to reach the current position. This is by the Markov Property. Therefore, $\text{Var}(T) = 7\text{Var}(T_1) = 168$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "168"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "N1h5hOqZEUHrD6LkbO46",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-8 09:41:53 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9371693,
    "source": "og",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Particle Reach X",
    "topic": "probability",
    "urlEnding": "particle-reach-x",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "N1h5hOqZEUHrD6LkbO46",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Particle Reach X",
    "topic": "probability",
    "urlEnding": "particle-reach-x"
  }
}
```
