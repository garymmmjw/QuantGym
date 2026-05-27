# QuantGuide Question

## 778. Significant Others

**Metadata**

- ID: `vF5KUcsUGeViqq2lBR9x`
- URL: https://www.quantguide.io/questions/significant-others
- Topic: statistics
- Difficulty: hard
- Internal Difficulty: N/A
- Companies: N/A
- Source: N/A
- Tags: Linear Regression
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Suppose that we have a set of data $\{(x_1,y_1),\dots, (x_n,y_n)\}$, where both $x_i$ and $y_i$ are real-valued and mean $0$. We fit a linear regression line without intercept to regress $y$ onto $x$. This yields a line $y = \hat{\beta}_0 x + \varepsilon$, $\varepsilon$ being an error term. Given that Corr$(X,Y) = \dfrac{1}{10\sqrt{3}}$, find the smallest value of $n$ so that the results of the hypothesis test $H_0: \beta_0 = 0$ vs. $H_A: \beta_0 > 0$ are significant at the $95\%$ level. You may use the fact that the $95$ and $97.5$ percentile values are approximately $1.645$ and $1.96$.

### Hint

Recall that under the null hypothesis, the distribution of the $t-$statistic is $t_{n-1}$, where $t = \dfrac{\hat{\beta}_0}{s\left\{\hat{\beta}_0\right\}}$. The variance of $\hat{\beta}_0$ is Var$(\hat{\beta}_0) = \dfrac{\sigma^2}{\sum x_i^2}$ since $x_i$ are assumed to have mean $0$. $\sigma^2$ is the variance of the error term $\varepsilon$. 

### 解答

Recall that under the null hypothesis, the distribution of the $t-$statistic is $t_{n-1}$, where $t = \dfrac{\hat{\beta}_0}{s\left\{\hat{\beta}_0\right\}}$. The variance of $\hat{\beta}_0$ is Var$(\hat{\beta}_0) = \dfrac{\sigma^2}{\sum x_i^2}$ since $x_i$ are assumed to have mean $0$. $\sigma^2$ is the variance of the error term $\varepsilon$. 

$$$$

The common estimator for $\sigma^2$ is $s^2$, our sample variance, given by $s^2\left\{\hat{\beta}_0\right\} = \dfrac{1}{n-1} \displaystyle \sum \left(y_i - \hat{\beta}_0 x_i\right)^2 = \dfrac{SSR}{n-1}$. In simple linear regression, we have that $SSR = (1 - \rho^2) \dislaystyle \sum y_i^2$ (again since $y_i$ data is mean $0$). Lastly, as usual with OLS, we know that $\hat{\beta}_0 = \dfrac{\text{Cov}(X,Y)}{\text{Var}(X)} = \rho \cdot \dfrac{\sigma_Y}{\sigma_X}$. Once again, we estimate $\sigma_X$ and $\sigma_Y$ by $s_x = \sqrt{\displaystyle \dfrac{1}{n-1} \sum x_i^2}$ and $s_y = \sqrt{\displaystyle \dfrac{1}{n-1} \sum y_i^2}$. When we take the ratio, the coefficients out front cancel. 

$$$$

Plugging this all back in to our $t-$statistic, $t = \rho \cdot \dfrac{\sqrt{\sum y_i^2}}{\sqrt{\sum x_i^2}} \cdot \dfrac{1}{\sqrt{\text{Var}(\hat{\beta}_0)}} = \rho \cdot \dfrac{\sqrt{\sum y_i^2}}{\sqrt{\sum x_i^2}} \cdot \dfrac{\sqrt{\sum x_i^2}}{\sqrt{(1-\rho^2)\sum y_i^2}}\sqrt{n-1} = \dfrac{\rho}{\sqrt{1-\rho^2}}\sqrt{n-1}$.

$$$$

Plugging in $\rho = \dfrac{1}{10\sqrt{3}}$, we get that the $t-$statistic is $t_n = \sqrt{\dfrac{n-1}{299}}$. Therefore, we must find the smallest $n$ such that $t_n > 1.645$. We use the $95$th percentile value because we are doing a one-sided test. Solving this yields $n \geq 299 \cdot (1.645)^2 + 1 = 810.1$. Since $n$ must be an integer, $n = 811$ would the smallest value.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "811"
    ],
    "difficulty": "hard",
    "id": "vF5KUcsUGeViqq2lBR9x",
    "internalDifficulty": 0,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 6337207,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Linear Regression"
      }
    ],
    "title": "Significant Others",
    "topic": "statistics",
    "urlEnding": "significant-others"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "hard",
    "id": "vF5KUcsUGeViqq2lBR9x",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Linear Regression"
      }
    ],
    "title": "Significant Others",
    "topic": "statistics",
    "urlEnding": "significant-others"
  }
}
```
