# QuantGuide Question

## 727. Particle Reach VIII

**Metadata**

- ID: `sxBAwMUFcPP93Cb7ZiCl`
- URL: https://www.quantguide.io/questions/particle-reach-viii
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: ross
- Tags: Conditional Expectation, Expected Value
- Premium: True
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-8 09:41:30 America/New_York
- Last Edited By: Gabe

### 题干

$$\textbf{Complete Particle Reach VI First!}$ Consider a particle that performs a random walk on the integers starting at position $0$. At each step, the particle moves from position $i$ to position $i+1$ with probability $p$, while the probability it moves from $i$ to $i-1$ is $1-p$. If $p = 2/3$, find the expected number of steps until the particle reaches $7$. If the answer is infinite, answer $-1$.

### Hint

Use Linearity of Expectation in a way that is conducive with Particle Reach VI.

### 解答

Let $T$ be the total number of steps needed to go from position $0$ to $9$. We can write $T = T_1 + \dots + T_7$, where $T_i$ is the number of steps needed to move from position $i-1$ to position $i$. By the Markov Property and Linearity of Expectation, $\mathbb{E}[T] = 7\mathbb{E}[T_1]$. $\mathbb{E}[T_1] = 3$ by the results of Particle Reach VI, so the answer is $21$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "21"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "sxBAwMUFcPP93Cb7ZiCl",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-8 09:41:30 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5930623,
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
    "title": "Particle Reach VIII",
    "topic": "probability",
    "urlEnding": "particle-reach-viii",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "sxBAwMUFcPP93Cb7ZiCl",
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
    "title": "Particle Reach VIII",
    "topic": "probability",
    "urlEnding": "particle-reach-viii"
  }
}
```
