# QuantGuide Question

## 462. Minimum Variance Portfolio

**Metadata**

- ID: `Y4X25CHcbKlEmNl8clGT`
- URL: https://www.quantguide.io/questions/minimum-variance-portfolio
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: greenbook
- Tags: Expected Value
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-13 15:12:36 America/New_York
- Last Edited By: Gabe

### 题干

Suppose you purchase a $1$ share of stock $A$. A share of stock $A$ has mean return $2$ and return variation $4$. You also want to purchase stock $B$. $1$ share of $B$ has mean return $3$ and return variation $9$. Additionally, the returns of $A$ and $B$ are correlated with coefficient $-1/2$. How many shares of stock $B$ should you purchase so that the variance of your portfolio consisting of both $A$ and $B$ is minimum?

### Hint

Let $R_A$ and $R_B$ be the returns of stock $A$ and $B$, respectively. We have that if you purchase $k$ shares of stock $B$, then the return of your portfolio is given by $R_A + kR_B$. Minimize the variance of this as a function of $k$.

### 解答

We are going to solve this with more general values the means and variances. 

$$$$

Let $R_A$ and $R_B$ be the returns of stock $A$ and $B$, respectively. We have that if you purchase $k$ shares of stock $B$, then the return of your portfolio is given by $R_A + kR_B$. We have that $$\text{Var}(R_A + kR_B) = \text{Var}(R_A) + \text{Var}(kR_B) + 2\text{Cov}(R_A,kR_B)$$ By properties of variance and covariance, the previous expression is equal to $\sigma_A^2 + k^2\sigma_B^2 + 2k\text{Cov}(R_A,R_B)$. 

$$$$

From the definition of correlation, $\text{Cov}(R_A,R_B) = \rho\sigma_A\sigma_B$. Thus, we have that the variance (as a function of $k$) is $k^2\sigma_B^2 + 2\rho\sigma_A\sigma_b k + \sigma_A^2$. Note that this is a quadratic function in $k$, so to find the minimum $k$, we need to just use the handy formula $-\dfrac{b}{2a}$ to find the minimum. This means that $k = -\dfrac{2\rho\sigma_A\sigma_B}{2\sigma_B^2} = -\rho \dfrac{\sigma_A}{\sigma_B}$ is our minimum. Note that if $\rho > 0$, then this implies we should short $B$.

$$$$

Plugging in our specific values of $\sigma_A = 2, \sigma_B = 3,$ and $\rho = -1/2$, we get that $k = \dfrac{1}{2} \cdot \dfrac{2}{3} = \dfrac{1}{3}$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/3"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "Y4X25CHcbKlEmNl8clGT",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-13 15:12:36 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3702002,
    "source": "greenbook",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Minimum Variance Portfolio",
    "topic": "probability",
    "urlEnding": "minimum-variance-portfolio",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "Y4X25CHcbKlEmNl8clGT",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Minimum Variance Portfolio",
    "topic": "probability",
    "urlEnding": "minimum-variance-portfolio"
  }
}
```
