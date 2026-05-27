# QuantGuide Question

## 1125. Red Blue Equality

**Metadata**

- ID: `R7O6XvXsCznrwHUm7oTe`
- URL: https://www.quantguide.io/questions/red-blue-equality
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Old Mission
- Source: OMC OA
- Tags: Conditional Probability, Events
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

$$3$ red and $n$ blue socks are in a drawer. We know that when two socks are drawn uniformly at random without replacement, the probability both socks are red is $\dfrac{1}{2}$. Find $n$.

### Hint

We want a pair of red socks to show with probability $\dfrac{1}{2}$. Find the probability when there are $n$ other socks there.

### 解答

We want a pair of red socks to show with probability $\dfrac{1}{2}$. The probability the first sock is red is $\dfrac{3}{n+3}$. The probability the second sock is red is $\dfrac{2}{n+2}$, as we took out one red sock. Therefore, the probability of both socks being red is $\dfrac{6}{(n+2)(n+3)}$. This must equal $\dfrac{1}{2}$, so we need $$\dfrac{6}{(n+2)(n+3)} = \dfrac{1}{2}$$ Equivalently, this means $(n+2)(n+3) = 12$ after rearranging. Expanding this out, we have that $n^2 + 5n - 6 = 0$, so $(n+6)(n-1) = 0$, meaning $n = 1,-6$ solves this. $-6$ is not possible, so $n = 1$ is our answer.

$$$$

Note that one can see this quickly by noting that $n \leq 3$, as otherwise, it would be less likely to draw two red than two blue. We can rule out $n = 0$, as that probability would be $1$. Therefore, that leaves us three cases to check.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1"
    ],
    "companies": [
      {
        "company": "Old Mission"
      }
    ],
    "difficulty": "easy",
    "id": "R7O6XvXsCznrwHUm7oTe",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 9260208,
    "source": "OMC OA",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Events"
      }
    ],
    "title": "Red Blue Equality",
    "topic": "probability",
    "urlEnding": "red-blue-equality"
  },
  "list_summary": {
    "companies": [
      {
        "company": "Old Mission"
      }
    ],
    "difficulty": "easy",
    "id": "R7O6XvXsCznrwHUm7oTe",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Events"
      }
    ],
    "title": "Red Blue Equality",
    "topic": "probability",
    "urlEnding": "red-blue-equality"
  }
}
```
