# QuantGuide Question

## 595. Double Data Trouble III

**Metadata**

- ID: `iHHLOFgJsv4Gd36OqNdH`
- URL: https://www.quantguide.io/questions/double-data-trouble-iii
- Topic: statistics
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Two Sigma, Squarepoint Capital
- Source: N/A
- Tags: Linear Regression
- Premium: True
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-5 00:03:09 America/New_York
- Last Edited By: Gabe

### 题干

Suppose that you run linear regression on some dataset and obtain the coefficients $\hat{y}_i = \hat{\beta}_0 + \hat{\beta}_1 x_i$. Let $t_0$ be the $t-$statistic obtained when testing the null hypothesis $H_0: \beta_1 = 0$ against $H_A: \beta_1 \neq 0$. Suppose that we duplicate our data and then run linear regression again on this new data set. Let $\hat{y}_i= \hat{\beta}_0' + \hat{\beta}_1' x_i$ be the new coefficients that are obtained. If $t_1$ is the corresponding $t-$statistic obtained when testing the null hypothesis $H_1: \beta_1' = 0$ against $H_A: \beta_1' \neq 0$, find $\dfrac{t_1^2}{t_0^2}$. If it can't be determined, enter $-1$.

### Hint

From Double Data Trouble II, we know that the variance of our estimate is reduced by $\dfrac{1}{2}$, so the standard error is reduced by $\dfrac{1}{\sqrt{2}}$.

### 解答

From Double Data Trouble II, we know that the variance of our estimate is reduced by $\dfrac{1}{2}$, so the standard error is reduced by $\dfrac{1}{\sqrt{2}}$. As $t_0 = \dfrac{\hat{\beta}_1}{s\left\{\hat{\beta}_1\right\}}$, we know that the estimate $\hat{\beta}_1'$ is the same from Double Data Trouble I, and that the standard error in the denominator is $\dfrac{1}{\sqrt{2}}$ as large for $\hat{\beta}_1'$, we get that $t_1 = \sqrt{2} t_0$, meaning that $t_1^2 = 2t_0^2$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2"
    ],
    "companies": [
      {
        "company": "Two Sigma"
      },
      {
        "company": "Squarepoint Capital"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "iHHLOFgJsv4Gd36OqNdH",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 00:03:09 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4760530,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Linear Regression"
      }
    ],
    "title": "Double Data Trouble III",
    "topic": "statistics",
    "urlEnding": "double-data-trouble-iii",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Two Sigma"
      },
      {
        "company": "Squarepoint Capital"
      }
    ],
    "difficulty": "easy",
    "id": "iHHLOFgJsv4Gd36OqNdH",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Linear Regression"
      }
    ],
    "title": "Double Data Trouble III",
    "topic": "statistics",
    "urlEnding": "double-data-trouble-iii"
  }
}
```
