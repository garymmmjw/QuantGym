# QuantGuide Question

## 1068. Conditional Expectation II

**Metadata**

- ID: `PZMOWid9evFJBS2b21d3`
- URL: https://www.quantguide.io/questions/conditional-expectation-ii
- Topic: statistics
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: Conditional Expectation
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-25 16:45:34 America/New_York
- Last Edited By: Gabe

### 题干

Suppose $X \sim \text{Pois}(\lambda)$, where $\lambda \sim \text{Exp}(1)$. Compute $\mathbb{E}[X]$.

### Hint

Note that $\text{Var}[X] = \mathbb{E}[X^2] - (\mathbb{E}[X])^2$. Begin by finding $\mathbb{E}[X]$ using the Law of Total Expectation. 

### 解答

Let's compute $\mathbb{E}[X]$ using the law of total expectation.
\[\begin{aligned}
\mathbb{E}[X] &= \mathbb{E}[\mathbb{E}[X|\lambda]]
\end{aligned}\]
If the value of $\lambda$ is known, then $X$ follows a set Poisson distribution, meaning we can describe its expectation. 
\[\begin{aligned}
\mathbb{E}[X|\lambda] &= \lambda
\end{aligned}\]
Recall
\[\begin{aligned}
f_{\lambda}(t) &= 
\begin{cases}
    e^{-t} & \text{ if } t \geq 0 \\
    0 & \text{ otherwise }
\end{cases}
\end{aligned}\]
So, it follows from the law of total expectation,
\[\begin{aligned}
\mathbb{E}[X] &= \mathbb{E}[\mathbb{E}[X|\lambda]] \\
&= \int_0^\infty f_\lambda(t) \mathbb{E}[X|t] \, dt  \\
&= \int_0^\infty te^{-t} \,dt \\
&= \left[ -\lambda e^{-\lambda} - e^{-\lambda} \right]_0^\infty \\
&= 1
\end{aligned}\]

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "PZMOWid9evFJBS2b21d3",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-25 16:45:34 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8705208,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Conditional Expectation II",
    "topic": "statistics",
    "urlEnding": "conditional-expectation-ii"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "PZMOWid9evFJBS2b21d3",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Conditional Expectation II",
    "topic": "statistics",
    "urlEnding": "conditional-expectation-ii"
  }
}
```
