# QuantGuide Question

## 1003. Diverse Distributions

**Metadata**

- ID: `xiq9cwqN7NlZp8w7qkHO`
- URL: https://www.quantguide.io/questions/diverse-distributions
- Topic: statistics
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Let $X \sim \text{Unif}(0,\lambda)$ and $Y \sim \text{Exp}(\lambda)$, where $\lambda > 0$ is a constant. For what value of $\lambda$ do $X$ and $Y$ have the same mean? Find $\lambda^2$

### Hint

The mean of a Unif$(a,b)$ random variable is $\dfrac{a+b}{2}$ and the mean of an Exp$(a)$ random variable is $\dfrac{1}{a}$.

### 解答

We have that $\mathbb{E}[X] = \dfrac{1}{\lambda}$ for an Exp$(\lambda)$ RV and $\mathbb{E}[Y] = \dfrac{\lambda}{2}$ for the Unif$(0,\lambda)$ RV. Thus, we need to solve $\dfrac{1}{\lambda} = \dfrac{\lambda}{2}$, which is just $\lambda^2 = 2$, or that $\lambda = \sqrt{2}$, since $\lambda > 0$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2"
    ],
    "difficulty": "easy",
    "id": "xiq9cwqN7NlZp8w7qkHO",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 8175721,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Diverse Distributions",
    "topic": "statistics",
    "urlEnding": "diverse-distributions"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "xiq9cwqN7NlZp8w7qkHO",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Diverse Distributions",
    "topic": "statistics",
    "urlEnding": "diverse-distributions"
  }
}
```
