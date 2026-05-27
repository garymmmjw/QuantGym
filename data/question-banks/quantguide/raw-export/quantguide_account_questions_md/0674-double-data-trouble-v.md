# QuantGuide Question

## 674. Double Data Trouble V

**Metadata**

- ID: `IXSJSbtTig3AFt1iC66U`
- URL: https://www.quantguide.io/questions/double-data-trouble-v
- Topic: statistics
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Two Sigma, Squarepoint Capital
- Source: N/A
- Tags: Linear Regression
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-5 00:03:17 America/New_York
- Last Edited By: Gabe

### 题干

Suppose that you run linear regression on some dataset and obtain the coefficients $\hat{\beta}_{OLS}$. Recall that if $X$ is the data and $\sigma^2$ is the variance of the IID normal errors, then $\text{Var}\left(\hat{\beta}_{OLS}\right) = \sigma^2(X^TX)^{-1}$. If you were to run linear regression again on the dataset where you double the values of each point in your original dataset and obtain new coefficients $\hat{\beta}_{OLS}'$, find the constant $c$ such that $\text{Var}\left(\hat{\beta}_{OLS}'\right) = c\text{Var}\left(\hat{\beta}_{OLS}\right)$. If no such constant exists, enter $-1$.

### Hint

When we double the data, we are just replacing the matrix $X$ with the matrix $X' = 2X$. Accordingly, $X'^TX' = 4X^TX$ by simple matrix multiplication. What happens to $\sigma$?

### 解答

When we double the data, we are just replacing the matrix $X$ with the matrix $X' = 2X$. However, we also have to replace $\sigma$ with $2\sigma$. Accordingly, $X'^TX' = 4X^TX$ by simple matrix multiplication. Then Therefore, $(2\sigma)^2 (4X^T X)^{-1} = \dfrac{1}4 \cdot {4} \cdot \sigma^2 (X^TX)^{-1} = \sigma^2 (X^TX)^{-1}$, which proves our statement.

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
    "id": "IXSJSbtTig3AFt1iC66U",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 00:03:17 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5433586,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Linear Regression"
      }
    ],
    "title": "Double Data Trouble V",
    "topic": "statistics",
    "urlEnding": "double-data-trouble-v",
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
    "id": "IXSJSbtTig3AFt1iC66U",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Linear Regression"
      }
    ],
    "title": "Double Data Trouble V",
    "topic": "statistics",
    "urlEnding": "double-data-trouble-v"
  }
}
```
