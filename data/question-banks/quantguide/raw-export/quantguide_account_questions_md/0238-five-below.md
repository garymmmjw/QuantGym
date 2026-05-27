# QuantGuide Question

## 238. Five Below

**Metadata**

- ID: `npRWJNbUXN9t0rAlJc7j`
- URL: https://www.quantguide.io/questions/five-below
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Expected Value
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 13:59:27 America/New_York
- Last Edited By: Gabe

### 题干

You roll a die until you observe a $5$. What is the expected minimum number rolled?

### Hint

Let random variable $X$ denote the minimum number rolled after you repeatedly rolls a die until you get a $5$. Notice that $\mathbb{P}(X = 6) = 0$ since you will always roll a $5$. What is the $\mathbb{P}(X = 1)$, $\mathbb{P}(X = 2)$, and so on?

### 解答

Let random variable $X$ denote the minimum number rolled after you repeatedly rolls a die until you get a $5$. Notice that $\mathbb{P}(X = 6) = 0$, since a $5$ will always be rolled. By the definition of expectation, we have:
\[\begin{aligned}
    \mathbb{E}[X] &= \sum_{x = 1}^5 x \cdot \mathbb{P}(X = x).
\end{aligned}\]
Let's compute $\mathbb{P}(X = 1)$. In other words, we want to find the probability that there exists at least one $1$ before a $5$ occurs. Notice that there are only two possibilities (we don't care what the numbers between $1$ and $5$ actually are): (1) a $1$ appears before a $5$, or (2) a $5$ appears before a $1$. By symmetry and the law of total probability, we conclude that $\mathbb{P}(X = 1) = 1/2$.

$$$$

Next, let's compute $\mathbb{P}(X = 2)$. In order for $2$ to be the minimum value, a $1$ cannot be rolled before the first $5$, and a $2$ must be rolled before the first $5$. Consider an arbitrary sequence of rolled values of infinite length that contains at least one each of $1$, $2$, and $5$. There are a couple possibilities. Just to name a few: (1) $1$ appears before $2$ which appears before $5$, and (2) $2$ appears before $5$ which appears before $1$, and (3) $2$ appears before $1$ which appears before $5$. In total, there are $3! = 6$ ways to order $\{1, 2, 5\}$. Only when we have $\{2, 5, 1\}$ will we achieve $X = 2$. By symmetry and the law of total probability, for an arbitrary sequence of infinite length, the probability that a $2$ appears before a $5$ which appears before a $1$ is $1/6$. 

$$$$

Similarly, for $\mathbb{P}(X = 3)$, we need to find orderings of $\{1, 2, 3, 5\}$ such that $3$ appears before $5$ which appears before $1$ and $2$ in any order. Therefore, $\mathbb{P}(X = 3) = 2! / 4! = 1/12$. Repeating this logic for $\mathbb{P}(X = 4)$ and $\mathbb{P}(X = 5)$, we find $\mathbb{P}(X = 4) = 3! / 5! = 1/20$ and $\mathbb{P}(X = 5) = 4! / 5! = 1/5$. Putting it all together, we find:
\[\begin{aligned}
    \mathbb{E}[X] &= \sum_{x = 1}^5 x \cdot \mathbb{P}(X = x) \\
    &= \frac{1}{2} + 2 \cdot \frac{1}{6} + 3 \cdot \frac{1}{12} + 4 \cdot \frac{1}{20} + 5 \cdot \frac{1}{5} \\
    &= \boxed{\frac{137}{60}}.
\end{aligned}\]

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "137/60"
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "npRWJNbUXN9t0rAlJc7j",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 13:59:27 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1887910,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Five Below",
    "topic": "probability",
    "urlEnding": "five-below"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "npRWJNbUXN9t0rAlJc7j",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Five Below",
    "topic": "probability",
    "urlEnding": "five-below"
  }
}
```
