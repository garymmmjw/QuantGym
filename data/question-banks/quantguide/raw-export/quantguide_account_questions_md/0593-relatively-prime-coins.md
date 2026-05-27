# QuantGuide Question

## 593. Relatively Prime Coins

**Metadata**

- ID: `TUZ4lS4scRH5wJQgr7sB`
- URL: https://www.quantguide.io/questions/relatively-prime-coins
- Topic: statistics
- Difficulty: medium
- Internal Difficulty: N/A
- Companies: N/A
- Source: N/A
- Tags: Discrete Random Variables
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

You flip a fair coin $n$ times. Let $X$ denote the number of heads, and let $Y$ denote the number of tails. $\mathbb{E}[XY]$ can be expressed in the form 
\[\begin{aligned}
\frac{an^2 + bn + c}{d}
\end{aligned}\]
for some integers $a, b, c, d$, where $a, b, c$ are each relatively prime with $d$. What is $a + b + c + d$?

### Hint

If $X$ heads are flipped out of a total of $n$ coin tosses, then $Y = n - X$ tails are flipped.Consider substituting this expression in for $Y$ and applying the linearity of expectation. 

### 解答

If $X$ heads are flipped out of a total of $n$ coin tosses, then $Y = n - X$ tails are flipped. Let's substitute this expression in for $Y$, simplify, and apply the linearity of expectation. 
\[\begin{aligned}
    \mathbb{E}[XY] &= \mathbb{E}[X(n - X)] \\
    &= n \cdot \mathbb{E}[X] - \mathbb{E}[X^2]
\end{aligned}\]
Note that $X \sim \text{Binom}(n, 0.5)$. Recall that for some $Z \sim \text{Binom}(n, p)$, $\mathbb{E}[Z] = np$ and $\text{Var}(Z) = npq$, where $q = 1 - p$. So, 
\[\begin{aligned}
    \mathbb{E}[X] &= \frac{n}{2} \\
    \text{Var}[X] &= \frac{n}{4}
\end{aligned}\]
We can compute $\mathbb{E}[X^2]$ as follows:
\[\begin{aligned}
    \text{Var}[X] &= \mathbb{E}[X^2] - (\mathbb{E}[X])^2 \\
    &= \frac{n}{4} \\
    \Rightarrow \mathbb{E}[X^2] &= \frac{n}{4} + \left( \frac{n}{2} \right)^2 \\
\end{aligned}\]
Returning to our original expression of interest,
\[\begin{aligned}
    \mathbb{E}[XY] &= \mathbb{E}[X(n - X)] \\
    &= n \cdot \mathbb{E}[X] - \mathbb{E}[X^2] \\
    &= \frac{n^2}{2} - \frac{n^2}{4} - \frac{n}{4} \\
    &= \frac{n^2 - n}{4}.
\end{aligned}\]
Our solution is therefore $1 - 1 + 4 = 4$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "4"
    ],
    "difficulty": "medium",
    "id": "TUZ4lS4scRH5wJQgr7sB",
    "internalDifficulty": 0,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 4745302,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Relatively Prime Coins",
    "topic": "statistics",
    "urlEnding": "relatively-prime-coins"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "TUZ4lS4scRH5wJQgr7sB",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Relatively Prime Coins",
    "topic": "statistics",
    "urlEnding": "relatively-prime-coins"
  }
}
```
