# QuantGuide Question

## 1166. Statistical Test Review VII

**Metadata**

- ID: `wChp30ci5PZFargy0Czy`
- URL: https://www.quantguide.io/questions/statistical-test-review-vii
- Topic: statistics
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: Wackerly 10.39
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-11 09:54:50 America/New_York
- Last Edited By: Gabe

### 题干

Andy claims that $20\%$ of the public loves QuantGuide. Aaron dislikes Andy and wants to prove him wrong—specifically, he thinks Andy's estimate is too large. He takes a random sample of 100 people to test his claim. It turns out that 15 of the 100 people love QuantGuide, so Aaron argues that $15\%$ of the public loves QuantGuide. Compute, to the nearest thousandth, the value of $\beta$ for Aaron's alternative hypothesis under a $0.05$-level test (note that $z_{0.05} = -1.645$). 

### Hint

Our test statistic is
\[\begin{aligned}
    Z &= \frac{\hat{p} - p}{\sqrt{\frac{p(1 - p)}{n}}}
\end{aligned}\]

### 解答

Let $p$ denote the probability that a person loves QuantGuide. We define
\[\begin{aligned}
    H_0 &: p = 0.2 \\
    H_a &: p = 0.15 
\end{aligned}\]
Our test statistic is
\[\begin{aligned}
    Z &= \frac{\hat{p} - p}{\sqrt{\frac{p(1 - p)}{n}}} = \frac{\hat{p} - 0.2}{0.04}
\end{aligned}\]
$Z$ should be a standard normal random variable under the null hypothesis. Under the alternative hypothesis, 
\[\begin{aligned}
    Z_a &= \frac{\hat{p} - p}{\sqrt{\frac{p(1 - p)}{n}}} \approx \frac{\hat{p} - 0.15}{0.357}
\end{aligned}\]
Recall, by definition, that $\beta$ is the probability that the test statistic, X, is not within the rejection region when $H_0$ is rejected. So, 
\[\begin{aligned}
    \beta &= \mathbb{P}\left( \frac{10(\hat{p} - 1.5)}{0.357} > \frac{0.4 \cdot (-1.645 + 5) - 1.5}{0.357}\right) \\
    &= \mathbb{P}\left( \frac{10(\hat{p} - 1.5)}{0.357} \leq 0.04426 \right) \approx 0.671
\end{aligned}\]

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0.671"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "wChp30ci5PZFargy0Czy",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-11 09:54:50 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9699133,
    "source": "Wackerly 10.39",
    "status": "published",
    "tags": [],
    "title": "Statistical Test Review VII",
    "topic": "statistics",
    "urlEnding": "statistical-test-review-vii",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "wChp30ci5PZFargy0Czy",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Statistical Test Review VII",
    "topic": "statistics",
    "urlEnding": "statistical-test-review-vii"
  }
}
```
