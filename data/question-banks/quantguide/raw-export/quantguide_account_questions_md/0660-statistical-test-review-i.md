# QuantGuide Question

## 660. Statistical Test Review I

**Metadata**

- ID: `r55mKLShAVoUUyAAsktQ`
- URL: https://www.quantguide.io/questions/statistical-test-review-i
- Topic: statistics
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: Wackerly 10.6a
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

We want to test whether or not a coin is balanced based on the number of heads, $X$, that appear after $36$ tosses of the coin. Let's say we use the rejection region $|x - 18| \geq 4$. What is the value of $\alpha$ to the nearest thousandth?

### Hint

Recall, by definition, that $\alpha$ is the probability that the test statistic, $X$, is within the rejection region when $H_0$ is true. 

### 解答

Let us define
\[\begin{aligned}
    H_0 &: p = 0.5 \\
    H_a &: p \neq 0.5
\end{aligned}\]
Our rejection region is $|x - 18| \geq 4$. Recall, by definition, that $\alpha$ is the probability that the test statistic, $X$, is within the rejection region when $H_0$ is true. Hence, 
\[\begin{aligned}
    \alpha &= \sum_{x = 0}^{14} \binom{36}{x} (0.5)^x (0.5^{36-x}) + \sum_{x = 22}^{36} \binom{36}{x} (0.5)^x (0.5)^{36 - x} \\
    &\approx 0.243
\end{aligned}\]

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0.243"
    ],
    "companies": [],
    "difficulty": "easy",
    "id": "r55mKLShAVoUUyAAsktQ",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 5304373,
    "source": "Wackerly 10.6a",
    "status": "published",
    "tags": [],
    "title": "Statistical Test Review I",
    "topic": "statistics",
    "urlEnding": "statistical-test-review-i"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "r55mKLShAVoUUyAAsktQ",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Statistical Test Review I",
    "topic": "statistics",
    "urlEnding": "statistical-test-review-i"
  }
}
```
