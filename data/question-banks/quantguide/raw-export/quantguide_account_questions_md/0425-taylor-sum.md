# QuantGuide Question

## 425. Taylor Sum

**Metadata**

- ID: `AlAqqTnne2lzczopnoW5`
- URL: https://www.quantguide.io/questions/taylor-sum
- Topic: pure math
- Difficulty: medium
- Internal Difficulty: 2
- Companies: SIG
- Source: sig edited
- Tags: Calculus
- Premium: True
- Solution Free: False
- Version: 3
- Last Edited: 2023-9-30 23:17:39 America/New_York
- Last Edited By: Gabe

### 题干

Evaluate $f^{(7)}(0)$, where $f(x) = (1 + x + 2x^2 + 3x^3)e^{x^2}$.

### Hint

Write $e^{x^2} = \displaystyle \sum_{k=0}^{\infty} \dfrac{x^{2k}}{k!}$. Plug this in and expand out the sums. Then, you need to sum up $c_7 \cdot 7!$ in each sum, where $c_7$ is the coefficient of $x^7$.

### 解答

Using Taylor Series, we can write $e^{x^2} = \displaystyle \sum_{k=0}^{\infty} \dfrac{x^{2k}}{k!}$. Therefore, $$f(x) = (1+x+2x^2+3x^3)\displaystyle \sum_{k=0}^{\infty} \dfrac{x^{2k}}{k!} = \displaystyle \sum_{k=0}^{\infty} \dfrac{x^{2k}}{k!} + x\displaystyle \sum_{k=0}^{\infty} \dfrac{x^{2k}}{k!} + 2x^2\displaystyle \sum_{k=0}^{\infty} \dfrac{x^{2k}}{k!} + 3x^3\displaystyle \sum_{k=0}^{\infty} \dfrac{x^{2k}}{k!}$$

Multiplying in the powers of $x$, we have that $$f(x) = \displaystyle \sum_{k=0}^{\infty} \dfrac{x^{2k}}{k!} + \displaystyle \sum_{k=0}^{\infty} \dfrac{x^{2k+1}}{k!} + 2\displaystyle \sum_{k=0}^{\infty} \dfrac{x^{2k+2}}{k!} + \displaystyle 3\sum_{k=0}^{\infty} \dfrac{x^{2k+3}}{k!}$$ To find the $7$th derivative at $0$, we need to sum up $c_7 \cdot 7!$ in each sum, where $c_7$ is the coefficient of $x^7$. However, we quickly see that the first and third sums do not have any such term, as all of their terms have even powers. Therefore, those can immediately be eliminated. Looking at the second sum, we see that $c_7 = \dfrac{1}{3!} = \dfrac{1}{6}$, as we get an exponent of $7$ with $k = 3$. Therefore, we get a contribution of $\dfrac{7!}{3!}$ from that term. From the last sum, we see that $k = 2$ yields an exponent of $7$, so the coefficient there is $\dfrac{3}{2!} = \dfrac{3}{2}$, so that sum adds a total of $\dfrac{3}{2} \cdot 7!$. Adding these two terms up, we get a sum of $8400$, which we can conclude to be $f^{(7)}(0)$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "8400"
    ],
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "AlAqqTnne2lzczopnoW5",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 23:17:39 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3408749,
    "source": "sig edited",
    "status": "published",
    "tags": [
      {
        "tag": "Calculus"
      }
    ],
    "title": "Taylor Sum",
    "topic": "pure math",
    "urlEnding": "taylor-sum",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "medium",
    "id": "AlAqqTnne2lzczopnoW5",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Calculus"
      }
    ],
    "title": "Taylor Sum",
    "topic": "pure math",
    "urlEnding": "taylor-sum"
  }
}
```
