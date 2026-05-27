# QuantGuide Question

## 432. Marketing Claims

**Metadata**

- ID: `H2UMe5qpcSBPUlWdXyfF`
- URL: https://www.quantguide.io/questions/marketing-claims
- Topic: statistics
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-19 21:01:55 America/New_York
- Last Edited By: Gabe

### 题干

A designer watch brand claims that at least 25$\%$ of the public prefer their product over their competitor's. To check this claim, you sample 80 people and ask which product they prefer. With $\alpha=0.05$, how small would the sample percentage need to be before the claim could be rejected? Round to the nearest hundredth. Assume simple random sampling, variance homogeneity, and that sentiment is approximately normally distributed.

### Hint

You are solving for $\hat{p}$ of a one-tailed test of the hypothesis.

### 解答

We are testing the null hypothesis $H_0: p = 0.25$ against the alternative hypothesis $H_a: p < 0.25$. We are given $n=80$, $p=0.25$, and $\alpha=0.05$, and are looking for $\hat{p}$. The z statistic when $\alpha=0.05$ is -1.645, which can be substituted into the appropriate formula:

$$z = \frac{\hat{p} - p}{\sqrt{\frac{p(1-p)}{n}}} = \frac{\hat{p} - 0.25}{\sqrt{\frac{0.25(1-0.25)}{80}}} = -1.645 \Rightarrow \hat{p} \approx 0.17$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0.17"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "H2UMe5qpcSBPUlWdXyfF",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-19 21:01:55 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3461629,
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Marketing Claims",
    "topic": "statistics",
    "urlEnding": "marketing-claims",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "H2UMe5qpcSBPUlWdXyfF",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Marketing Claims",
    "topic": "statistics",
    "urlEnding": "marketing-claims"
  }
}
```
