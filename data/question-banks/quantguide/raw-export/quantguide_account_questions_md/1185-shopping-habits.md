# QuantGuide Question

## 1185. Shopping Habits

**Metadata**

- ID: `1NDHczrPVOjatmK4XAZr`
- URL: https://www.quantguide.io/questions/shopping-habits
- Topic: statistics
- Difficulty: hard
- Internal Difficulty: 3
- Companies: Two Sigma, Jane Street
- Source: N/A
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-26 11:07:18 America/New_York
- Last Edited By: Gabe

### 题干

A researcher is investigating the temporal effect of shopping habits at the mall. She independently and randomly selects 20 weekend and 20 weekday shoppers and finds that weekend shoppers spend $\$$78 on average with a standard deviation of $\$$22, while weekday shoppers spend $\$$67 on average with a standard deviation of $\$$20. The researcher would like to test if there is sufficient evidence to claim that there is a significant difference in the average amount spent by weekend and weekday shoppers. What is the attained significance level? Round to 3 significant figures. Assume simple random sampling, variance homogeneity, and that spending is approximately normally distributed.

### Hint

Because neither sample size is sufficiently large, you should use a $t$ test with $20+20-2=38$ degrees of freedom.

### 解答

We are testing the null hypothesis $H_0: \mu_1 = \mu_2$ against the alternative hypothesis $H_a: \mu_1 \neq \mu_2$. Because neither sample size is sufficiently large, we must use a $t$ test with 38 degrees of freedom:

$$t = \frac{\bar{x_1} - \bar{x_2}}{S_p \sqrt{\frac{1}{n_1} + \frac{1}{n_2}}} \textrm{ where } S_p = \sqrt{\frac{(n_1-1)S_1 ^2 + (n_2-1)S_2 ^2}{n_1+n_2-2}}$$

Solving for $S_p$:

$$S_p = \sqrt{\frac{(20-1)\times 22 ^2 + (20-1) \times 20 ^2}{20+20-2}} \approx 21.024$$

Solving for $t$:

$$t = \frac{78 - 67}{21.024 \sqrt{\frac{1}{20} + \frac{1}{20}}} \approx 1.655$$

Because this is a two-tailed test, the attained significance level is double the p-value of a one-tailed test. Thus,

$$p\textrm{-value} = 2 \times P(t \geq 1.655) = 2 \times .05308 \approx  0.106$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0.106"
    ],
    "companies": [
      {
        "company": "Two Sigma"
      },
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "1NDHczrPVOjatmK4XAZr",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-26 11:07:18 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9836089,
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Shopping Habits",
    "topic": "statistics",
    "urlEnding": "shopping-habits",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Two Sigma"
      },
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "hard",
    "id": "1NDHczrPVOjatmK4XAZr",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Shopping Habits",
    "topic": "statistics",
    "urlEnding": "shopping-habits"
  }
}
```
