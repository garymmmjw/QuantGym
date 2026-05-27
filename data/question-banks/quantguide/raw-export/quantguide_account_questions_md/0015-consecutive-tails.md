# QuantGuide Question

## 15. Consecutive Tails

**Metadata**

- ID: `UJFhH3BUhjcYOSiFgHmY`
- URL: https://www.quantguide.io/questions/consecutive-tails
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: original
- Tags: Combinatorics, Conditional Probability
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2024-3-30 02:31:49 America/New_York
- Last Edited By: Kaushik

### 题干

Suppose a coin is flipped $10$ times and the outcomes are recorded. Find the probability that any tails occur only in consecutive pairs. For example, with $4$ flips, $TTHH, TTTT,$ and $HHHH$ are both valid, but $HTHH$ and $TTTH$ are not valid.

### Hint

Consider this problem with $n$ coin flips. Let $t_n$ be the number of sequences of length $n$ where this is satisfied. For any such valid sequence of length $n$, it must end with either $H$ or $TT$. These subcases are both disjoint.

### 解答

Consider this problem with $n$ coin flips. Let $t_n$ be the number of sequences of length $n$ where this is satisfied. For any such valid sequence of length $n$, it must end with either $H$ or $TT$. These subcases are both disjoint.

$$$$

If our sequence ends with $H$, we can have any satisfactory sequence for the first $n-1$ flips. Therefore, there are $t_{n-1}$ such sequences of flips satisfying this. If our sequence ends with $TT$, we can have any satisfactory sequence for the first $n-2$ flips. Therefore, there are $t_{n-2}$ such sequences of flips satisfying this case. Therefore, we obtain the recurrence $t_n = t_{n-1} + t_{n-2}$.

$$$$

We now need some initial conditions. For $n = 1$, there is $1$ sequence satisfying this: $H$. For $n = 2$, there are $2$ sequences satisfying this: $HH$ and $TT$. Therefore, we can fully recognize this as $t_n = F_{n+1}$, where $F_n$ is the $n$th Fibonacci number. Thus, our probability is $\dfrac{F_{n+1}}{2^n}$. For $n = 10$, we get that our answer is $\dfrac{89}{1024}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "89/1024"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": true,
    "id": "UJFhH3BUhjcYOSiFgHmY",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2024-3-30 02:31:49 America/New_York",
    "lastEditedBy": "Kaushik",
    "orderId": 128561,
    "source": "original",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Consecutive Tails",
    "topic": "probability",
    "urlEnding": "consecutive-tails",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "UJFhH3BUhjcYOSiFgHmY",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Consecutive Tails",
    "topic": "probability",
    "urlEnding": "consecutive-tails"
  }
}
```
