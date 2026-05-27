# QuantGuide Question

## 508. Absolutely Brownian

**Metadata**

- ID: `3eAXToIcnG18jSaFUR44`
- URL: https://www.quantguide.io/questions/absolutely-brownian
- Topic: pure math
- Difficulty: medium
- Internal Difficulty: 3
- Companies: Citadel
- Source: og
- Tags: Stochastic Calculus
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-17 13:45:52 America/New_York
- Last Edited By: Gabe

### 题干

Let $W_t$ be a standard Brownian Motion and let $T_4 = \text{inf}\{t > 0: |W_t| >4\}$. Find $\text{Var}(T_4)$.

### Hint

Consider $f(t,w) = w^4 - 6w^2t + 3t^2$ and show that this defines a martingale.

### 解答

We are going to solve this for general $T_a = \text{inf}\{t>0: |W_t| >a\}$ for any $a > 0$. It is a well-known fact that $Z_t = f(t,W_t)$ defines a martingale, where $f(t,w) = w^4 - 6w^2t + 3t^2$. By using the Optional Stopping Theorem, we have that $$\mathbb{E}[Z_{T_4}] = \mathbb{E}[W_{T_a}^4 - 6W_{T_a}^2T_a + 3T_a^2] = \mathbb{E}[Z_0] = 0$$ Since $W_{T_a} = \pm a$ with equal probability, we know that $W_{T_a}^4 = a^4$ with probability $1$. Similarly, $W_{T_a}^2 = a^2$ with probability $1$. Therefore, by linearity, we have that $a^4 - 6a^2\mathbb{E}[T_a] + 3\mathbb{E}[T_a^2] = 0$. From a more basic martingale argument on $W_t^2 - t$, one can easily prove that $\mathbb{E}[T_a] = a^2$. Therefore, we have that $\mathbb{E}[T_a^2] = \dfrac{5}{3}a^4$ by rearrangement. 

$$$$

To find the variance, we just use our classic relationship $\text{Var}(T_a) = \mathbb{E}[T_a^2] - (\mathbb{E}[T_a])^2 = \dfrac{5}{3}a^4 - a^4 = \dfrac{2}{3}a^4$. In our case, $a = 4$, so the answer is $\dfrac{512}{3}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "512/3"
    ],
    "companies": [
      {
        "company": "Citadel"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "3eAXToIcnG18jSaFUR44",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-17 13:45:52 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4051529,
    "source": "og",
    "status": "published",
    "tags": [
      {
        "tag": "Stochastic Calculus"
      }
    ],
    "title": "Absolutely Brownian",
    "topic": "pure math",
    "urlEnding": "absolutely-brownian",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Citadel"
      }
    ],
    "difficulty": "medium",
    "id": "3eAXToIcnG18jSaFUR44",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Stochastic Calculus"
      }
    ],
    "title": "Absolutely Brownian",
    "topic": "pure math",
    "urlEnding": "absolutely-brownian"
  }
}
```
