# QuantGuide Question

## 848. OLS Review I

**Metadata**

- ID: `xt0JtsFIhFpCWxDAU5CH`
- URL: https://www.quantguide.io/questions/ols-review-i
- Topic: statistics
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Squarepoint Capital
- Source: Wackerly 11.3
- Tags: Linear Regression
- Premium: False
- Solution Free: False
- Version: 3
- Last Edited: 2023-11-4 23:59:21 America/New_York
- Last Edited By: Gabe

### 题干

Consider the following ordered pairs $(x, y)$: $(-2, 3), (-1, 2), (0, 1), (1, 1), (2, 0.5)$. Compute the sum of the least-squares estimators for the parameters $\beta_0, \beta_1$ in the model $Y = \beta_0 + \beta_1 x + \epsilon$, where $\mathbb{E}[\epsilon] = 0$.

### Hint

Recall $\hat{\beta}_0 = \bar{y} - \hat{\beta}_1 \bar{x}$, and $\hat{\beta}_1 = \frac{S_{xy}}{S_{xx}}$, where $S_{xy} = \sum_{i = 1}^n (x_i - \bar{x})(y_i - \bar{y})$ and $S_{xx} = \sum_{i = 1}^n (x_i - \bar{x})^2$. 

### 解答

Recall $\hat{\beta}_0 = \bar{y} - \hat{\beta}_1 \bar{x}$, and $\hat{\beta}_1 = \frac{S_{xy}}{S_{xx}}$, where $S_{xy} = \sum_{i = 1}^n (x_i - \bar{x})(y_i - \bar{y})$ and $S_{xx} = \sum_{i = 1}^n (x_i - \bar{x})^2$. We find $\bar{x} = 0, \bar{y} = 1.5$. Plugging in values, we find:
\[
\begin{aligned}
    S_{xy} &= -6, \\
    S_{xx} &= 10, \\
    \hat{\beta}_1 &= -0.6, \\
    \hat{\beta}_0 &= 1.5
\end{aligned}
\]
We conclude $\mathbb{E}[Y] = \hat{y} = 1.5 - 0.6x$, so our answer is $1.5 - 0.6 = 0.9$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0.9"
    ],
    "companies": [
      {
        "company": "Squarepoint Capital"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "xt0JtsFIhFpCWxDAU5CH",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-4 23:59:21 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6927859,
    "source": "Wackerly 11.3",
    "status": "published",
    "tags": [
      {
        "tag": "Linear Regression"
      }
    ],
    "title": "OLS Review I",
    "topic": "statistics",
    "urlEnding": "ols-review-i",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "Squarepoint Capital"
      }
    ],
    "difficulty": "easy",
    "id": "xt0JtsFIhFpCWxDAU5CH",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Linear Regression"
      }
    ],
    "title": "OLS Review I",
    "topic": "statistics",
    "urlEnding": "ols-review-i"
  }
}
```
