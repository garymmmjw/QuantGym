# QuantGuide Question

## 234. Poisson Review I

**Metadata**

- ID: `c1Gv8DeJgISydvEEEXer`
- URL: https://www.quantguide.io/questions/poisson-review-i
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: Wackerly
- Tags: Discrete Random Variables
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-27 09:32:43 America/New_York
- Last Edited By: Gabe

### 题干

On average, 7 customers arrive at the QuantGuide gift shop per hour following a Poisson process. To the nearest thousandth, what is the probability that at least 4 customers arrive in a given hour?

### Hint

The rate of arrival is $7$ per hour. What distribution should $X$ follow?

### 解答

Let $X \sim \text{Poisson}(7)$. We wish to compute $\mathbb{P}(X \geq 4) = 1 - \mathbb{P}(X \leq 3)$. Recall that the pmf of a Poisson random variable is $\mathbb{P}[X = x] = \frac{\lambda^x}{x!}e^{-\lambda}$. $$$$
\[
\begin{aligned}
    1 - \mathbb{P}(X \leq 3) &= 1 - \sum_{x = 0}^3 \frac{\lambda^x}{x!}e^{-\lambda} \\
    &\approx 0.918
\end{aligned}
\]

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0.918"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "c1Gv8DeJgISydvEEEXer",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-27 09:32:43 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1862000,
    "source": "Wackerly",
    "status": "published",
    "tags": [
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Poisson Review I",
    "topic": "probability",
    "urlEnding": "poisson-review-i",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "c1Gv8DeJgISydvEEEXer",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Poisson Review I",
    "topic": "probability",
    "urlEnding": "poisson-review-i"
  }
}
```
