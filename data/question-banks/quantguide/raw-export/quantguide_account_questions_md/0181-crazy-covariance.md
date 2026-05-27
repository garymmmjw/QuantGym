# QuantGuide Question

## 181. Crazy Covariance

**Metadata**

- ID: `oir7oBVoACjA1OwErUOi`
- URL: https://www.quantguide.io/questions/crazy-covariance
- Topic: statistics
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: N/A
- Tags: Conditional Expectation, Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 13:14:04 America/New_York
- Last Edited By: Gabe

### 题干

Let $X \sim \text{Exp}(1)$ and $Y \mid X = x \sim \text{LogNorm}(0,x)$. Find Cov$(X,Y)$. Note that we say a random variable $R \sim \text{LogNorm}(\mu,\sigma^2)$ if $\log(R) \sim N(\mu,\sigma^2)$.

### Hint

Cov$(X,Y) = \mathbb{E}[XY] - \mathbb{E}[X]\mathbb{E}[Y]$. Use LOTUS to compute this afterwards.

### 解答

By definition, we know that Cov$(X,Y) = \mathbb{E}[XY] - \mathbb{E}[X]\mathbb{E}[Y]$. We only know the distribution of $Y \mid X = x$. Therefore, we will need to apply LOTUS on any terms involving $Y$. 

$$$$

Starting with $\mathbb{E}[Y]$, $\mathbb{E}[Y] = \mathbb{E}[\mathbb{E}[Y \mid X]]$. One can show from the definition of the lognormal distribution that for $R \sim \text{LogNorm}(\mu,\sigma^2)$, $\mathbb{E}[R] = e^{\mu + \frac{1}{2}\sigma^2}$. In this case, $\mu = 0$ and $\sigma^2 = X$. Therefore, $\mathbb{E}[Y \mid X] = e^{\frac{X}{2}}$. This implies that $\mathbb{E}[Y] = \mathbb{E}\left[e^{\frac{X}{2}}\right]$. This is just the MGF of $X$ evaluated at $\theta = \dfrac{1}{2}$. As we know $X \sim \text{Exp}(1)$, the MGF of $X$ is $M_X(\theta) = \dfrac{1}{1-\theta}$. Plugging in $\theta = \dfrac{1}{2}$ yields $\mathbb{E}[Y] = 2$. We already know $\mathbb{E}[X] = 1$ by the known properties of exponential distributions.

$$$$

To calculate $\mathbb{E}[XY]$, we need to apply LOTUS once again. Thus, $$\mathbb{E}[XY] = \mathbb{E}[\mathbb{E}[XY \mid X]] = \mathbb{E}[X\mathbb{E}[Y \mid X]] = \mathbb{E}\left[Xe^{\frac{X}{2}}\right]$$ The last expression above is just the first derivative of the MGF of $X$ evaluated at $\theta = \dfrac{1}{2}$. Taking the derivative of the MGF of $X$, we get $M_X'(\theta) = \dfrac{1}{(1-\theta)^2}$. Letting $\theta = \dfrac{1}{2}$ yields $\mathbb{E}[XY] = 4$. This means Cov$(X,Y) = 4 - 2 \cdot 1 = 2$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2"
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "oir7oBVoACjA1OwErUOi",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 13:14:04 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1420025,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Crazy Covariance",
    "topic": "statistics",
    "urlEnding": "crazy-covariance"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "oir7oBVoACjA1OwErUOi",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Crazy Covariance",
    "topic": "statistics",
    "urlEnding": "crazy-covariance"
  }
}
```
