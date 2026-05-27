# QuantGuide Question

## 523. Particle Reach VI

**Metadata**

- ID: `J0iotnWpNXcPacVGBBHQ`
- URL: https://www.quantguide.io/questions/particle-reach-vi
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: ross
- Tags: Conditional Expectation, Expected Value
- Premium: True
- Solution Free: False
- Version: 5
- Last Edited: 2023-11-8 09:41:07 America/New_York
- Last Edited By: Gabe

### 题干

Consider a particle that performs a random walk on the integers starting at position $0$. At each step, the particle moves from position $i$ to position $i+1$ with probability $p$, while the probability it moves from $i$ to $i-1$ is $1-p$. If $p = 2/3$, find the expected number of steps until the particle reaches $1$. If the answer is infinite, answer $-1$.

### Hint

Condition on what happens in the first step.

### 解答

We generalize this for $p \geq 1/2$. Let $T_1$ be the number of steps needed to move from position $0$ to $1$. We want $\mathbb{E}[T_1]$. We use Law of Total Expectation to condition on what happens at the first step. If the particle moves right at the first step, which occurs with probability $p$, then $T_1 = 1$, as the particle has hit $1$. Otherwise, with probability $1-p$, the particle moves left. The expected number of steps in this would be $1 + 2\mathbb{E}[T_1]$, as the number of steps needed to move from $-1$ to $0$ and $0$ to $1$ are the same by the Markov Property. This means that $$\mathbb{E}[T_1] = p \cdot 1 + (1-p) \cdot (1 + 2\mathbb{E}[T_1])$$ Rearranging and solving yields $\mathbb{E}[T_1] = \dfrac{1}{2p-1}$. With $p = 2/3$, this yields an answer of $3$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "J0iotnWpNXcPacVGBBHQ",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-8 09:41:07 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4168401,
    "source": "ross",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Particle Reach VI",
    "topic": "probability",
    "urlEnding": "particle-reach-vi",
    "version": 5
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "J0iotnWpNXcPacVGBBHQ",
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
    "title": "Particle Reach VI",
    "topic": "probability",
    "urlEnding": "particle-reach-vi"
  }
}
```
