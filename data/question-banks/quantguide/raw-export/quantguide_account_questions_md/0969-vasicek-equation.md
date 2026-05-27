# QuantGuide Question

## 969. Vasicek Equation

**Metadata**

- ID: `DlfDBYj2ym7Stu5rBOJz`
- URL: https://www.quantguide.io/questions/vasicek-equation
- Topic: pure math
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: Shreve Stoch Calc
- Tags: Stochastic Calculus
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-30 23:18:30 America/New_York
- Last Edited By: Gabe

### 题干

Let $W_t$ be a standard Brownian Motion. Let $R_t$ satisfy the SDE $$dR_t = (a - bR_t)dt + \sigma dW_t$$ for $a,b,\sigma > 0$ and $R_0 = r > 0$. $\mathbb{E}[R_T]$ can be written as a function of $a,b,r,$ and $T$. Evaluate this function with parameters $T = 10, a = 0.2, b = 0.1, \sigma = 0.1,$ and $r = 1$. The answer will be in the form $A + Be^{C}$ for integers $A,B,$ and $C$. Find $A + B + C$.

### Hint

Calculate $d(e^{bt}R_t)$ via Ito's Formula. Afterwards, express $e^{bT}R_T - R_0$ as a sum of Lebesgue and Ito integrals. A "sufficiently nice" integrand inside an Ito integral has mean $0$.

### 解答

We can calculate $d(e^{bt}R_t)$ via Ito's Formula. This can be done via the product rule. In particular, $$d(e^{bt}R_t) = be^{bt}R_tdt + e^{bt}dR_t = be^{bt}R_tdt + e^{bt}\left((a-bR_t)dt + \sigma dW_t\right) = ae^{bt}dt + \sigma e^{bt}dW_t$$ Now, we integrate both sides to get $$e^{bT}R_T - R_0 = \displaystyle \int_0^T ae^{bs}ds + \int_0^T \sigma e^{bs} dW_s$$ We can substitute a couple of things. Namely, $R_0 = r$ by the question. In addition, the Ito integral on the RHS is "sufficiently nice" so that it has $0$ mean. Therefore, $$e^{bT}\mathbb{E}[R_T] - R_0 = \dfrac{a}{b}\left(e^{bT} - 1\right)$$ After adding $r$ and multiplying by $e^{-bT}$ on both sides, we get that $\mathbb{E}[R_T] = re^{-bT} + \dfrac{a}{b}\left(1 - e^{-bT}\right)$. 

$$$$

Evaluating this with the parameters in question, our expectation evaluates to $e^{-1} + 2\left(1 - e^{-1}\right) = 2 - e^{-1}$. In this case, we have that $2 - 1 - 1 = 0$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0"
    ],
    "companies": [],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "DlfDBYj2ym7Stu5rBOJz",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 23:18:30 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7907077,
    "source": "Shreve Stoch Calc",
    "status": "published",
    "tags": [
      {
        "tag": "Stochastic Calculus"
      }
    ],
    "title": "Vasicek Equation",
    "topic": "pure math",
    "urlEnding": "vasicek-equation",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "hard",
    "id": "DlfDBYj2ym7Stu5rBOJz",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Stochastic Calculus"
      }
    ],
    "title": "Vasicek Equation",
    "topic": "pure math",
    "urlEnding": "vasicek-equation"
  }
}
```
