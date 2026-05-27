# QuantGuide Question

## 263. Double Data Trouble IV

**Metadata**

- ID: `5PEEs5XZisLxyllXvWSR`
- URL: https://www.quantguide.io/questions/double-data-trouble-iv
- Topic: statistics
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Two Sigma, Squarepoint Capital
- Source: N/A
- Tags: Linear Regression
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-10 10:10:30 America/New_York
- Last Edited By: Gabe

### 题干

Suppose that you run linear regression on some dataset and obtain an $R^2$ value of $0.48$. If you were to run linear regression again on the dataset where you double all of the values of each point in the dataset $($for example, if $(2,5)$ were in the original dataset, it would now be $(4,10)$$)$, what would $R^2$ be? If it can't be determined, enter $-1$.

### Hint

Recall that $R^2 = 1 - \dfrac{SSE}{SST}$. How does SSE change, and how does SST change?

### 解答

Recall that $R^2 = 1 - \dfrac{SSE}{SST}$. With each of the data points doubled, the new SSE is $4$ times as large as it was before. This is because we are summing squared errors and we have doubled each of the points. Therefore, the errors (in magnitude) are doubled. Once we square these, the SSE would then be $4$ times as large. For this same reason, $SST$ also is quadrupled. Accordingly, the ratio $\dfrac{SSE}{SST}$ is unchanged, meaning that $R^2$ is unchanged from before.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0.48"
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
    "id": "5PEEs5XZisLxyllXvWSR",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-10 10:10:30 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2046472,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Linear Regression"
      }
    ],
    "title": "Double Data Trouble IV",
    "topic": "statistics",
    "urlEnding": "double-data-trouble-iv",
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
    "id": "5PEEs5XZisLxyllXvWSR",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Linear Regression"
      }
    ],
    "title": "Double Data Trouble IV",
    "topic": "statistics",
    "urlEnding": "double-data-trouble-iv"
  }
}
```
