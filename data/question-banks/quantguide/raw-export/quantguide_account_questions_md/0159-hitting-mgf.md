# QuantGuide Question

## 159. Hitting MGF

**Metadata**

- ID: `xDkWF0eB8DXUWqs1d4FB`
- URL: https://www.quantguide.io/questions/hitting-mgf
- Topic: pure math
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: og
- Tags: Conditional Probability, Conditional Expectation, Stochastic Calculus
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-17 13:58:19 America/New_York
- Last Edited By: Gabe

### 题干

Let $W_t$ be a standard Brownian Motion and define $T_a = \text{inf}\{t > 0: |W_t| > a\}$ for $a > 0$. Find $\mathbb{E}[e^{-\lambda T_a}]$ as a function of $\lambda$ and $a$. Evaluate this function with $\lambda = 4$ and $a = \ln(2)$.

### Hint

Consider the exponential martingale $Z_t = e^{\theta W_t - \theta^2t/2}$.

### 解答

Consider the exponential martingale $Z_t = e^{\theta W_t - \theta^2t/2}$. If you have not shown this is a martingale before, it is a good exercise to do so. We can apply the Optional Stopping Theorem to $Z_t$ with $T_a$ and obtain $$\mathbb{E}[Z_{T_a}] = \mathbb{E}[Z_0] = e^0 = 1$$ Note that when $T_a$ occurs, $W_{T_a}$ is equally likely to be either $a$ or $-a$, since they are equidistant from the origin. Therefore, we need to take a conditional expectation based on what $W_{T_4}$ is. In particular, we obtain $$\dfrac{1}{2}\mathbb{E}\left[e^{a\theta - \theta^2 T_a/2}\right] + \dfrac{1}{2}\mathbb{E}\left[e^{-a\theta - \theta^2T_a/2}\right] = 1$$ by conditioning on $W_{T_a} = \pm a$. We can multiply by $2$ on both sides and extract the leading term of each expectation to get that $$\left(e^{a\theta} + e^{-a\theta}\right)\mathbb{E}\left[e^{-\theta^2T_a/2}\right] = 2 \iff \mathbb{E}\left[e^{-\theta^2T_a/2}\right] = 1/\cosh(a\theta)$$ We are looking for $\mathbb{E}[e^{-\lambda T_a}]$. This can be remedied by re-parameterizing and letting $\theta = \sqrt{2\lambda}$ so that we get our desired quantity on the LHS. In particular, we get that $\mathbb{E}\left[e^{-\lambda T_a}\right] = 1/\cosh(a\sqrt{2\lambda})$.

$$$$

Plugging in $\lambda = 4$ and $a = \ln(2)$, our answer is $\dfrac{2}{e^{4\ln(2)} + e^{-4\ln(2)}} = \dfrac{2}{16 + 1/16} = \dfrac{32}{257}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "32/257"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "xDkWF0eB8DXUWqs1d4FB",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-17 13:58:19 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1206266,
    "source": "og",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Stochastic Calculus"
      }
    ],
    "title": "Hitting MGF",
    "topic": "pure math",
    "urlEnding": "hitting-mgf",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "xDkWF0eB8DXUWqs1d4FB",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Stochastic Calculus"
      }
    ],
    "title": "Hitting MGF",
    "topic": "pure math",
    "urlEnding": "hitting-mgf"
  }
}
```
