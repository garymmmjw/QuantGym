# QuantGuide Question

## 790. Double Data Trouble I

**Metadata**

- ID: `Uo7ft1BCH1vFkNA9JINz`
- URL: https://www.quantguide.io/questions/double-data-trouble-i
- Topic: statistics
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Two Sigma, Squarepoint Capital
- Source: N/A
- Tags: Linear Regression
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-5 00:02:57 America/New_York
- Last Edited By: Gabe

### 题干

Suppose that you run OLS regression on some dataset and obtain an $R^2$ value of $0.56$. If you were to run linear regression again on the dataset where you duplicate each point in your original dataset, what would $R^2$ be? If it cannot be determined, enter $-1$.

### Hint

Recall that $R^2 = 1 - \dfrac{SSE}{SST}$. How much does SSE change by, and how much does SST change by?

### 解答

Recall that $R^2 = 1 - \dfrac{SSE}{SST}$. With twice the data that is identical to the original, the new $SSE$ is exactly twice what it was before, as we have duplicated every data point and the mean is unchanged. For this same reason, $SST$ also doubles. Therefore, the ratio $\dfrac{SSE}{SST}$ is unchanged, meaning that $R^2$ is unchanged from before.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0.56"
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
    "id": "Uo7ft1BCH1vFkNA9JINz",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 00:02:57 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6439710,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Linear Regression"
      }
    ],
    "title": "Double Data Trouble I",
    "topic": "statistics",
    "urlEnding": "double-data-trouble-i",
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
    "id": "Uo7ft1BCH1vFkNA9JINz",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Linear Regression"
      }
    ],
    "title": "Double Data Trouble I",
    "topic": "statistics",
    "urlEnding": "double-data-trouble-i"
  }
}
```
