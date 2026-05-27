# QuantGuide Question

## 695. Particle Reach IX

**Metadata**

- ID: `QVtapntbyQFsC0jQ7TkH`
- URL: https://www.quantguide.io/questions/particle-reach-ix
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: ross, edited
- Tags: Conditional Expectation, Conditional Probability
- Premium: True
- Solution Free: False
- Version: 4
- Last Edited: 2023-11-8 09:41:43 America/New_York
- Last Edited By: Gabe

### 题干

Consider a particle that performs a random walk on the integers starting at position $0$. At each step, the particle moves from position $i$ to position $i+1$ with probability $p$, while the probability it moves from $i$ to $i-1$ is $1-p$. If $p = 2/3$, find the variance of the number of steps until the particle reaches $1$. If the answer is infinite, answer $-1$.

### Hint

Use Law of Total Expectation on $\mathbb{E}[T_1^2]$ and use prior results.

### 解答

We are going to generalize this for $p > 1/2$. Let $T_1$ be the number of steps needed to move from position $0$ to $1$. We want $\text{Var}(T_1) = \mathbb{E}[T_1^2] - (\mathbb{E}[T_1])^2$. We know $\mathbb{E}[T_1] = \dfrac{1}{2p-1}$ from Particle Reach VI. We use Law of Total Expectation to condition on what happens at the first step. 

$$$$

If the particle moves right at the first step, which occurs with probability $p$, then $T_1 = 1$, as the particle has hit $1$. Therefore, in this case, $T_1^2 = 1$ as well. Otherwise, with probability $1-p$, the particle moves left. The number of steps in this would be $1 + T_0 + T_1$, where $T_0$ is the number of steps needed to go from $-1$ to $0$. In particular, this means that $$\mathbb{E}[T_1^2] = p \cdot 1 + (1-p)\mathbb{E}[(1 + T_0 + T_1)^2]$$ Note that $\mathbb{E}[T_0] = \mathbb{E}[T_1]$ and $\mathbb{E}[T_0^2] = \mathbb{E}[T_1^2]$ by the Markov Property, so after expanding out everything, substituting, and rearranging, one gets that $$\mathbb{E}[T_1^2] = \dfrac{-4p^2 + 6p-1}{(2p-1)^3}$$ Therefore, $\text{Var}(T_1) = \mathbb{E}[T_1^2] - (\mathbb{E}[T_1])^2 = \dfrac{-4p^2 + 6p-1}{(2p-1)^3} - \dfrac{1}{(2p-1)^2} = \dfrac{4p(1-p)}{(2p-1)^3}$. With $p = 2/3$, we have that $\text{Var}(T_1) = 24$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "24"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "QVtapntbyQFsC0jQ7TkH",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-8 09:41:43 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5699872,
    "randomizable": "",
    "source": "ross, edited",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Particle Reach IX",
    "topic": "probability",
    "urlEnding": "particle-reach-ix",
    "version": 4
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "QVtapntbyQFsC0jQ7TkH",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Particle Reach IX",
    "topic": "probability",
    "urlEnding": "particle-reach-ix"
  }
}
```
