# QuantGuide Question

## 702. Uniform Summation

**Metadata**

- ID: `IvADiDnGMIqDBlydWr3W`
- URL: https://www.quantguide.io/questions/uniform-summation
- Topic: statistics
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Continuous Random Variables, Expected Value
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 13:13:55 America/New_York
- Last Edited By: Gabe

### 题干

By considering $U \sim \text{Unif}(0,0.5)$ and $\mathbb{E}\left[\dfrac{1}{1-U}\right]$, compute $\displaystyle \sum_{n=0}^{\infty} \dfrac{1}{2^n(n+1)}$. The answer should be in the form $\ln(a)$ for some integer $a$. Find $a$.

### Hint

Recall that $\dfrac{1}{1-x} = \displaystyle \sum_{k=0}^{\infty} x^k$ for $|x| < 1$.

### 解答

By directly applying LOTUS, $\mathbb{E}\left[\dfrac{1}{1-U}\right] = \displaystyle \int_0^{0.5} \dfrac{1}{1-x} \cdot 2 dx = -2\ln(1-x)\Big|_0^{0.5} = -2\ln(0.5) = 2\ln(2) = \ln(4)$.

$$$$

On the other hand, $\mathbb{E}\left[\dfrac{1}{1-U}\right] = \mathbb{E}\left[\displaystyle \sum_{k=0}^{\infty} U^k\right] = \displaystyle \sum_{k=0}^{\infty} \mathbb{E}[U^k]$. 

$$$$

We calculate $\mathbb{E}[U^k]$ by LOTUS as well. Namely, $\mathbb{E}[U^k] = \displaystyle \int_0^{0.5} 2x^k dx = \dfrac{2x^{k+1}}{k+1}\Big|_0^{0.5} = \dfrac{1}{2^k(k+1)}$. This exactly matches with the terms in the summation in the question. Therefore, the sum is $\ln(4)$, meaning $a = 4$.



### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "4"
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "IvADiDnGMIqDBlydWr3W",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 13:13:55 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5739596,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Uniform Summation",
    "topic": "statistics",
    "urlEnding": "uniform-summation"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "IvADiDnGMIqDBlydWr3W",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Uniform Summation",
    "topic": "statistics",
    "urlEnding": "uniform-summation"
  }
}
```
