# QuantGuide Question

## 582. Hatching Eggs II

**Metadata**

- ID: `3LFeBSy1eVTUls94fOJt`
- URL: https://www.quantguide.io/questions/hatching-eggs-ii
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: Wackerly
- Tags: Expected Value
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-8-26 14:08:44 America/New_York
- Last Edited By: Gabe

### 题干

Amy has a chicken. The number of eggs laid by the chicken in a month follows a Poisson process with $\lambda = 6$. The probability that an egg hatches is $0.3$. Eggs hatch independently of one another. Compute the variance of the number of hatched eggs. 

### Hint

Use the Law of Total Variance and the result of Hatching Eggs I.

### 解答

Let $X$ denote the number of eggs laid. $X \sim \text{Pois}(6)$. Let $Y$ denote the number of egg hatches. Note that the value of $Y$ depends on the number of eggs hatched, $X$. For example, if $X = x$, then, letting $E_1, E_2, \ldots, E_n \overset{\text{iid}}{\sim} \text{Bernoulli}(0.3)$ be indicator variables for each egg, we have: 
\[
\begin{aligned}
    Y &= \sum_{i = 1}^x E_i.
\end{aligned}
\]
We are interested in $\text{Var}[Y]$. We can utilize the law of total variance. 
\[
\begin{aligned}
    \text{Var}[Y] &= \mathbb{E}[\text{Var}[Y|X]] + \text{Var}[\mathbb{E}[Y|X]] 
\end{aligned}
\]
Note that
\[
\begin{aligned}
    \text{Var}[Y|X] &= 0.3X \\
    \mathbb{E}[Y|X] &= X(0.3)(0.7) \\
    &= 0.21 X
\end{aligned}
\]
Plugging these values in, we find
\[
\begin{aligned}
    \text{Var}[Y] &= \mathbb{E}[\text{Var}[Y|X]] + \text{Var}[\mathbb{E}[Y|X]]  \\
    &= 0.3^2 \text{Var}[X] + 0.21 \mathbb{E}[X]
\end{aligned}
\]
Recall that $\text{Var}[X] = \lambda = 6$ and $\mathbb{E}[X] = \lambda = 6$. Our final answer is
\[
\begin{aligned}
    \text{Var}[Y] &= 0.3^2 \cdot 6 + 0.21 \cdot 6 \\
    &= 1.8
\end{aligned}
\]

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "9/5"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "3LFeBSy1eVTUls94fOJt",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 14:08:44 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4679745,
    "randomizable": "",
    "source": "Wackerly",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Hatching Eggs II",
    "topic": "probability",
    "urlEnding": "hatching-eggs-ii",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "3LFeBSy1eVTUls94fOJt",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Hatching Eggs II",
    "topic": "probability",
    "urlEnding": "hatching-eggs-ii"
  }
}
```
