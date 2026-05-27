# QuantGuide Question

## 1048. R-Squared Range

**Metadata**

- ID: `Fme6HWBaQQcWj7GyRJjN`
- URL: https://www.quantguide.io/questions/rsquared-range
- Topic: statistics
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Two Sigma
- Source: Common Stat Brainteaser
- Tags: Linear Regression
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-10-17 12:53:01 America/New_York
- Last Edited By: Gabe

### 题干

Using OLS, we regress $y$ onto $X_1$ and find that the model has an $R^2$ of 0.15.  We also regress $y$ onto $X_2$ but this time the model has an $R^2$ of 0.2. Let $[\text{min}, \text{max}]$ denote the lower and upper-bound of the $R^2$ of a model which regresses $y$ onto $X_1, X_2$. Express your answer as $\frac{\text{max}}{\text{min}}$. 

### Hint

Can adding a variable to a regression ever decrease $R^2$?

### 解答

We start with a basic fact of OLS that an additional predictive variable can never decrease $R^2$ (as OLS can always set the coefficient to a predictor to be 0!)
Therefore, our lower bound is the max of individual $R^2$ values meaning $\text{min} = 0.2$. 
As an upper bound, we could have that $y = X_1 + X_2$ meaning $\text{max} = 1.0$. Note that this does not restrict our freedom of picking $X_1$ and $X_2$ so that their individual $R^2$ are 0.15 and 0.2. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "5"
    ],
    "companies": [
      {
        "company": "Two Sigma"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "Fme6HWBaQQcWj7GyRJjN",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-17 12:53:01 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8526958,
    "source": "Common Stat Brainteaser",
    "status": "published",
    "tags": [
      {
        "tag": "Linear Regression"
      }
    ],
    "title": "R-Squared Range",
    "topic": "statistics",
    "urlEnding": "rsquared-range",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Two Sigma"
      }
    ],
    "difficulty": "medium",
    "id": "Fme6HWBaQQcWj7GyRJjN",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Linear Regression"
      }
    ],
    "title": "R-Squared Range",
    "topic": "statistics",
    "urlEnding": "rsquared-range"
  }
}
```
