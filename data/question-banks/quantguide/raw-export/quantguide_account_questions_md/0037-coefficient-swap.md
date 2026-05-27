# QuantGuide Question

## 37. Coefficient Swap

**Metadata**

- ID: `GTrb7RvFiYvXahkz2zOb`
- URL: https://www.quantguide.io/questions/coefficient-swap
- Topic: statistics
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Five Rings, Tower Research Capital
- Source: common q
- Tags: Linear Regression
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-17 07:53:26 America/New_York
- Last Edited By: Gabe

### 题干

Suppose that we have two datasets $X$ and $Y$ with $\text{Var}(X) = 10$ and $\text{Var}(Y) = 20$. We perform the linear regression $y \sim \alpha_x + \beta_x x$ and obtain $\beta_x = 1$. Suppose now that we perform the regression $x \sim \alpha_y + \beta_y y$. Find $\beta_y$. If the value can't be determined, enter $-100$. 

### Hint

Let $\rho$ be the Pearson Correlation Coefficient of $X$ and $Y$. Then $\beta_x = r \dfrac{\sigma_y}{\sigma_x}$ and $\beta_y = r \dfrac{\sigma_x}{\sigma_y}$.

### 解答

Let $r$ be the Pearson Correlation Coefficient of $X$ and $Y$. Then $\beta_x = r \dfrac{\sigma_y}{\sigma_x}$ and $\beta_y = r \dfrac{\sigma_x}{\sigma_y}$. Therefore, $$\dfrac{\beta_y}{\beta_x} = \dfrac{\sigma_x^2}{\sigma_y^2} \iff \beta_y = \beta_x \dfrac{\sigma_x^2}{\sigma_y^2} = 1 \cdot \dfrac{10}{20} = \dfrac{1}{2}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/2"
    ],
    "companies": [
      {
        "company": "Five Rings"
      },
      {
        "company": "Tower Research Capital"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "GTrb7RvFiYvXahkz2zOb",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-17 07:53:26 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 268400,
    "source": "common q",
    "status": "published",
    "tags": [
      {
        "tag": "Linear Regression"
      }
    ],
    "title": "Coefficient Swap",
    "topic": "statistics",
    "urlEnding": "coefficient-swap",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Five Rings"
      },
      {
        "company": "Tower Research Capital"
      }
    ],
    "difficulty": "medium",
    "id": "GTrb7RvFiYvXahkz2zOb",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Linear Regression"
      }
    ],
    "title": "Coefficient Swap",
    "topic": "statistics",
    "urlEnding": "coefficient-swap"
  }
}
```
