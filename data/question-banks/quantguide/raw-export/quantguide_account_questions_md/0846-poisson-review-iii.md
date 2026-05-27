# QuantGuide Question

## 846. Poisson Review III

**Metadata**

- ID: `lgEINbZoDAPI5kapGRIL`
- URL: https://www.quantguide.io/questions/poisson-review-iii
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: Wackerly
- Tags: Expected Value
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 11:54:05 America/New_York
- Last Edited By: Gabe

### 题干

The number of defects per foot of rope, $X$, satisfies $X \sim \text{Poisson}(2)$. The profit per foot of rope is $50 - 2X - X^2$. Compute the expected profit per foot of rope. 

### Hint

Use linearity of expectation and known facts about the mean and variance of the Poisson distribution.

### 解答

$$\mathbb{E}[50 - 2X - X^2] = 50 - 4 - \mathbb{E}[X^2]$. We can compute $\mathbb{E}[X^2]$ from our knowledge of the variance of $X$.
\[
\begin{aligned}
    \text{Var}(X) &= \mathbb{E}[X^2] - (\mathbb{E}[X])^2 \\
    &= \mathbb{E}[X^2] - 4 = 2 \\
    \mathbb{E}[X^2] &= 6
\end{aligned}
\]
Our answer is $50 - 4- 6 = 40$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "40"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "lgEINbZoDAPI5kapGRIL",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 11:54:05 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6916005,
    "source": "Wackerly",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Poisson Review III",
    "topic": "probability",
    "urlEnding": "poisson-review-iii"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "lgEINbZoDAPI5kapGRIL",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Poisson Review III",
    "topic": "probability",
    "urlEnding": "poisson-review-iii"
  }
}
```
