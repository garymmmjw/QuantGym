# QuantGuide Question

## 671. Double Data Trouble VI

**Metadata**

- ID: `NH3TD8rCqndYNJwuivPl`
- URL: https://www.quantguide.io/questions/double-data-trouble-vi
- Topic: statistics
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Two Sigma, Squarepoint Capital
- Source: N/A
- Tags: Linear Regression
- Premium: True
- Solution Free: False
- Version: 3
- Last Edited: 2023-11-5 00:03:21 America/New_York
- Last Edited By: Gabe

### 题干

Suppose that you run linear regression on some dataset and obtain the coefficients $\hat{y}_i = \hat{\beta}_0 + \hat{\beta}_1 x_i$. Let $t_0$ be the $t-$statistic obtained when testing the null hypothesis $H_0: \beta_1 = 0$ against $H_A: \beta_1 \neq 0$. Suppose that we double the values of each of our data points and then run linear regression again on this new data set. Let $\hat{y}_i= \hat{\beta}_0' + \hat{\beta}_1' x_i$ be the new coefficients that are obtained. If $t_1$ is the corresponding $t-$statistic obtained when testing the null hypothesis $H_1: \beta_1' = 0$ against $H_A: \beta_1' \neq 0$, find $\dfrac{t_1^2}{t_0^2}$. If it cannot be determined, enter $-1$.

### Hint

From Double Data Trouble V, we know that the variance of our estimate is reduced by $\dfrac{1}{4}$, so the standard error is reduced by $\dfrac{1}{2}$.

### 解答

From Double Data Trouble V, we know that the variance of our estimate is the same, so the standard error is also the same. As $$t_0 = \dfrac{\hat{\beta}_1}{s\left\{\hat{\beta}_1\right\}}$$ we know that the estimate $\hat{\beta}_1'$ is the same from Double Data Trouble I, and that the standard error in the denominator is same for $\hat{\beta}_1'$. Therefore, we get that $t_1 =  t_0$, meaning that $t_1^2 = t_0^2$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1"
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
    "id": "NH3TD8rCqndYNJwuivPl",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 00:03:21 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5392784,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Linear Regression"
      }
    ],
    "title": "Double Data Trouble VI",
    "topic": "statistics",
    "urlEnding": "double-data-trouble-vi",
    "version": 3
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
    "id": "NH3TD8rCqndYNJwuivPl",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Linear Regression"
      }
    ],
    "title": "Double Data Trouble VI",
    "topic": "statistics",
    "urlEnding": "double-data-trouble-vi"
  }
}
```
