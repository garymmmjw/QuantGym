# QuantGuide Question

## 208. Make Your Martingale IV

**Metadata**

- ID: `ote9NwdTBzevyEJwQUrQ`
- URL: https://www.quantguide.io/questions/make-your-martingale-iv
- Topic: pure math
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: JHU Stoch Calc
- Tags: Stochastic Calculus
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-30 23:21:29 America/New_York
- Last Edited By: Gabe

### 题干

Let $W_t$ be a standard Brownian Motion. Define $X_t = W_t^{10} - \displaystyle \int_0^t a_s ds$ for some process $\{a_t\}_{t \geq 0}$ adapted to the natural filtration of the probability space. The process $a_t$ that makes $X_t$ a martingale can we written as $a_t = A W_t^B$ for some real constants $A$ and $B$. Find $AB$.

### Hint

Calculate $dX_t$ via Ito's Formula. The process $a_t$ will cancel out the $dt$ portion.

### 解答

The objective here is to calculate $dX_t$ via Ito's Formula. The process $a_t$ will cancel out the $dt$ portion. Namely, $dX_t = 10W_t^9dW_t - a_tdt + \dfrac{1}{2} \cdot 90W_t^{8}dt$, as the integral portion has $0$ second derivative.  In particular we can write this as $dX_t = 10W_t^9dW_t + (45W_t^8 - a_t)dt$, so $a_t = 45W_t^8$. This means our answer is $45 \cdot 8 = 360$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "360"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "ote9NwdTBzevyEJwQUrQ",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 23:21:29 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1611213,
    "source": "JHU Stoch Calc",
    "status": "published",
    "tags": [
      {
        "tag": "Stochastic Calculus"
      }
    ],
    "title": "Make Your Martingale IV",
    "topic": "pure math",
    "urlEnding": "make-your-martingale-iv",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "ote9NwdTBzevyEJwQUrQ",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Stochastic Calculus"
      }
    ],
    "title": "Make Your Martingale IV",
    "topic": "pure math",
    "urlEnding": "make-your-martingale-iv"
  }
}
```
