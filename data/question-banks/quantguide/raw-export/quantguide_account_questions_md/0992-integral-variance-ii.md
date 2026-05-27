# QuantGuide Question

## 992. Integral Variance II

**Metadata**

- ID: `tDRP9XALrK8unlax85ZA`
- URL: https://www.quantguide.io/questions/integral-variance-ii
- Topic: pure math
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Goldman Sachs
- Source: 150 question
- Tags: Stochastic Calculus
- Premium: False
- Solution Free: False
- Version: 4
- Last Edited: 2023-11-7 12:30:30 America/New_York
- Last Edited By: Gabe

### 题干

Let $W_t$ be a standard Brownian Motion. Compute $\text{Var}\left(\displaystyle \int_0^t W_s dW_s\right)$. The answer is in the form $kt^2$ for a constant $k$. Find $k$.

### Hint

From basic calculus, you know that $\displaystyle \int xdx = \dfrac{x^2}{2}$, so first attempt to evaluate $d\left(\dfrac{W_t^2}{2}\right)$ as a starting point. 

### 解答

We first attempt to evaluate $\displaystyle \int_0^t W_s dW_s$. From basic calculus, we know that $\displaystyle \int xdx = \dfrac{x^2}{2}$, so we first attempt to evaluate $d\left(\dfrac{W_t^2}{2}\right)$ as a starting point. 

$$$$

Let $f(x) = \dfrac{x^2}{2}$. We know that $f'(x) = x$ and $f''(x) = 1$. By Ito's Formula, we have that $$d\left(\dfrac{W_t^2}{2}\right) = df(W_t) = W_tdW_t + \dfrac{1}{2}d[W,W]_t = W_tdW_t + \dfrac{1}{2}dt$$ This implies to us that $\dfrac{W_t^2 - t}{2}$ is the function we are looking to take the derivative of, as that would produce $W_tdW_t$ on the RHS when we take the derivative. Integrating both sides, this yields that $$\displaystyle \int_0^t W_sdW_s = \dfrac{W_t^2 - t}{2} + C$$ As $W_0 = 0$, we get that $C = 0$ as well. Therefore, we really want to evaluate $\text{Var}\left(\dfrac{W_t^2 - t}{2}\right) = \dfrac{1}{4}\text{Var}(W_t^2)$ by properties of variance.

$$$$

We use the fact here that for $X \sim N(0,1)$, $\mathbb{E}[X^4] = 3$. This can be proven with MGFs or even Brownian Motion itself! Since $W_t \sim N(0,t)$, $W_t = \sqrt{t}X$. Using this, $$\text{Var}(W_t^2) = \mathbb{E}[W_t^4] - (\mathbb{E}[W_t^2])^2 = t^2\text{E}[X^4] - t^2 = 2t^2$$ Since we have the constant of $1/4$ out front, this means that $k = 2 \cdot 1/4 = 1/2$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/2"
    ],
    "companies": [
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "tDRP9XALrK8unlax85ZA",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 12:30:30 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8077916,
    "source": "150 question",
    "status": "published",
    "tags": [
      {
        "tag": "Stochastic Calculus"
      }
    ],
    "title": "Integral Variance II",
    "topic": "pure math",
    "urlEnding": "integral-variance-ii",
    "version": 4
  },
  "list_summary": {
    "companies": [
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "medium",
    "id": "tDRP9XALrK8unlax85ZA",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Stochastic Calculus"
      }
    ],
    "title": "Integral Variance II",
    "topic": "pure math",
    "urlEnding": "integral-variance-ii"
  }
}
```
