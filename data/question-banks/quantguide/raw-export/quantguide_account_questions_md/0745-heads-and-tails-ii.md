# QuantGuide Question

## 745. Head-Tail Equality

**Metadata**

- ID: `VocPdnEujkZNMmqj9WzW`
- URL: https://www.quantguide.io/questions/heads-and-tails-ii
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: Five Rings
- Source: N/A
- Tags: Expected Value
- Premium: True
- Solution Free: False
- Version: 3
- Last Edited: 2023-11-4 20:35:26 America/New_York
- Last Edited By: Gabe

### 题干

Aaron flips a fair coin until he receives an equal amount of heads and tails. For example, HHTHTT would correspond to $6$ flips. What is the reciprocal of the expected number of flips Aaron does?

### Hint

Consider the absolute difference between the number of heads and tails.

### 解答

Our first flip will either turn up to be $H$ or $T$. Therefore, the difference (in absolute value) between the number of $H$ and $T$ will be $1$ after $1$ flip. Let $H_n$ and $T_n$, respectively, be the number of heads and tails that occur in the first $n$ flips. If $N$ represents our stopping time, then $N = \text{min}\{n > 0 : H_n = T_n\}$. 

$$$$

The key here is that we consider $S_n = |H_n - T_n|$, the absolute difference between the number of heads and tails in the first $n$ flips. We can see that $S_n$ is a symmetric random walk on the non-negative integers with a reflecting boundary at $0$. This is because we either move left or right $1$ with equal probability at each step when $S_n > 0$. These correspond to either the difference between heads and tails increasing or decreasing by $1$ at each step. Furthermore, the fact that this is a reflecting random walk is irrelevant to this question. This is because we want to stop at the first time where we return to $S_n = 0$, when $H_n = T_n$ and don't care what happens after that. Therefore, our question simplifies to finding the expected return time to $0$ in a symmetric random walk on the integers starting from $1$. Mathematically, we want $\mathbb{E}[N]$, where $N = \text{min}\{n > 0 : S_n = 0\}$ and we start at $S_0 = 0$.

$$$$

There are some further simplifications that can be made. Since the random walk is shift-invariant, this is the expected time starting from $0$ to hit $-1$ in our random walk. Since our random walk is symmetric, the expected time to hit $-1$ is the same as the expected time to hit $1$. If $R_n$ is a symmetric random walk on the integers (recall that we no longer care that it is on the positive integers), then we want $\mathbb{E}[N_1]$, with $N_1 = \text{min}\{n : R_n = 1\}$.

$$$$

Suppose that $\mathbb{E}[N_1] < \infty$. As we can represent $R_n = \displaystyle \sum_{i=1}^n X_i$, with each $X_i$ being $\pm 1$ with equal probability IID (this is the sum of left and right steps), by Wald's Identity, $\mathbb{E}[R_{N_1}] = \mathbb{E}[N_1]\mathbb{E}[X_1]$. We know that the LHS is $1$ with probability $1$ by the definition of $N_1$. By a direct calculation, we know $\mathbb{E}[X_1] = 0$. Therefore, if $\mathbb{E}[N_1]$ were finite, the LHS would be $1$ and the RHS $0$, leading to a contradiction. Thus, this expectation must be infinite and the answer is 0.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0"
    ],
    "companies": [
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "VocPdnEujkZNMmqj9WzW",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-4 20:35:26 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6103910,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Head-Tail Equality",
    "topic": "probability",
    "urlEnding": "heads-and-tails-ii",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "hard",
    "id": "VocPdnEujkZNMmqj9WzW",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Head-Tail Equality",
    "topic": "probability",
    "urlEnding": "heads-and-tails-ii"
  }
}
```
