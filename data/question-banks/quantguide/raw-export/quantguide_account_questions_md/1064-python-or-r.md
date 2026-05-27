# QuantGuide Question

## 1064. Python or R

**Metadata**

- ID: `8fCYpsur7sDrUHzWe1Q7`
- URL: https://www.quantguide.io/questions/python-or-r
- Topic: statistics
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-23 13:16:15 America/New_York
- Last Edited By: Gabe

### 题干

Two sets of developers learn to code in Python or R, 50 to each language. At the end of the instructional period, a coding performance test yielded the results $\bar{x_1}=74, \bar{x_2}=71, s_1=9, s_2=10$. What is the attained significance level (to $4$ significant figures) of a test to conclude whether or not there is a difference in performance between the developers using the two languages? Assume simple random sampling, variance homogeneity, and that performance is approximately normally distributed.

### Hint

Two sets of developers learn to code in Python or R, 50 to each language. At the end of the instructional period, a coding performance test yielded the results $\bar{x_1}=74, \bar{x_1}=71, s_1=9, s_2=10$. What is the attained significance level of a test to conclude whether or not there is a difference in performance between the developers using the two languages? Assume simple random sampling, variance homogeneity, and that performance is approximately normally distributed.

### 解答

We are running a statistical test with the null hypothesis $H_0: \mu_1 = \mu_2$ against the alternative hypothesis $H_a: \mu_1 \neq \mu_2$. The z statistic is:

$$z = \frac{\bar{x_1} - \bar{x_2}}{\sqrt{\frac{{s_1}^2}{n_1} + \frac{{s_2}^2}{n_2}}} = \frac{74 - 71}{\sqrt{\frac{{9}^2}{50} + \frac{{10}^2}{50}}} \approx 1.577$$

Because this is a two-tailed test, the attained significance level is double the significance level of a one-side test, or:

$$2 \times P(z \geq 1.577) = 2 \times 0.0571 = 0.1142$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      ".1142"
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "8fCYpsur7sDrUHzWe1Q7",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-23 13:16:15 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8676464,
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Python or R",
    "topic": "statistics",
    "urlEnding": "python-or-r",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "8fCYpsur7sDrUHzWe1Q7",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Python or R",
    "topic": "statistics",
    "urlEnding": "python-or-r"
  }
}
```
