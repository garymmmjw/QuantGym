# QuantGuide Question

## 492. Connected Origin

**Metadata**

- ID: `QJhwaPhiga0QFFQW4R87`
- URL: https://www.quantguide.io/questions/connected-origin
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: N/A
- Tags: Events
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Suppose that in the integer lattice $\mathbb{Z}^2$, each pair of vertices of Euclidean distance 1 has a path connecting them with probability $p$. Using the bound provided by sub-additivity, the interval of values of $p$ so that the probability that the origin is in an infinite connected component is $0$ is in the form $(0,a)$. Find $a$.

### Hint

Let $A$ be the event that the origin belongs to a connected component. Suppose $A$ holds. Then for any length $n$, there must be a path $\gamma$ of length $n$ that passes through the origin. For each path $\gamma$, let $A_{\gamma}$ be the event that path $\gamma$ is present.

### 解答

Let $A$ be the event that the origin belongs to a connected component. Suppose $A$ holds. Then for any length $n$, there must be a path $\gamma$ of length $n$ that passes through the origin. For each path $\gamma$, let $A_{\gamma}$ be the event that path $\gamma$ is present. Since our path is of length $n$, $\mathbb{P}[A_{\gamma}] = p^n$, where $p$ is the probability that each individual component of the path is present.

$$$$

Now, by sub-additivity and the fact that the collection of all infinite components passing through the origin is a subset of the length $n$ components passing through the origin (and then the rest of the path is irrelevant after that), $$\mathbb{P}[A] \leq \mathbb{P}\left[\displaystyle \bigcup_{\gamma} A_{\gamma}\right] \displaystyle \leq \sum_{\gamma} \mathbb{P}[A_{\gamma}] = \sum_{\gamma} p^n$$

How many paths $\gamma$ are there of length $n$ passing through the origin? An easy upper bound is to note that the initial direction has $4$ choices, and then after that, there are at most $3$ other directions that the path can go at each step, as it can't go backwards to the spot it was before. Therefore, an upper bound on the number of such paths is $4 \cdot 3^{n-1}$. Therefore $\mathbb{P}[A] \leq 4 \cdot 3^{n-1} \cdot p^n = \dfrac{4}{3} \cdot (3p)^n$. For this probability to tend to $0$, we need $3p < 1$, so $p < \dfrac{1}{3}$. Therefore, our interval is $\left(0,\dfrac{1}{3}\right)$, so $a = \dfrac{1}{3}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/3"
    ],
    "difficulty": "medium",
    "id": "QJhwaPhiga0QFFQW4R87",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 3921418,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Connected Origin",
    "topic": "probability",
    "urlEnding": "connected-origin"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "QJhwaPhiga0QFFQW4R87",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Connected Origin",
    "topic": "probability",
    "urlEnding": "connected-origin"
  }
}
```
