# QuantGuide Question

## 544. Equicorrelated

**Metadata**

- ID: `j7VTsbQqsjem07KLhWTf`
- URL: https://www.quantguide.io/questions/equicorrelated
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: DE Shaw, WorldQuant, Jane Street, Squarepoint Capital
- Source: various
- Tags: Covariance
- Premium: True
- Solution Free: False
- Version: 5
- Last Edited: 2023-11-12 16:31:54 America/New_York
- Last Edited By: Gabe

### 题干

$$7$ random variables $X_1,\dots, X_7$ are all identically distributed with mean $0$ and variance $1$. However, they also all have the same pairwise correlation, say $\rho$. Find the minimum possible value of $\rho$. 

### Hint

Consider $\text{Var}(\overline{X})$, where $\overline{X} = \dfrac{X_1 + \dots + X_7}{7}$.

### 解答

We are going to consider $\text{Var}(\overline{X})$ here, where $\overline{X} = \dfrac{X_1 + \dots + X_7}{7}$. By plugging this in and using properties of variance, we see that $$\text{Var}(\overline{X}) = \dfrac{1}{49} \text{Var}(X_1 + \dots + X_7) = \dfrac{1}{49}\left[\displaystyle \sum_{i=1}^7 \text{Var}(X_i) + \sum_{i \neq j} \text{Cov}(X_i,X_j)\right]$$ Since we know the mean and variance of each of the random variables, we know that the first sum is just $7$. Similarly, we know that $\text{Cov}(X_i,X_j) = \rho(1)(1) = \rho$ and that there are $7 \cdot 6 = 42$ terms in that sum. Therefore, the second sum is just $42\rho$. Thus, $$\text{Var}(\overline{X}) = \dfrac{7 + 42\rho}{49}$$ Our condition is that $\text{Var}(\overline{X}) \geq 0$, as the variance of any random variable must be non-negative. Thus, we can disregard the denominator and find that $$7 + 42\rho \geq 0 \iff \rho \geq -\dfrac{1}{6}$$ Therefore, our answer is $-\dfrac{1}{6}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "-1/6"
    ],
    "companies": [
      {
        "company": "DE Shaw"
      },
      {
        "company": "WorldQuant"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "Squarepoint Capital"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "j7VTsbQqsjem07KLhWTf",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-12 16:31:54 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4347948,
    "source": "various",
    "status": "published",
    "tags": [
      {
        "tag": "Covariance"
      }
    ],
    "title": "Equicorrelated",
    "topic": "probability",
    "urlEnding": "equicorrelated",
    "version": 5
  },
  "list_summary": {
    "companies": [
      {
        "company": "DE Shaw"
      },
      {
        "company": "WorldQuant"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "Squarepoint Capital"
      }
    ],
    "difficulty": "medium",
    "id": "j7VTsbQqsjem07KLhWTf",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Covariance"
      }
    ],
    "title": "Equicorrelated",
    "topic": "probability",
    "urlEnding": "equicorrelated"
  }
}
```
