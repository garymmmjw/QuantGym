# QuantGuide Question

## 815. OLS Review II

**Metadata**

- ID: `Op8J6noLF1dRTPU4YLsR`
- URL: https://www.quantguide.io/questions/ols-review-ii
- Topic: statistics
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Squarepoint Capital
- Source: Wackerly example 11.1
- Tags: Linear Regression
- Premium: True
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-4 23:59:18 America/New_York
- Last Edited By: Gabe

### 题干

Use the method of least squares to fit a straight line to the following dataset of ordered pairs $(x, y)$: $(-2, 0), (-1, 0), (0, 1), (1, 1), (2, 3)$. Find the sum of the slope and the intercept. 

### Hint

We assume $\mathbb{E}[Y] = \beta_0 + \beta_1 x$. The method of least squares will allow us to find $\hat{\beta}_0, \hat{\beta}_1$, the estimators for $\mathbb{E}[Y]$. We know that
\[
\begin{aligned}
    \hat{\beta}_1 &= \dfrac{S_{xy}}{S_{xx}}, \\
    \hat{\beta}_0 &= \bar{y} - \hat{\beta}_1 \bar{x}.
\end{aligned}
\]

### 解答

We assume $\mathbb{E}[Y] = \beta_0 + \beta_1 x$. The method of least squares will allow us to find $\hat{\beta}_0, \hat{\beta}_1$, the estimators for $\mathbb{E}[Y]$. We know that
\[
\begin{aligned}
    \hat{\beta}_1 &= \dfrac{S_{xy}}{S_{xx}}, \\
    \hat{\beta}_0 &= \bar{y} - \hat{\beta}_1 \bar{x}.
\end{aligned}
\]
For our data, we easily find $S_{xy} = \sum_{i = 1}^n (x_i - \bar{x})(y_i - \bar{y}) = 7$, and $S_{xx} = \sum_{i = 1}^n (x_i - \bar{x})^2 = 10$. Hence $\hat{\beta}_1 = \frac{7}{10}$, and $\hat{\beta}_0 = 1 - 0 = 1$. The sum of the two estimators is $\dfrac{17}{10}$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "17/10"
    ],
    "companies": [
      {
        "company": "Squarepoint Capital"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "Op8J6noLF1dRTPU4YLsR",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-4 23:59:18 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6688004,
    "source": "Wackerly example 11.1",
    "status": "published",
    "tags": [
      {
        "tag": "Linear Regression"
      }
    ],
    "title": "OLS Review II",
    "topic": "statistics",
    "urlEnding": "ols-review-ii",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Squarepoint Capital"
      }
    ],
    "difficulty": "easy",
    "id": "Op8J6noLF1dRTPU4YLsR",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Linear Regression"
      }
    ],
    "title": "OLS Review II",
    "topic": "statistics",
    "urlEnding": "ols-review-ii"
  }
}
```
