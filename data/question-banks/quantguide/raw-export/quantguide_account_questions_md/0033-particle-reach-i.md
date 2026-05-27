# QuantGuide Question

## 33. Particle Reach I

**Metadata**

- ID: `fhiGPC1tX2KpMELQoGnA`
- URL: https://www.quantguide.io/questions/particle-reach-i
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: ross edited
- Tags: Conditional Probability, Discrete Random Variables
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-8 09:39:49 America/New_York
- Last Edited By: Gabe

### 题干

Consider a particle that performs a random walk on the integers starting at position $0$. At each step, the particle moves from position $i$ to position $i+1$ with probability $p$, while the probability it moves from $i$ to $i-1$ is $1-p$. If $p = 1/3$, find the probability the particle ever reaches position $1$.

### Hint

Use Law of Total Probability to condition on what happens at the first step.

### 解答

We are going to solve this for more general $p$. Let $x_1$ be the probability that the particle ever reaches position $1$. The key is to condition on the move at the first step. If the particle moves right, which occurs with probability $p$, then position $1$ is reached. Otherwise, the particle reaches position $-1$. From $-1$, the particle first needs to reach $0$ again, which occurs with probability $x_1$, and then from there, reach position $1$, which occurs with probability $x_1$ as well. Therefore, given the particle moves left, the probability it reaches position $1$ is $x_1^2$. This gives rise to the equation $$x_1 = p + (1-p)x_1^2$$ We can solve for this quadratic in $x_1$ to get that $x_1 = 1, \dfrac{p}{1-p}$. Since $x_1 \leq 1$, we know that for $p \geq 1/2$, $x_1 = 1$, as the other root would be larger than $1$. For $p < 1/2$, the random walk is biased down, so it is not probability $1$ that the particle ever reaches $1$. This argument can be made more rigorous using more mathematically advanced tools, but those are not of concern here. Therefore, the answer for $p < 1/2$ is $\dfrac{p}{1-p}$. Since $p = 1/3$ in this question, our answer is $\dfrac{1/3}{1-1/3} = \dfrac{1}{2}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/2"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "fhiGPC1tX2KpMELQoGnA",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-8 09:39:49 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 225637,
    "randomizable": "",
    "source": "ross edited",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Particle Reach I",
    "topic": "probability",
    "urlEnding": "particle-reach-i",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "fhiGPC1tX2KpMELQoGnA",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Particle Reach I",
    "topic": "probability",
    "urlEnding": "particle-reach-i"
  }
}
```
