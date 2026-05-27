# QuantGuide Question

## 337. Reciprocal SDE

**Metadata**

- ID: `R7mgZ8y7LvV84JY4AWvi`
- URL: https://www.quantguide.io/questions/reciprocal-sde
- Topic: pure math
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: JHU Stoch Calc
- Tags: Stochastic Calculus
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Let $W_t$ be a standard Brownian Motion. Suppose that $X_t$ is some process such that $\dfrac{1}{X_t}$ satisfies the SDE $d\left(\dfrac{1}{X_t}\right) = \dfrac{1}{X_t}\left(2dt - dW_t\right)$. The SDE that $X_t$ satisfies is in the form $dX_t = X_t(adt + bdW_t)$ for some integers $a$ and $b$. Find $ab$.

### Hint

Let $Y_t = \dfrac{1}{X_t}$. Use Ito's Formula on $\dfrac{1}{Y_t}$ after some rewriting of the SDE. 

### 解答

Let $Y_t = \dfrac{1}{X_t}$. We can write the SDE in the question as $dY_t = Y_t(2dt - dW_t)$. Note that $X_t = \dfrac{1}{Y_t}$ from definition. Therefore, let $f(y) = \dfrac{1}{y}$. We have that $f'(y) = -\dfrac{1}{y^2}$ and $f''(y) = \dfrac{2}{y^3}$. 

$$$$

From Ito's Formula, we get that $dX_t = df(Y_t) = f'(Y_t)dY_t + \dfrac{1}{2}f''(Y_t)d[Y,Y]_t$, where $d[Y,Y]_t$ is the quadratic variation of $Y_t$. We already know $dY_t$ from the SDE above. We get that $$d[Y,Y]_t = (Y_t(2dt - dW_t))^2 = Y_t^2\left(4d[t,t]_t - 4d[t,W]_t + d[W,W]_t\right) = Y_t^2 dt$$ by the fact that $d[t,t]_t = d[t,W]_t = 0$.

$$$$

Plugging everything in, $$dX_t = -\dfrac{1}{Y_t^2} \cdot Y_t(2dt - dW_t) + \dfrac{1}{Y_t^3} \cdot Y_t^2 dt = \dfrac{1}{Y_t}\left(-dt + dW_t\right) = X_t(-dt + dW_t)$$

This yields that our answer is $-1 \cdot 1 = -1$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "-1"
    ],
    "companies": [],
    "difficulty": "medium",
    "id": "R7mgZ8y7LvV84JY4AWvi",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 2586865,
    "source": "JHU Stoch Calc",
    "status": "published",
    "tags": [
      {
        "tag": "Stochastic Calculus"
      }
    ],
    "title": "Reciprocal SDE",
    "topic": "pure math",
    "urlEnding": "reciprocal-sde"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "R7mgZ8y7LvV84JY4AWvi",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Stochastic Calculus"
      }
    ],
    "title": "Reciprocal SDE",
    "topic": "pure math",
    "urlEnding": "reciprocal-sde"
  }
}
```
