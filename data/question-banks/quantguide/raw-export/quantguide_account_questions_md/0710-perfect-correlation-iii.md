# QuantGuide Question

## 710. Perfect Correlation III

**Metadata**

- ID: `BNDXZ06uuNgCpgs2CsqA`
- URL: https://www.quantguide.io/questions/perfect-correlation-iii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: TransMarket Group, Five Rings
- Source: tmg
- Tags: Covariance
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-10 11:23:26 America/New_York
- Last Edited By: Gabe

### 题干

Suppose that $X$ and $Y$ are perfectly negatively correlated i.e. $\rho(X,Y) = -1$ with $\sigma_Y > \sigma_X$. Find the correlation of $X+Y$ and $X-Y$.

### Hint

Suppose that $X$ and $Y$ have respective variances $\sigma_X^2$ and $\sigma_Y^2$. Compute $\text{Cov}(X+Y,X-Y)$ and their respective variances using the common formulae.

### 解答

Suppose that $X$ and $Y$ have respective variances $\sigma_X^2$ and $\sigma_Y^2$. Then $\text{Cov}(X+Y,X-Y) = \text{Cov}(X,X) - \text{Cov}(Y,Y) = \sigma_X^2 - \sigma_Y^2$. Similarly, we know that $\text{Var}(X+Y) = \sigma_X^2 + \sigma_Y^2 - 2\sigma_X\sigma_Y = (\sigma_X - \sigma_Y)^2$, so $\sigma_{X+Y} = |\sigma_X - \sigma_Y|$. Note that the absolute values are needed here since we can't have a negative variance. By a similar argument, we get $\text{Var}(X-Y) = \sigma_X^2 + \sigma_Y^2 + 2\sigma_X\sigma_Y = (\sigma_X + \sigma_Y)^2$, so $\text{Var}(X-Y) = \sigma_X + \sigma_Y$. 

$$$$

Therefore, we have that $\rho(X+Y,X-Y) = \dfrac{\sigma_X^2 - \sigma_Y^2}{(\sigma_X+\sigma_Y)|\sigma_X - \sigma_Y|} = \dfrac{\sigma_X - \sigma_Y}{|\sigma_X - \sigma_Y|} = -1$. We get the $-1$ from the condition that $\sigma_Y > \sigma_X$, so the numerator is negative.

$$$$

Another way to see this is that if $X$ and $Y$ are perfectly correlated, then $Y = aX + b$ for some constants $a$ and $b$. Since $\sigma_Y > \sigma_X$, it must be the case that $|a| > 1$. Therefore, $X+Y = X(1+a) + b$ and $X-Y = X(1-a) + b$. As $|a| > 1$, one of the constants between $1+a$ and $1-a$ is positive and one is negative. Therefore, as these are both linear transformation of $X$ with opposing signs, they must have correlation $-1$. Note that this argument does not depend at all on whether or not the correlation of $X$ and $Y$ is $-1$ or $1$.


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "-1"
    ],
    "companies": [
      {
        "company": "TransMarket Group"
      },
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "BNDXZ06uuNgCpgs2CsqA",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-10 11:23:26 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5799184,
    "source": "tmg",
    "status": "published",
    "tags": [
      {
        "tag": "Covariance"
      }
    ],
    "title": "Perfect Correlation III",
    "topic": "probability",
    "urlEnding": "perfect-correlation-iii",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "TransMarket Group"
      },
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "medium",
    "id": "BNDXZ06uuNgCpgs2CsqA",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Covariance"
      }
    ],
    "title": "Perfect Correlation III",
    "topic": "probability",
    "urlEnding": "perfect-correlation-iii"
  }
}
```
