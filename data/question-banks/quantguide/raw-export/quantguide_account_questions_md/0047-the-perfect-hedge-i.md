# QuantGuide Question

## 47. The Perfect Hedge I 

**Metadata**

- ID: `4y0LHEIP04hcWDCrWPzF`
- URL: https://www.quantguide.io/questions/the-perfect-hedge-i-
- Topic: finance
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-26 17:53:31 America/New_York
- Last Edited By: Gabe

### 题干

You have two assets. We will call them asset $1$ and asset $2$. Asset $1$ has an expected return of $4\%$ and a variance of $15\%$. Asset $2$ has an expected return of $2\%$ and a variance of $4\%$. They have a correlation $\rho = -1$. 

$$\\$$

We want to create a risk-free portfolio using assets $1$ and $2$. We will denote $w_1$ and $w_2$ as the weights of asset $1$ and $2$ in the portfolio respectively. Assume that $w_1 + w_2 = 1$. What is $w_1$? Give the answer to $2$ decimal points. 



### Hint

Construct a portfolio of asset $1$ with $w_1 = w$ and asset $2$ with $w_2 = 1 - w$. What is the variance of $w X_1 + (1 - w)X_2$, where $X_1$ and $X_2$ are assets $1$ and $2$ respectively?

### 解答

Let's denote $w_1 = w$ and $w_2 = 1 - w$. In a $2$ asset world, we can write the variance of a portfolio as: $\sigma^2 = w^2 \sigma_1^2 + 2w(1-w)\rho\sigma_1\sigma_2 + (1 - w)^2 \sigma_2^2$. For a risk-less portfolio, we require $\sigma = 0$. Plugging in $\rho = -1$ and solving for $w_1 = w$. We obtain:

$$w = \frac{\sigma_2}{\sigma_1 + \sigma_2}$$

This gives us $w = \frac{\sqrt{.04}}{\sqrt{.15} + \sqrt{.04}} \approx 0.34$.

We see that the expected returns do not matter. We can obtain a riskless portfolio from two assets if they have a correlation of $-1$ and weight them using the above manner. This rarely happens in real life. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      ".34"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "4y0LHEIP04hcWDCrWPzF",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-26 17:53:31 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 334482,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "The Perfect Hedge I ",
    "topic": "finance",
    "urlEnding": "the-perfect-hedge-i-",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "4y0LHEIP04hcWDCrWPzF",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "The Perfect Hedge I ",
    "topic": "finance",
    "urlEnding": "the-perfect-hedge-i-"
  }
}
```
