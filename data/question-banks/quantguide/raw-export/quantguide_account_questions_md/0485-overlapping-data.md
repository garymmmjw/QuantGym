# QuantGuide Question

## 485. Overlapping Data

**Metadata**

- ID: `8EIDJbLvRklkWaxFNMrn`
- URL: https://www.quantguide.io/questions/overlapping-data
- Topic: statistics
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Covariance/Correlation
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-3 09:22:39 America/New_York
- Last Edited By: Gabe

### 题干

Suppose that $X_1,\dots, X_{150}$ are all IID random variables with variance $1$. Define $U = 3(X_1 + \dots X_{50}) + X_{51} + \dots+  X_{100}$ and $V = X_{51} + \dots + X_{100} + 3(X_{101} + \dots X_{150})$. Find Corr$(U,V)$.

### Hint

Find Cov$(U,V)$ using the bilinearity of covariance and the fact that $X_1,\dots, X_{150}$ are independent.

### 解答

Let us first compute Cov$(U,V)$. We know that Cov$(U,V) = \text{Cov}(3X_1 + \dots + 3X_{50} + X_{51} + \dots + X_{100}, X_{51} + \dots + X_{100} + 3X_{101} + \dots + 3X_{150})$. Since the $X_i$ random variables are IID, this means that the only time the covariances are not $0$ is when we are looking at the pairs of random variables that are in both $U$ and $V$. Namely, these are $X_{51},\dots,X_{100}$. Therefore, Cov$(U,V) = \text{Cov}(X_{51},X_{51}) + \dots + \text{Cov}(X_{100},X_{100}) = \text{Var}(X_{51}) + \dots + \text{Var}(X_{100}) = 50$ by the information in the question. 

$$$$

To get Corr$(U,V)$, we need the variances of both $U$ and $V$. By the symmetry of $U$ and $V$ (they have the same overlapping random variables and there are factors of 3 for the same number of non-overlapping random variables), $\text{Var}(U) = \text{Var}(V)$. Therefore, $$\text{Var}(U) = \text{Var}(3X_1 + \dots + 3X_{50} + X_{51} + \dots + X_{100}) = 3^2\text{Var}(X_1) + \dots + 3^2\text{Var}(X_{50}) + \text{Var}(X_{51}) + \dots + \text{Var}(X_{100}) = 500$$.

$$$$

Lastly, Corr$(U,V) = \dfrac{\text{Cov}(U,V)}{\sqrt{\text{Var}(U)\text{Var}(V)}} = \dfrac{50}{500} = \dfrac{1}{10}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/10"
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "8EIDJbLvRklkWaxFNMrn",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-3 09:22:39 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3860532,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Covariance/Correlation"
      }
    ],
    "title": "Overlapping Data",
    "topic": "statistics",
    "urlEnding": "overlapping-data",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "8EIDJbLvRklkWaxFNMrn",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Covariance/Correlation"
      }
    ],
    "title": "Overlapping Data",
    "topic": "statistics",
    "urlEnding": "overlapping-data"
  }
}
```
