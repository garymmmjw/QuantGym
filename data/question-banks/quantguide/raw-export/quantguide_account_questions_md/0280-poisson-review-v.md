# QuantGuide Question

## 280. Poisson Review V

**Metadata**

- ID: `BK3loJoBFQb71GZESjlg`
- URL: https://www.quantguide.io/questions/poisson-review-v
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: Wackerly
- Tags: Expected Value, Discrete Random Variables
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Gabe makes rugs. The number of imperfections follows a Poisson distribution with an average of 4 per square yard. It costs $10$ to repair each imperfection. Find the sum of the mean and variance of the repair cost for a 10-square-yard rug.

### Hint

What is the distribution of imperfections per $10$ square yards?

### 解答

Since there are an average of 4 imperfections per square yard, there are on average 40 imperfections per 10 square yards. Let $X \sim \text{Poisson}(40)$. We wish to compute $\mathbb{E}[10X] + \text{Var}(10X) = 10 \mathbb{E}[X] + 100 \text{Var}(X)$. Plugging in 40 for both $\mathbb{E}[X]$ and $\text{Var}(X)$, we find our answer to be $4400$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "4400"
    ],
    "companies": [],
    "difficulty": "easy",
    "id": "BK3loJoBFQb71GZESjlg",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 2154964,
    "source": "Wackerly",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Poisson Review V",
    "topic": "probability",
    "urlEnding": "poisson-review-v"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "BK3loJoBFQb71GZESjlg",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Poisson Review V",
    "topic": "probability",
    "urlEnding": "poisson-review-v"
  }
}
```
