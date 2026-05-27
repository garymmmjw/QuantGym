# QuantGuide Question

## 1148. Skewed

**Metadata**

- ID: `7urobXDbDhlm4VvZVpUt`
- URL: https://www.quantguide.io/questions/skewed
- Topic: statistics
- Difficulty: medium
- Internal Difficulty: N/A
- Companies: N/A
- Source: N/A
- Tags: Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Suppose that $X$ is a continuous random variable with PDF $f(x) = \dfrac{\lambda}{2}e^{-\lambda |x - \mu |}$ for all some real constant $\lambda$ and $\mu > 0$. Compute the skewness of $X$ i.e. $\mathbb{E}\left[\left(\dfrac{X - \mu_X}{\sigma_X}\right)^3\right]$, where $\mu_X$ and $\sigma_X$ are the mean and standard deviation of $X$. You may assume without proof the first three moments of $X$ are finite.

### Hint

Write down the LOTUS integral for this. Do you note any symmetries?

### 解答

To compute the skewness, we must compute a seemingly complicated integral via LOTUS. We use the fact that the mean of this distribution is $\mu$, which you can clearly see is finite because of the fact that the tails are exponentially decaying and it is even about $\mu$. Therefore, the mean must be $\mu$. To compute the skewness, our integral of interest is $\mathbb{E}\left[\left(\dfrac{X-\mu}{\sigma_X}\right)^3\right] = \dfrac{1}{\sigma_X^3}\displaystyle  \int_{\mathbb{R}} (x-\mu)^3 \cdot \dfrac{\lambda}{2}e^{-\lambda |x - \mu |} dx$. The first simplification that we do is to let $u = x- \mu$ so that $du = dx$ and the bounds are still $\pm \infty$. This new integral becomes $$\dfrac{\lambda}{2\sigma_X^3} \displaystyle \int_{\mathbb{R}} u^3e^{-\lambda |u|}du$$ This is where the magic takes place. Note that $u^3e^{-\lambda |u|}$ is odd about $u = 0$ and we are integrating over a symmetric integral about $0$ (namely, the real line). We also know that this integral must be finite since we assume the first three moments of $X$ are finite. Therefore, as this integrand is odd and finite about a symmetric integral, the integral must be $0$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0"
    ],
    "difficulty": "medium",
    "id": "7urobXDbDhlm4VvZVpUt",
    "internalDifficulty": 0,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 9475386,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Skewed",
    "topic": "statistics",
    "urlEnding": "skewed"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "7urobXDbDhlm4VvZVpUt",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Skewed",
    "topic": "statistics",
    "urlEnding": "skewed"
  }
}
```
