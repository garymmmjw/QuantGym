# QuantGuide Question

## 1104. Square Normal

**Metadata**

- ID: `IMJWsLDBUWIWgotgoVy7`
- URL: https://www.quantguide.io/questions/square-normal
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: MSE
- Tags: Conditional Expectation, Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Let $X,Y \sim N(0,1)$ IID. Compute $\mathbb{E}[X \mid X^2 + Y^2]$.

### Hint

$$-X \sim N(0,1)$ as well.

### 解答

As $-X \sim N(0,1)$ as well, we can say that $-X$ and $Y$ are IID. Therefore, $$\mathbb{E}[X \mid X^2 + Y^2] = \mathbb{E}[-X \mid (-X)^2 + Y^2] = - \mathbb{E}[X \mid X^2 + Y^2]$$ This can only occur if this conditional expectation is $0$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0"
    ],
    "companies": [],
    "difficulty": "medium",
    "id": "IMJWsLDBUWIWgotgoVy7",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 9033852,
    "randomizable": "",
    "source": "MSE",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Square Normal",
    "topic": "probability",
    "urlEnding": "square-normal"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "IMJWsLDBUWIWgotgoVy7",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Square Normal",
    "topic": "probability",
    "urlEnding": "square-normal"
  }
}
```
