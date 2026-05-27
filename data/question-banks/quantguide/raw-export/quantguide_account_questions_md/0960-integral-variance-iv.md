# QuantGuide Question

## 960. Integral Variance IV

**Metadata**

- ID: `GcbXs23Tfp2pleQqXvHE`
- URL: https://www.quantguide.io/questions/integral-variance-iv
- Topic: pure math
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: 150 q
- Tags: Stochastic Calculus
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-7 12:30:40 America/New_York
- Last Edited By: Gabe

### 题干

Let $W_t$ be a standard Brownian Motion. Find the variance of $X = \displaystyle \int_0^2 \sqrt{t} e^{\frac{W_t^2}{8}}dW_t$.

### Hint

Since the integrand is "nice enough" here, we can see that the mean of $X$ is $0$. Use Ito's Isometry for the second moment.

### 解答

We use a couple of the common lemmas to solve this. Namely, since the integrand is "nice enough" here, we can see that the mean of $X$ is $0$. Therefore, we just need to find the second moment. In particular, since the integrand is square integrable over the interval in question, $$\mathbb{E}[X^2] = \displaystyle \int_0^2 \mathbb{E}\left[\left(\sqrt{t}e^{\frac{W_t^2}{8}}\right)^2\right] dt = \displaystyle \int_0^2 t \mathbb{E}\left[e^{\frac{W_t^2}{4}}\right] dt$$ As $W_t \sim N(0,t)$, we have that $W_t = \sqrt{t}Z$, where $Z \sim N(0,1)$. Therefore, $$\mathbb{E}\left[e^{\frac{W_t^2}{4}}\right] = \mathbb{E}\left[e^{\frac{t}{4}Z^2}\right] = M_{Z^2}\left(\dfrac{t}{4}\right)$$ Where $M_{Z^2}(\theta)$ is the MGF of $Z^2$. Note that as $Z \sim N(0,1)$, $Z^2 \sim \chi^2_1$. A $\chi^2_1$ random variable has MGF given by $$M_{Z^2}(\theta) = \left(1 - 2\theta\right)^{-\frac{1}{2}}$$ Evaluating at $\theta = \dfrac{t}{4}$, we have that $$\mathbb{E}\left[e^{\frac{W_t^2}{4}}\right] = \sqrt{\dfrac{2}{2-t}}$$ Plugging this back in, $$\mathbb{E}[X^2] = \displaystyle \int_0^2 t \cdot \sqrt{\dfrac{2}{2-t}}dt = \dfrac{16}{3}$$ This is also the variance, as the mean is $0$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "16/3"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "GcbXs23Tfp2pleQqXvHE",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 12:30:40 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7820683,
    "source": "150 q",
    "status": "published",
    "tags": [
      {
        "tag": "Stochastic Calculus"
      }
    ],
    "title": "Integral Variance IV",
    "topic": "pure math",
    "urlEnding": "integral-variance-iv",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "GcbXs23Tfp2pleQqXvHE",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Stochastic Calculus"
      }
    ],
    "title": "Integral Variance IV",
    "topic": "pure math",
    "urlEnding": "integral-variance-iv"
  }
}
```
