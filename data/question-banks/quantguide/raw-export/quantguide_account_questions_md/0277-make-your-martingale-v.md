# QuantGuide Question

## 277. Make Your Martingale V

**Metadata**

- ID: `GPWxpPmV2ooPO9MR1qHR`
- URL: https://www.quantguide.io/questions/make-your-martingale-v
- Topic: pure math
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: JHU Stoch Calc
- Tags: Stochastic Calculus
- Premium: True
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-30 23:22:00 America/New_York
- Last Edited By: Gabe

### 题干

Let $W_t$ be a standard Brownian Motion. Define a process $Y_t = \displaystyle \int_0^t sdW_s$. Furthermore, define a process $Z_t = tY_t - a_t$ for some process $a_t$. Let $a_t$ be specifically selected so that $Z_t$ is a martingale. The form of $a_t$ is $a_t = k \displaystyle \int_0^t Y_sds$ for a constant $k$. Find $k$.

### Hint

Calculate $dY_t$ and then $dZ_t$.

### 解答

We can quickly compute $dY_t = tdW_t$ quite simply. First, let $f(t,y) = ty$. We can see that $f_t(t,y) = y, f_y(t,y) = t,$ and $f_{yy}(t,y) = 0$. Therefore, by Ito's Formula, $dZ_t = Y_tdt + t^2dW_t$. Therefore, if $a_t = \displaystyle \int_0^t Y_s ds$, $Z_t$ would be a martingale. This is because $da_t = Y_t dt$, so it would cancel out the $Y_tdt$ that currently exists in $dZ_t$. Therefore, this means $k = 1$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "GPWxpPmV2ooPO9MR1qHR",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 23:22:00 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2137731,
    "source": "JHU Stoch Calc",
    "status": "published",
    "tags": [
      {
        "tag": "Stochastic Calculus"
      }
    ],
    "title": "Make Your Martingale V",
    "topic": "pure math",
    "urlEnding": "make-your-martingale-v",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "GPWxpPmV2ooPO9MR1qHR",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Stochastic Calculus"
      }
    ],
    "title": "Make Your Martingale V",
    "topic": "pure math",
    "urlEnding": "make-your-martingale-v"
  }
}
```
