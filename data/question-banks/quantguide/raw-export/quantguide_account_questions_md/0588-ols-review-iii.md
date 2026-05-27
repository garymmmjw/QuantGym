# QuantGuide Question

## 588. OLS Review III

**Metadata**

- ID: `lABUysthHKgEFzRLpRDi`
- URL: https://www.quantguide.io/questions/ols-review-iii
- Topic: statistics
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Squarepoint Capital
- Source: Wackerly example 11.3
- Tags: Linear Regression
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-4 23:59:02 America/New_York
- Last Edited By: Gabe

### 题干

Given the following data, $(x, y)$: $(-2, 0), (-1, 0), (0, 1), (1, 1), (2, 3)$, Bob does a simple linear regression modeling $Y = \beta_0 + \beta_1 x + \epsilon$, where $\mathbb{E}[\epsilon] = 0$ and $\text{Var}[\epsilon] = \sigma^2$. Estimate $\sigma^2$.

### Hint

\[\begin{aligned}
    \hat{\beta}_1 &= \frac{S_{xy}}{S_{xx}}, \\
    \hat{\beta}_0 &= \bar{y} - \hat{\beta}_1 \bar{x}.
\end{aligned}\] Use $s^2$ as an unbiased estimate for $\sigma^2$.

### 解答

It can be shown that $s^2 = \frac{\text{SSE}}{n - 2}$ is an unbiased estimator for $\sigma^2$ in the case where there are 2 $\beta$ parameters. First, let's determine the least-squares estimators for the $\beta$ parameters.
We know that 
\[\begin{aligned}
    \hat{\beta}_1 &= \frac{S_{xy}}{S_{xx}}, \\
    \hat{\beta}_0 &= \bar{y} - \hat{\beta}_1 \bar{x}.
\end{aligned}\]
For our data, we easily find $S_{xy} = \sum_{i = 1}^n (x_i - \bar{x})(y_i - \bar{y}) = 7$, and $S_{xx} = \sum_{i = 1}^n (x_i - \bar{x})^2 = 10$. Hence $\hat{\beta}_1 = \frac{7}{10}$, and $\hat{\beta}_0 = 1 - 0 = 1$.
We can now compute the sum of squared estimate of errors (SSE) with the following formula:
\[\begin{aligned}
    \text{SSE} &= S_{yy} - \hat{\beta}_1 S_{xy} \\
    &= 6 - \frac{7}{10} \cdot 7 = \frac{11}{10} \\
    \Rightarrow \frac{\text{SSE}}{n - 2} &= \frac{11/10}{5 - 2} = \frac{11}{30}
\end{aligned}\]

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "11/30"
    ],
    "companies": [
      {
        "company": "Squarepoint Capital"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "lABUysthHKgEFzRLpRDi",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-4 23:59:02 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4720785,
    "source": "Wackerly example 11.3",
    "status": "published",
    "tags": [
      {
        "tag": "Linear Regression"
      }
    ],
    "title": "OLS Review III",
    "topic": "statistics",
    "urlEnding": "ols-review-iii",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Squarepoint Capital"
      }
    ],
    "difficulty": "easy",
    "id": "lABUysthHKgEFzRLpRDi",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Linear Regression"
      }
    ],
    "title": "OLS Review III",
    "topic": "statistics",
    "urlEnding": "ols-review-iii"
  }
}
```
