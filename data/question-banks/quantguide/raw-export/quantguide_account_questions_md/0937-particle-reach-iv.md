# QuantGuide Question

## 937. Particle Reach IV

**Metadata**

- ID: `A75sA9j75ZhbnDLZgdt7`
- URL: https://www.quantguide.io/questions/particle-reach-iv
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: ross
- Tags: Conditional Probability
- Premium: True
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-8 09:40:29 America/New_York
- Last Edited By: Gabe

### 题干

$$\textbf{Complete Particle Reach I and III First!}$ Consider a particle that performs a random walk on the integers starting at position $0$. At each step, the particle moves from position $i$ to position $i+1$ with probability $p$, while the probability it moves from $i$ to $i-1$ is $1-p$. Suppose that $p = 1/3$, the particle is currently at position $4$, and the particle eventually reaches position $7$. Find the probability that the particle moves to position $5$ in the next step.

### Hint

Use the conditional probability formula and the formula derived in Particle Reach III.

### 解答

We will solve this more generally for $p < 1/2$, the particle eventually reaches position $n > 1$, and the particle is currently at position $i < n$. We want the conditional probability of moving to position $i+1$ in the next step given that the particle is currently at position $i$ and eventually reaches position $n$.

$$$$

Given that we are currently at position $i$, the particle needs to move $n-i$ more steps to reach position $n$. Since $p < 1/2$, we can use the formula from Particle Reach III to yield the probability of reaching $n$ from $i$ is $\dfrac{p^{n-i}}{(1-p)^{n-i}}$. This is the denominator of the conditional probability.

$$$$

On the numerator, we are currently at position $i$. Then, we move to position $i+1$ with probability $p$ in the next step. Afterwards, the particle needs to move $n-(i+1)$ more steps to reach position $n$, which occurs with probability $\dfrac{p^{n-(i+1)}}{(1-p)^{n-(i+1)}}$. Therefore, the numerator of our conditional probability is $p \cdot \dfrac{p^{n-(i+1)}}{(1-p)^{n-(i+1)}} = \dfrac{p^{n-i}}{(1-p)^{n-(i+1)}}$

$$$$

The answer is thus $$\dfrac{p^{n-i}/(1-p)^{n-(i+1)}}{p^{n-i}/(1-p)^{n-i}} = 1-p$$ In particular, $p = 1/3$ here, so the answer is $2/3$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2/3"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "A75sA9j75ZhbnDLZgdt7",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-8 09:40:29 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7662214,
    "source": "ross",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Particle Reach IV",
    "topic": "probability",
    "urlEnding": "particle-reach-iv",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "A75sA9j75ZhbnDLZgdt7",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Particle Reach IV",
    "topic": "probability",
    "urlEnding": "particle-reach-iv"
  }
}
```
