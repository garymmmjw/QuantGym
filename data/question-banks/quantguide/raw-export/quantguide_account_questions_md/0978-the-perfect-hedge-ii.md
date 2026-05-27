# QuantGuide Question

## 978. The Perfect Hedge II

**Metadata**

- ID: `LYsESxwVXerJJ9FW4pRt`
- URL: https://www.quantguide.io/questions/the-perfect-hedge-ii
- Topic: finance
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-27 09:40:09 America/New_York
- Last Edited By: Gabe

### 题干

You have two assets. We will call them asset $1$ and asset $2$. Asset $1$ has an expected return of $4\%$ and a variance of $15\%$. Asset $2$ has an expected return of $2\%$ and a variance of $4\%$. They have a correlation $\rho = -1$. 

$$\\$$

We want to create a risk-free portfolio using assets $1$ and $2$. We will denote $w_1$ and $w_2$ as the weights of asset $1$ and $2$ in the portfolio respectively. What is the expected return of this portfolio? Round the answer to three significant figures. 

### Hint

What is the weighting needed to achieve a perfect hedge when we have a correlation of $\rho = -1$? What is the expected return of the portfolio? 

### 解答

From The Perfect Hedge I, we know that the weight of asset $1$ to achieve a riskless portfolio is $\frac{\sigma_2}{\sigma_1 + \sigma_2}$. Denote $\mu$ as the expected return of the portfolio, and $\mu_1$ as the return of asset 1 and $\mu_2$ as the return of asset 2. We can then write the expected return of the portfolio as:

$$\mu = w \mu_1 + (1 - w) \mu_2$$ 

Plugging in the value of $w$ from above, we get:

$$\begin{align*}
\mu &= \frac{\sigma_2}{\sigma_1 + \sigma_2} \mu_1 + \frac{\sigma_1}{\sigma_1 + \sigma_2}\mu_2 = \frac{1}{\sigma_1 + \sigma_2}(\mu_1 \sigma_2 + \mu_2 \sigma_1) \\ 
&= \frac{1}{\sqrt{.15}+\sqrt{.04}}(.04*\sqrt{.04}+.02*\sqrt{.15}) \approx .0268\end{align*}$$

This means that we can combine two risky assets to obtain a risk-free portfolio of $0.0268$. 


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      ".0268",
      "2.68",
      "2.681"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "LYsESxwVXerJJ9FW4pRt",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-27 09:40:09 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7974177,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "The Perfect Hedge II",
    "topic": "finance",
    "urlEnding": "the-perfect-hedge-ii",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "LYsESxwVXerJJ9FW4pRt",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "The Perfect Hedge II",
    "topic": "finance",
    "urlEnding": "the-perfect-hedge-ii"
  }
}
```
