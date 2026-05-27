# QuantGuide Question

## 1059. Poisson Process Covariance

**Metadata**

- ID: `T4if1SFXJW8y7d96iPVF`
- URL: https://www.quantguide.io/questions/poisson-process-covariance
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: common question
- Tags: Expected Value
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Let $N(t)$ be a Poisson Process with rate $5$. Compute $\text{Cov}(N(5),N(15))$.

### Hint

Use the independent increments property and write $N(15) = (N(15) - N(5)) + N(5)$.

### 解答

By the definition of covariance, $\text{Cov}(N(5),N(15)) = \mathbb{E}[N(5)N(15)] - \mathbb{E}[N(5)]\mathbb{E}[N(15)]$. We know that $N(t) \sim \text{Poisson}(\lambda t)$, so $\mathbb{E}[N(5)] = 25$ and $\mathbb{E}[N(15)] = 75$. Then, the trick for the first term is to use independent increments, so we write $N(15) = (N(15) - N(5)) + N(5)$, meaning $$\mathbb{E}[N(5)N(15)] = \mathbb{E}[N(5)(N(5) + (N(15) - N(5))] = \mathbb{E}[(N(5))^2] + \mathbb{E}[N(5)(N(15) - N(5))]$$ The first term can be written as $\text{Var}(N(5)) + (\mathbb{E}[N(5)])^2 = 25 + 25^2 = 650$. The second term can be written as $\mathbb{E}[N(5)]\mathbb{E}[N(15) - N(5)] = 25 \cdot (75 - 25)  = 1250$ by independent increments. Therefore, our answer is $650 + 1250 - 1875 = 25$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "25"
    ],
    "companies": [],
    "difficulty": "easy",
    "id": "T4if1SFXJW8y7d96iPVF",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 8620743,
    "source": "common question",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Poisson Process Covariance",
    "topic": "probability",
    "urlEnding": "poisson-process-covariance"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "T4if1SFXJW8y7d96iPVF",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Poisson Process Covariance",
    "topic": "probability",
    "urlEnding": "poisson-process-covariance"
  }
}
```
