# QuantGuide Question

## 1191. Statistical Test Review VI

**Metadata**

- ID: `sL6930EaKYfZNcN08wMP`
- URL: https://www.quantguide.io/questions/statistical-test-review-vi
- Topic: statistics
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: Wackerly 10.30
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Andy claims that $20\%$ of the public loves QuantGuide. Aaron dislikes Andy and wants to prove him wrong—specifically, he thinks Andy's estimate is too large. He takes a random sample of 100 people to test his claim. With $\alpha = 0.05$ (note that $z_{0.05} = -1.645$), what is the maximum number of people in the sample that may love QuantGuide such that Aaron can refute Andy's claim? 

### Hint

Our test statistic is
\[\begin{aligned}
    Z &= \frac{\hat{p} - p}{\sqrt{\frac{p(1 - p)}{n}}} = \frac{\hat{p} - 0.2}{0.04}
\end{aligned}\]

### 解答

Let $p$ denote the probability that a person loves QuantGuide. We define
\[\begin{aligned}
    H_0 &: p = 0.2 \\
    H_a &: p < 0.2 
\end{aligned}\]
For a Bernoulli random variable $X$ with parameter $p$, recall that $\mu = p$ and $\sigma^2 = p(1 - p)$. Let $\hat{p}$ denote the sample proportion. Since $n = 100$, our sample size is sufficiently large to assume that $\hat{p}$ is normally distributed with mean $p$ and variance $p(1-p)$. Our test statistic is
\[\begin{aligned}
    Z &= \frac{\hat{p} - p}{\sqrt{\frac{p(1 - p)}{n}}} = \frac{\hat{p} - 0.2}{0.04}
\end{aligned}\]
In order to reject the null hypothesis, we need our test statistic $Z$ to be less than $z_{0.05} = -1.645$. With some simple algebra we determine $\hat{p} < 0.1342$. The maximum integer number of people that may love QuantGuide such that Andy's claim can be refuted is therefore $13$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "13"
    ],
    "companies": [],
    "difficulty": "easy",
    "id": "sL6930EaKYfZNcN08wMP",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 9878328,
    "source": "Wackerly 10.30",
    "status": "published",
    "tags": [],
    "title": "Statistical Test Review VI",
    "topic": "statistics",
    "urlEnding": "statistical-test-review-vi"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "sL6930EaKYfZNcN08wMP",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Statistical Test Review VI",
    "topic": "statistics",
    "urlEnding": "statistical-test-review-vi"
  }
}
```
