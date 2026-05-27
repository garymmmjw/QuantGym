# QuantGuide Question

## 1020. Sine Condition

**Metadata**

- ID: `GlB6rp1SqvJzDVOoWSQd`
- URL: https://www.quantguide.io/questions/sine-condition
- Topic: probability
- Difficulty: medium
- Internal Difficulty: N/A
- Companies: N/A
- Source: N/A
- Tags: Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

$$X \sim \text{Unif}([0, \pi])$. Find $\cos(\mathbb{E}[X | \sin(X)])$.

### Hint

Recall the definition of conditional probability, where $A$ is an event: 
\[\begin{aligned}
    \mathbb{E}[X | A] &= \int_x \mathbb{P}[X = x \,|\, A] \;dx.
\end{aligned}\]

### 解答

We will offer an informal justification. Recall the definition of conditional probability, where $A$ is an event: 
\[\begin{aligned}
    \mathbb{E}[X | A] &= \int_x \mathbb{P}[X = x \,|\, A] \;dx.
\end{aligned}\]
Let's say that you are told that $\sin(X) = 1/2$. What can we say about $X$? We might be able to use $\arcsin$ here.
\[\begin{aligned}
    X = \arcsin\left( \frac{1}{2} \right).
\end{aligned}\]
However, we also know that there could be multiple possible values of $X$ within the interval $[0, \pi]$ such that $\sin(X) = 1/2$. Looking at a plot of $\sin(X)$, we notice that $\sin(X) = 1/2$ when $X = \arcsin(1/2)$ and when $X = \pi - \arcsin(1/2)$. Replacing $1/2$ with some general value $a \in [0, \pi]$, we find that there are two values for $X$ such that $\sin(X) = a$: $\arcsin(a)$ and $\pi - \arcsin(a)$. The only exception to this observation is when $\sin(X) = 1$. Then, $X = \pi/2$. So, given $\sin(X) = a$ where $a \in [0, 1)$, $\mathbb{E}[X | \sin(X) = a] = (\arcsin(a) + \pi - \arcsin(a))/2 = \pi/2$. And, of course, in the case that we're given $\sin(X) = 1$, we have $\mathbb{E}[X | \sin(X) = 1] = \pi/2$. Therefore, $\mathbb{E}[X | \sin(X)] = \pi/2$, and $\cos(\frac{\pi}{2}) = 0.$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0"
    ],
    "difficulty": "medium",
    "id": "GlB6rp1SqvJzDVOoWSQd",
    "internalDifficulty": 0,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 8269184,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Sine Condition",
    "topic": "probability",
    "urlEnding": "sine-condition"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "GlB6rp1SqvJzDVOoWSQd",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Sine Condition",
    "topic": "probability",
    "urlEnding": "sine-condition"
  }
}
```
