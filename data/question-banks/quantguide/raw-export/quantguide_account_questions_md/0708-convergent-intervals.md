# QuantGuide Question

## 708. Convergent intervals

**Metadata**

- ID: `zxAOnT5KcclXCvkUnwl1`
- URL: https://www.quantguide.io/questions/convergent-intervals
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: TQD
- Tags: Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: 5
- Last Edited: 2023-10-29 22:56:12 America/New_York
- Last Edited By: Gabe

### 题干

Suppose you continually randomly sample nested intervals from $[0, 1]$, halving the size each time. That is, the next interval is $[x, x+0.5]$, where $x \sim U(0, 0.5)$, and so on. What is the variance of the point this converges to? 

### Hint

What happens to the center of the innermost interval at each step? Can you model the process in some way?

### 解答

The point that the intervals converge to will become arbitrarily close to the center of our most recent interval. If our current interval is of length $x$, the distance of the next interval's center to the current interval's center is distributed $U(0, x/4)$. Recalling that the variance of a continuous uniform random variable is $\dfrac{(b-a)^2}{12}$, we can consider the point of convergence as an infinite sum of uniformly distributed random variables. $$\text{Var}\left(\sum_{n=0}^{\infty} X_i\right) = \sum_{n=0}^{\infty} \text{Var}(X_i) = \sum_{n=0}^{\infty} \dfrac{(1/4 \cdot (1/2)^n)^2}{12} = \dfrac{1}{36}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/36"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "zxAOnT5KcclXCvkUnwl1",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-29 22:56:12 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5783233,
    "source": "TQD",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Convergent intervals",
    "topic": "probability",
    "urlEnding": "convergent-intervals",
    "version": 5
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "zxAOnT5KcclXCvkUnwl1",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Convergent intervals",
    "topic": "probability",
    "urlEnding": "convergent-intervals"
  }
}
```
