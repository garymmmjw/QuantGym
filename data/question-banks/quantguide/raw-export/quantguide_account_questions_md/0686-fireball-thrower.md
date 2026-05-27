# QuantGuide Question

## 686. Fireball Thrower

**Metadata**

- ID: `ZlJgphGk2DYcQ9vldQ3h`
- URL: https://www.quantguide.io/questions/fireball-thrower
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: original
- Tags: Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Mario and Luigi are throwing Fireballs. Each one throws a fireball twice. Let $M_1$ and $M_2$ represent the distance of Mario's 
2 attempts, while $L_1$ and $L_2$ represent the distance of Luigi's 2 attempts. We have that $M_i \sim \text{Exp}(1)$ while $L_i \sim \text{Exp}(2)$. All attempts are independent of all other attempts. Let $M = \text{max}\{M_1,M_2\}$ and $L = \text{max}\{L_1,L_2\}$. Find $\mathbb{P}[M > 2L]$.

### Hint

We have that $M$ and $L$ are independent, as they come from collections of random variables that are independent of each other. The PDF of $M$ is given by $$f(x) = 2e^{-x}(1 - e^{-x})I_{(0,\infty)}(x)$$ by using the order statistics formula. Do similar for $L$ and get their joint PDF.

### 解答

We have that $M$ and $L$ are independent, as they come from collections of random variables that are independent of each other. The PDF of $M$ is given by $$f(x) = 2e^{-x}(1 - e^{-x})I_{(0,\infty)}(x)$$ by using the order statistics formula. Similarly, the PDF of $L$ is $$g(y) = 4e^{-2y}(1 - e^{-2y})I_{(0,\infty)}(y)$$ Thus, the joint PDF of $M$ and $L$ is $8e^{-(x + 2y)}(1 - e^{-x})(1 - e^{-2y})I_{(0,\infty)}(x)I_{(0,\infty)}(y)$. 

$$$$

The remainder is just integrating over the region. The double integral is $\displaystyle \int_0^{\infty} \int_{2y}^{\infty} 8e^{-(x + 2y)}(1 - e^{-x})(1 - e^{-2y}) dxdy$. We can now evaluate this as  $$\int_0^{\infty} 8e^{-2y}(1 - e^{-2y}) \int_{2y}^{\infty} e^{-x} - e^{-2x} dx dy = \int_0^{\infty} 4e^{-4y}(2 - e^{-2y})(1-e^{-2y}) dy  = \dfrac{1}{2}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/2"
    ],
    "companies": [],
    "difficulty": "medium",
    "id": "ZlJgphGk2DYcQ9vldQ3h",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 5586065,
    "source": "original",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Fireball Thrower",
    "topic": "probability",
    "urlEnding": "fireball-thrower"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "ZlJgphGk2DYcQ9vldQ3h",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Fireball Thrower",
    "topic": "probability",
    "urlEnding": "fireball-thrower"
  }
}
```
