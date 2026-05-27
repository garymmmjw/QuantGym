# QuantGuide Question

## 122. Double Data Trouble II

**Metadata**

- ID: `fZm7hMimdAHLNsNc5Xyi`
- URL: https://www.quantguide.io/questions/double-data-trouble-ii
- Topic: statistics
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Two Sigma, Squarepoint Capital
- Source: N/A
- Tags: Linear Regression
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-5 00:03:05 America/New_York
- Last Edited By: Gabe

### 题干

Suppose that you run linear regression on some dataset and obtain the coefficients $\hat{\beta}_{OLS}$. Recall that if $X$ is the data and $\sigma^2$ is the variance of the IID normal errors, then $\text{Var}\left(\hat{\beta}_{OLS}\right) = \sigma^2(X^TX)^{-1}$. If you were to run linear regression again on the dataset where you duplicate each point in your original dataset and obtain new coefficients $\hat{\beta}_{OLS}'$, find the constant $c$ such that $\text{Var}\left(\hat{\beta}_{OLS}'\right) = c\text{Var}\left(\hat{\beta}_{OLS}\right)$. If no such constant exists, enter $-1$.

### Hint

When we duplicate the data, we are just replacing the matrix $X$ with the matrix $X' = \begin{bmatrix}
    X \\
    X
\end{bmatrix}$, so $X'^TX' = 2X^TX$.

### 解答

When we duplicate the data, we are just replacing the matrix $X$ with the matrix $X' = \begin{bmatrix}
    X \\
    X
\end{bmatrix}$, so $X'^TX' = 2X^TX$. Therefore, $\sigma ^2 (2X^T X)^{-1} = \dfrac{1}{2} \cdot \sigma^2 (X^TX)^{-1}$, which proves our statement.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/2"
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
    "id": "fZm7hMimdAHLNsNc5Xyi",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 00:03:05 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 853256,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Linear Regression"
      }
    ],
    "title": "Double Data Trouble II",
    "topic": "statistics",
    "urlEnding": "double-data-trouble-ii",
    "version": 1
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
    "id": "fZm7hMimdAHLNsNc5Xyi",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Linear Regression"
      }
    ],
    "title": "Double Data Trouble II",
    "topic": "statistics",
    "urlEnding": "double-data-trouble-ii"
  }
}
```
