# QuantGuide Question

## 910. Mean Difference

**Metadata**

- ID: `bBHmm78FjfeP0qDWxTJI`
- URL: https://www.quantguide.io/questions/mean-difference
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: original
- Tags: Covariance, Expected Value
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-27 18:19:52 America/New_York
- Last Edited By: Gabe

### 题干

Suppose that $X_1, \dots, X_{10}$ are independent random variables such that $\mu_i = \mathbb{E}[X_i] = 2i-1$ and $\text{Var}(X_i) = 100$ AKA there is a common variance $100$ but not a common mean. Define $\overline{\mu} = \dfrac{1}{10}\displaystyle \sum_{i=1}^{10} \mu_i$. Compute $\mathbb{E}[(X_1 - \overline{X})^2]$.

### Hint

Consider $\text{Var}(X_1 - \overline{X})$ and using bilinearity of covariance.

### 解答

We are going to generalize this to any $\mu_i$ and any number $n$. Using our known relationship between the second moment and variance, we should think to consider $\text{Var}(X_1 - \overline{X})$. We will also generalize to consider any $X_i$ instead of just $X_1$. We know that $$\text{Var}(X_i - \overline{X}) = \mathbb{E}[(X_i - \overline{X})^2] - (\mathbb{E}[X_i - \overline{X}])^2$$ Note that by linearity of expectation, the second term is just $(\mu_i - \overline{\mu})^2$. For $\text{Var}(X_i - \overline{X})$, we know that by the generalized formula for variance, this is $$\text{Var}(X_i) + \text{Var}(\overline{X}) - 2\text{Cov}(X_i,\overline{X})$$ The first two terms are $\sigma^2$ and $\dfrac{\sigma^2}{n}$, respectively. This is from our known facts about sample variance. The final term we can get easily by bilinearity of Covariance. $$\text{Cov}(X_i,\overline{X}) = \dfrac{2}{n}\text{Cov}(X_i,X_1 + X_2 + \dots + X_i + \dots + X_n) = \dfrac{2}{n}\left(\text{Cov}(X_i, X_1) + \dots + \text{Cov}(X_i,X_i) + \dots + \text{Cov}(X_i,X_n)\right)$$ Note that for all $j \neq i$, $\text{Cov}(X_i,X_j) = 0$, as the RVs are independent. The only remaining term, $\text{Cov}(X_i,X_i) = \text{Var}(X_i) = \sigma^2$ by definition. Thus, we have that $\text{Var}(X_i - \overline{X}) = \dfrac{n-1}{n}\sigma^2$, and thus we have that $\mathbb{E}[(X_i - \overline{X})^2] = (\mu_i - \overline{\mu})^2 + \dfrac{n-1}{n}\sigma^2$.

$$$$

Plugging in $\mu_1 = 1$, $\overline{\mu} = \dfrac{1+3+5+\dots + 19}{10} = 10, n = 10$, and $\sigma^2 = 100$, our final answer is $171$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "171"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "bBHmm78FjfeP0qDWxTJI",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-27 18:19:52 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7462057,
    "source": "original",
    "status": "published",
    "tags": [
      {
        "tag": "Covariance"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Mean Difference",
    "topic": "probability",
    "urlEnding": "mean-difference",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "bBHmm78FjfeP0qDWxTJI",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Covariance"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Mean Difference",
    "topic": "probability",
    "urlEnding": "mean-difference"
  }
}
```
