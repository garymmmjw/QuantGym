# QuantGuide Question

## 359. Determination I

**Metadata**

- ID: `zbjiX6iH1K3SfdoxTEJ0`
- URL: https://www.quantguide.io/questions/determination-i
- Topic: statistics
- Difficulty: easy
- Internal Difficulty: 1
- Companies: DE Shaw, Squarepoint Capital, Two Sigma
- Source: desco 2nd round
- Tags: Linear Regression
- Premium: True
- Solution Free: False
- Version: 6
- Last Edited: 2023-11-5 00:01:52 America/New_York
- Last Edited By: Gabe

### 题干

Given three data sets $X_1, X_2,$ and $Y$ , we run two linear regressions to obtain $y \sim \alpha_1 + \beta_1 x_1$ and $y \sim \alpha_2 + \beta_2 x_2$. The $R^2$ value for both regressions is $0.05$. Find the greatest lower bound on $R^2$ value of the regression $y \sim \alpha + \beta' x_1 + \beta'' x_2$.


### Hint

We can interpret $R^2$ as the proportion of total variability in $Y$ captured by the model on the RHS. Think about what including more information does to $R^2$.

### 解答

We can interpret $R^2$ as the proportion of total variability in $Y$ captured by the model on the RHS. As the total variability in $Y$ is constant and including in more factors includes the information about variability captured by each of the factors, we know that the new $R^2$ must be at least $0.05$. We can show $0.05$ is attainable by letting $X_2 = X_1$ in an edge case. In that case, the information captured by the new regression is precisely the same as the old regression. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0.05",
      "5"
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
    "difficulty": "easy",
    "hasEdits": false,
    "id": "zbjiX6iH1K3SfdoxTEJ0",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 00:01:52 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2744143,
    "source": "desco 2nd round",
    "status": "published",
    "tags": [
      {
        "tag": "Linear Regression"
      }
    ],
    "title": "Determination I",
    "topic": "statistics",
    "urlEnding": "determination-i",
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
    "difficulty": "easy",
    "id": "zbjiX6iH1K3SfdoxTEJ0",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Linear Regression"
      }
    ],
    "title": "Determination I",
    "topic": "statistics",
    "urlEnding": "determination-i"
  }
}
```
