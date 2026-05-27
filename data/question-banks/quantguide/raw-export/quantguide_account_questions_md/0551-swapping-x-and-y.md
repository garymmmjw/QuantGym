# QuantGuide Question

## 551. Swapping X and Y

**Metadata**

- ID: `QID5OW0ILWuRFEyBB0D0`
- URL: https://www.quantguide.io/questions/swapping-x-and-y
- Topic: statistics
- Difficulty: easy
- Internal Difficulty: 1
- Companies: DRW
- Source: N/A
- Tags: Linear Regression
- Premium: False
- Solution Free: False
- Version: 3
- Last Edited: 2023-11-4 23:14:13 America/New_York
- Last Edited By: Gabe

### 题干

Consider a simple univariate linear regression. We have the following $X$ and $Y$ values.

$$(5,5), (4,0), (6,10)$$

We regress $Y$ onto $X$ and obtain some $\beta$. Now, we regress $X$ onto $Y$. Without doing any calculation, how does $\beta$ change? Enter $1$ for increase, $0$ for stay the same, and $-1$ for decrease. 

### Hint

Consider the formula to calculate $\beta$ in a simple linear regression, regressing $Y$ onto $X$

### 解答

Consider the formula to calculate $\beta$ in a simple linear regression, regressing $Y$ onto $X$: $\beta = \frac{\text{Cov}(X,Y)}{Var(X)}$. The denominator corresponds to the variance of the independent variable. If we swap $Y$ and $X$, the denominator becomes $\text{Var}(Y)$. From looking at the data, we can see that the variance of $Y$ is larger than the variance of $X$. So, the denominator will be bigger in the case of the second regression, decreasing the value of $\beta$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "-1"
    ],
    "companies": [
      {
        "company": "DRW"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "QID5OW0ILWuRFEyBB0D0",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-4 23:14:13 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4374294,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Linear Regression"
      }
    ],
    "title": "Swapping X and Y",
    "topic": "statistics",
    "urlEnding": "swapping-x-and-y",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "DRW"
      }
    ],
    "difficulty": "easy",
    "id": "QID5OW0ILWuRFEyBB0D0",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Linear Regression"
      }
    ],
    "title": "Swapping X and Y",
    "topic": "statistics",
    "urlEnding": "swapping-x-and-y"
  }
}
```
