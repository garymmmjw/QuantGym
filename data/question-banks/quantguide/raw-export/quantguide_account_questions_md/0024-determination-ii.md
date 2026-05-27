# QuantGuide Question

## 24. Determination II

**Metadata**

- ID: `U8TzETYi3O5ROkXBUfOp`
- URL: https://www.quantguide.io/questions/determination-ii
- Topic: statistics
- Difficulty: hard
- Internal Difficulty: 3
- Companies: DE Shaw, Squarepoint Capital, Two Sigma
- Source: desco 2nd round
- Tags: Linear Regression
- Premium: True
- Solution Free: False
- Version: 6
- Last Edited: 2023-11-5 00:01:54 America/New_York
- Last Edited By: Gabe

### 题干

Given three data sets $X_1, X_2,$ and $Y$ , we run two linear regressions to obtain $y \sim \alpha_1 + \beta_1 x_1$ and $y \sim \alpha_2 + \beta_2 x_2$. The $R^2$ value for both regressions is $0.05$. Find the lowest upper bound on $R^2$ value of the regression $y \sim \alpha + \beta' x_1 + \beta'' x_2$.


### Hint

Consider the dataset $Y$ that is sampled perfectly from a parabola far from the origin.

### 解答

Consider the dataset $Y$ that is sampled perfectly from a parabola far from the origin. Let $X_2$ be the dataset where each value of $X_1$ is squared. If $Y$ is far enough from the origin, $y \sim \alpha_1 + \beta_1 x_1$ has low $R^2$ since it is linear, while $Y$ is quadratic. Furthermore, $y \sim \alpha_2 + \beta_2 x_2 = \alpha_2 + \beta_2 x_1^2$ is also low $R^2$ because although it is a parabola, it is not able to be shifted around horzontally to match $Y$. Therefore, individually, these linear regressions have low $R^2$. However, the model $y \sim \alpha + \beta' x_1 + \beta'' x_2$ has $R^2 = 1$, as you can now shift the parabola around in the plane to perfectly match the non-noisy dataset $Y$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1",
      "100"
    ],
    "companies": [
      {
        "company": "DE Shaw"
      },
      {
        "company": "Squarepoint Capital"
      },
      {
        "company": "Two Sigma"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "U8TzETYi3O5ROkXBUfOp",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 00:01:54 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 183219,
    "source": "desco 2nd round",
    "status": "published",
    "tags": [
      {
        "tag": "Linear Regression"
      }
    ],
    "title": "Determination II",
    "topic": "statistics",
    "urlEnding": "determination-ii",
    "version": 6
  },
  "list_summary": {
    "companies": [
      {
        "company": "DE Shaw"
      },
      {
        "company": "Squarepoint Capital"
      },
      {
        "company": "Two Sigma"
      }
    ],
    "difficulty": "hard",
    "id": "U8TzETYi3O5ROkXBUfOp",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Linear Regression"
      }
    ],
    "title": "Determination II",
    "topic": "statistics",
    "urlEnding": "determination-ii"
  }
}
```
