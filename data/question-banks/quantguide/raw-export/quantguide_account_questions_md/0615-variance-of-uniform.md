# QuantGuide Question

## 615. Variance of Uniform

**Metadata**

- ID: `un0bZaT1YcRBokOsI2hD`
- URL: https://www.quantguide.io/questions/variance-of-uniform
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: IMC
- Source: IMC OA
- Tags: Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Let $X \sim \text{Unif}(0,1)$. Find $\text{Var}(X)$.

### Hint

We can quickly see that the mean of $X$ is $\dfrac{1}{2}$, as $X$ is uniformly distributed over the interval $(0,1)$, so the mean is right in the center of the interval due to the uniform distribution of probability density. Use LOTUS to compute $\mathbb{E}[X^2]$.

### 解答

We can quickly see that the mean of $X$ is $\dfrac{1}{2}$, as $X$ is uniformly distributed over the interval $(0,1)$, so the mean is right in the center of the interval due to the uniform distribution of probability density. We use LOTUS to compute $\mathbb{E}[X^2]$. Namely, the PDF of $X$ is $f(x) = I_{(0,1)}(x)$, so $$\mathbb{E}[X^2] = \displaystyle \int_{\mathbb{R}} x^2 I_{(0,1)}(x)dx = \int_0^1 x^2 dx = \dfrac{1}{3}$$ Therefore, using the formula $\text{Var}(X) = \mathbb{E}[X^2] - (\mathbb{E}[X])^2 = \dfrac{1}{3} - \left(\dfrac{1}{2}\right)^2 = \dfrac{1}{12}$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/12"
    ],
    "companies": [
      {
        "company": "IMC"
      }
    ],
    "difficulty": "easy",
    "id": "un0bZaT1YcRBokOsI2hD",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 4872874,
    "source": "IMC OA",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Variance of Uniform",
    "topic": "probability",
    "urlEnding": "variance-of-uniform"
  },
  "list_summary": {
    "companies": [
      {
        "company": "IMC"
      }
    ],
    "difficulty": "easy",
    "id": "un0bZaT1YcRBokOsI2hD",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Variance of Uniform",
    "topic": "probability",
    "urlEnding": "variance-of-uniform"
  }
}
```
