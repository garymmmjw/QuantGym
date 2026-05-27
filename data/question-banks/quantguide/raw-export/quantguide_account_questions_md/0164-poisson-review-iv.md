# QuantGuide Question

## 164. Poisson Review IV

**Metadata**

- ID: `vVhxoxJPRJ2RGPdKNGo3`
- URL: https://www.quantguide.io/questions/poisson-review-iv
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: Wackerly
- Tags: Discrete Random Variables
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Gabe makes rugs. The number of imperfections follows a Poisson distribution with an average of 4 per square yard. The probability that a 3-square-yard rug sample contains at least 1 imperfection can be expressed in the form $1 + \frac{a}{e^b}$. Compute $a + b$.

### Hint

What is the rate of imperfections per $3$ square yards?

### 解答

The average number of imperfections per 3 square yards is $3 \cdot 4 = 12$. Let $X \sim \text{Poisson}(12)$. Then, $\mathbb{P}(X \geq 1) = 1 - \mathbb{P}(X = 0) = 1 - \frac{12^0 e^{-12}}{1}$. Our probability is $1 - \frac{1}{e^{12}}$, so our answer is $-1 + 12 = 11$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "11"
    ],
    "companies": [],
    "difficulty": "easy",
    "id": "vVhxoxJPRJ2RGPdKNGo3",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 1229943,
    "source": "Wackerly",
    "status": "published",
    "tags": [
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Poisson Review IV",
    "topic": "probability",
    "urlEnding": "poisson-review-iv"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "vVhxoxJPRJ2RGPdKNGo3",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Poisson Review IV",
    "topic": "probability",
    "urlEnding": "poisson-review-iv"
  }
}
```
