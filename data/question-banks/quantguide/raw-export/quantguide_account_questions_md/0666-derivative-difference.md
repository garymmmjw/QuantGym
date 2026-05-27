# QuantGuide Question

## 666. Derivative Difference

**Metadata**

- ID: `2fDjWyCYoQPyyGsiQdlj`
- URL: https://www.quantguide.io/questions/derivative-difference
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 3
- Companies: WorldQuant
- Source: WorldQuant
- Tags: Pure Math, Linear Algebra
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Let $f(x)$ be a function satisfying the differential equation $f(x) - f'(x) = (x+1)^3$ with initial condition $f(0) = 16$. Find $f(9)$.

### Hint

Take derivatives of the differential equation you see there. Note what happens once you get to $f^{(4)}(x) - f^{(5)}(x)$.

### 解答

Note that the original differential equation implies that $f'(x) - f''(x) = 3(x+1)^2, f''(x) - f^{(3)}(x) = 6(x+1), f^{(3)}(x) - f^{(4)}(x) = 6,$ and $f^{(k)}(x) - f^{(k+1)}(x) = 0$ for all $k \geq 4$. This last expression implies that $f^{(4)}(x) = 0$ for all $x$. Therefore, we just have to work backwards by plugging in $x$. 

$$$$

Namely, $f^{(3)}(9) = 6$. Then, $f''(9) = 6 + 6(9+1) = 66$. Afterwards, $f'(9) = 66 + 3(9+1)^2 = 366$. Lastly, $$f(9) = 366 + (9+1)^3 = 1366$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1366"
    ],
    "companies": [
      {
        "company": "WorldQuant"
      }
    ],
    "difficulty": "medium",
    "id": "2fDjWyCYoQPyyGsiQdlj",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 5348668,
    "source": "WorldQuant",
    "status": "published",
    "tags": [
      {
        "tag": "Pure Math"
      },
      {
        "tag": "Linear Algebra"
      }
    ],
    "title": "Derivative Difference",
    "topic": "brainteasers",
    "urlEnding": "derivative-difference"
  },
  "list_summary": {
    "companies": [
      {
        "company": "WorldQuant"
      }
    ],
    "difficulty": "medium",
    "id": "2fDjWyCYoQPyyGsiQdlj",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Pure Math"
      },
      {
        "tag": "Linear Algebra"
      }
    ],
    "title": "Derivative Difference",
    "topic": "brainteasers",
    "urlEnding": "derivative-difference"
  }
}
```
