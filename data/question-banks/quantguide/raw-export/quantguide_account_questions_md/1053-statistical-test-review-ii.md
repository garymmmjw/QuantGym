# QuantGuide Question

## 1053. Statistical Test Review II

**Metadata**

- ID: `COpOjzgFj833A8uQ6b8a`
- URL: https://www.quantguide.io/questions/statistical-test-review-ii
- Topic: statistics
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: Wackerly 10.6b
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-11 21:44:50 America/New_York
- Last Edited By: Gabe

### 题干

We want to test whether or not a coin is balanced based on the number of heads, $X$, that appear after $36$ tosses of the coin. Let's say we use the rejection region $|x - 18| \geq 4$. If $p = 0.7$, what is the value of $\beta$ to the nearest ten thousandth?

### Hint

Recall, by definition, that $\beta$ is the probability that the test statistic, $X$, is not within the rejection region when $H_0$ is rejected

### 解答

Let us define
\[\begin{aligned}
    H_0 &: p = 0.5 \\
    H_a &: p \neq 0.5
\end{aligned}\]
Our rejection region is $|x - 18| \geq 4$. Recall, by definition, that $\beta$ is the probability that the test statistic, $X$, is not within the rejection region when $H_0$ is rejected, or in this case, $p = 0.7$. Let $Y \sim \text{Binom}(0.7)$. Then, 
\[\begin{aligned}
    \beta &= \mathbb{P}(Y \leq 21) - \mathbb{P}(Y \leq 14) \\
    &\approx 0.0916
\end{aligned}\]

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0.0915",
      "0.0916"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "COpOjzgFj833A8uQ6b8a",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-11 21:44:50 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8562032,
    "source": "Wackerly 10.6b",
    "status": "published",
    "tags": [],
    "title": "Statistical Test Review II",
    "topic": "statistics",
    "urlEnding": "statistical-test-review-ii",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "COpOjzgFj833A8uQ6b8a",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Statistical Test Review II",
    "topic": "statistics",
    "urlEnding": "statistical-test-review-ii"
  }
}
```
