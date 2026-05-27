# QuantGuide Question

## 258. Hatching Eggs I

**Metadata**

- ID: `ze0QMCEq7TQ1RxmWJOEa`
- URL: https://www.quantguide.io/questions/hatching-eggs-i
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: Wackerly
- Tags: Expected Value
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-8-26 14:35:11 America/New_York
- Last Edited By: Gabe

### 题干

Amy has a chicken. The number of eggs laid by the chicken in a month follows a Poisson process with $\lambda = 6$. The probability that an egg hatches is $0.3$. Eggs hatch independently of one another. Compute the expected number of hatched eggs. 

### Hint

Use the Law of Total Expectation to condition on the number of eggs that are laid.

### 解答

Let $X$ denote the number of eggs laid. $X \sim \text{Pois}(6)$. Let $Y$ denote the number of egg hatches. Note that the value of $Y$ depends on the number of eggs hatched, $X$. For example, if $X = x$, then, letting $E_1, E_2, \ldots, E_n \overset{\text{iid}}{\sim} \text{Bernoulli}(0.3)$ be indicator variables for each egg, we have:
\[
\begin{aligned}
    Y &= \sum_{i = 1}^x E_i.
\end{aligned}
\]
It follows from the linearity of expectation that 
\[
\begin{aligned}
    \mathbb{E}[Y|X=x] &= 0.3x
\end{aligned}
\]
Our last step is to use the law of total expectation.
\[
\begin{aligned}
    \mathbb{E}[Y] &= \mathbb{E}[\mathbb{E}[Y|X]] \\
    &= \mathbb{E}[0.3X] \\
    &= \frac{3}{10} \cdot 6 \\
    &= \frac{9}{5}
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
    "id": "ze0QMCEq7TQ1RxmWJOEa",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 14:35:11 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2020146,
    "randomizable": "",
    "source": "Wackerly",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Hatching Eggs I",
    "topic": "probability",
    "urlEnding": "hatching-eggs-i",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "ze0QMCEq7TQ1RxmWJOEa",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Hatching Eggs I",
    "topic": "probability",
    "urlEnding": "hatching-eggs-i"
  }
}
```
