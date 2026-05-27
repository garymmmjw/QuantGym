# QuantGuide Question

## 34. Silly SDE

**Metadata**

- ID: `cEYNfinl6SBLUrS2Epmk`
- URL: https://www.quantguide.io/questions/silly-sde
- Topic: pure math
- Difficulty: hard
- Internal Difficulty: 4
- Companies: N/A
- Source: JHU Stoch Calc
- Tags: Stochastic Calculus
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Let $W_t$ be a standard Brownian Motion. Let $X_t$ be a process satisfying the SDE $$dX_t = \kappa(\theta-X_t)dt - \sigma\sqrt{X_t}dW_t$$ with $X_0 = x > 0$. It can be shown (you do not need to do this) that if $\dfrac{2\kappa}{\theta} > \sigma^2$, $X_t > 0$ with probability $1$, so $\sqrt{X_t}$ is defined almost surely. For $T > 0$, $\mathbb{E}[X_T]$ can be written as a function of $x,\kappa,\theta,\sigma,$ and $T$. Evaluate this function when $T = 10, \kappa = 0.2, \theta = 2, x = 5,$ and $\sigma = 0.1$. The answer will be in the form $A + Be^C$ for integers $A,B,$ and $C$. Find $ABC$.

### Hint

Calculate $d(e^{\kappa t}X_t)$ via Ito's Formula. Afterwards, express $e^{\kappa T}X_T - X_0$ as a sum of Lebesgue and Ito integrals. A "sufficiently nice" integrand inside an Ito integral has mean $0$.

### 解答

First, we are going to calculate $d(e^{\kappa t}X_t)$. By the product rule, we have that $$d(e^{\kappa t}X_t) = \kappa e^{\kappa t} X_tdt + e^{\kappa t} dX_t = \kappa e^{\kappa t} X_t + e^{\kappa t} \left(\kappa(\theta - X_t)dt - \sigma \sqrt{X_t} dW_t\right)$$ Distributing everything, we get the first term cancels with the $-\kappa X_t dt$ term inside the parentheses, so we are left with $$d(e^{\kappa t} X_t) = \kappa \theta e^{\kappa t} dt - \sigma e^{\kappa t} \sqrt{X_t} dW_t$$ We can use this to get $e^{\kappa t}X_t$ very simply by integrating both sides. Namely, $$e^{\kappa t}X_t - X_0 = \displaystyle \int_0^t \kappa \theta e^{\kappa s} ds - \int_0^t \sigma e^{\kappa s}\sqrt{X_s} dW_s$$ Rearranging to isolate $X_t$, we have that $$X_t = X_0e^{-\kappa t} + \displaystyle \int_0^t \kappa \theta e^{\kappa(s - t)}ds - \int_0^t \sigma e^{\kappa(s-t)}\sqrt{X_s}dW_s$$ Now, we know that $X_0 = x$, so we can substitute that in. In addition, the second integral is Ito and the function inside is "sufficiently nice" to conclude that the mean of it is $0$. Thus, $$\mathbb{E}[X_T] = xe^{-\kappa T} + \displaystyle \int_0^T \kappa \theta e^{\kappa(s - T)} ds = xe^{-\kappa T} + \theta e{-\kappa T} e^{\kappa s} \Big|_0^T = xe^{-\kappa T} + \theta\left(1 - e^{-\kappa T}\right)$$ Evaluating this at the specific values, our expectation evaluates to $5e^{-2} + 2(1 - e^{-2}) = 2 + 3e^{-2}$. The answer is thus $3 \cdot 2 \cdot (-2) = -12$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "-12"
    ],
    "companies": [],
    "difficulty": "hard",
    "id": "cEYNfinl6SBLUrS2Epmk",
    "internalDifficulty": 4,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 239458,
    "source": "JHU Stoch Calc",
    "status": "published",
    "tags": [
      {
        "tag": "Stochastic Calculus"
      }
    ],
    "title": "Silly SDE",
    "topic": "pure math",
    "urlEnding": "silly-sde"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "hard",
    "id": "cEYNfinl6SBLUrS2Epmk",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Stochastic Calculus"
      }
    ],
    "title": "Silly SDE",
    "topic": "pure math",
    "urlEnding": "silly-sde"
  }
}
```
