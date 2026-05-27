# QuantGuide Question

## 469. Real Roots

**Metadata**

- ID: `udNhtvbTttZDNon1bcWK`
- URL: https://www.quantguide.io/questions/real-roots
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: og
- Tags: Continuous Random Variables
- Premium: True
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-28 18:03:57 America/New_York
- Last Edited By: Gabe

### 题干

Suppose that $B \sim \text{Rayleigh}(1)$ i.e. $B$ has the PDF $f(b) = be^{-b^2/2}I_{(0,\infty)}(b)$ and $C \sim \text{Exp}(2)$ are independent. Find the probability that the equation $x^2 + Bx + C = 0$ has no real solutions.

### Hint

Recall there there are no real solutions to this equation when $B^2 - 4C < 0$. Since $B$ and $C$ are independent, how can you find their joint PDF?

### 解答

Recall there there are no real solutions to this equation when $B^2 - 4C < 0$. In other words, we would need $C > \dfrac{B^2}{4}$. The joint PDF of $B$ and $C$ is $f_{B,C}(b,c) = be^{-b^2/2} \cdot 2e^{-2c}I_{(0,\infty)}(b)I_{(0,\infty)}(c)$ by independence of $B$ and $C$. Now, finding this probability, we get $$\mathbb{P}[C > B^2/4] = \displaystyle \int_0^{\infty} \int_{b^2/4}^{\infty} be^{-b^2/2} \cdot 2e^{-2c} dcdb = \int_0^{\infty} be^{-b^2/2} \cdot e^{-b^2/2} db = \int_0^{\infty} be^{-b^2}db = \dfrac{1}{2}$$ The first equality comes from just bounding this region in the plane, the second is just the survival function of the Exponential distribution, and the last equality comes from $u-$substitution with $u = b^2$.


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/2"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "udNhtvbTttZDNon1bcWK",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-28 18:03:57 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3748685,
    "source": "og",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Real Roots",
    "topic": "probability",
    "urlEnding": "real-roots",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "udNhtvbTttZDNon1bcWK",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Real Roots",
    "topic": "probability",
    "urlEnding": "real-roots"
  }
}
```
