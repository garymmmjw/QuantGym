# QuantGuide Question

## 254. Make Your Martingale II

**Metadata**

- ID: `ToDRAMJqKX3vlcpjBRTx`
- URL: https://www.quantguide.io/questions/make-your-martingale-ii
- Topic: pure math
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: JHU Stoch Calc
- Tags: Stochastic Calculus
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-30 23:21:05 America/New_York
- Last Edited By: Gabe

### 题干

Let $W_t$ be a standard Brownian Motion and let $X_t = W_t^3 - ctW_t$ for some constant $c$. Find the value of $c$ that makes $X_t$ a martingale.

### Hint

Use Ito's Formula on $f(t,w) = w^3 - ctw$

### 解答

Using Ito's Formula on $f(t,w) = w^3 - ctw$, we have that $$dX_t = f_t(t,w)dt + f_w(t,w)dW_t + \dfrac{1}{2}f_{ww}(t,w)dt$$ The last term comes from the quadratic variation of $W_t$. This is a martingale exactly when there is no $dt$ term i.e. when $f_t(t,w) = -\dfrac{1}{2}f_{ww}(t,w)$. We can quickly calculate that $f_t(t,w) = -cw$ and that $f_{ww}(t,w) = 6w$. Therefore, $-cw = -\dfrac{1}{2}\cdot 6w = -3w$, which means $c = 3$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "ToDRAMJqKX3vlcpjBRTx",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 23:21:05 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1990537,
    "source": "JHU Stoch Calc",
    "status": "published",
    "tags": [
      {
        "tag": "Stochastic Calculus"
      }
    ],
    "title": "Make Your Martingale II",
    "topic": "pure math",
    "urlEnding": "make-your-martingale-ii",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "ToDRAMJqKX3vlcpjBRTx",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Stochastic Calculus"
      }
    ],
    "title": "Make Your Martingale II",
    "topic": "pure math",
    "urlEnding": "make-your-martingale-ii"
  }
}
```
