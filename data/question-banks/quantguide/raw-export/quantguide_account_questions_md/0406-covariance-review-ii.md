# QuantGuide Question

## 406. Covariance Review II

**Metadata**

- ID: `o5wKyO8J9iNJdBp2eD2F`
- URL: https://www.quantguide.io/questions/covariance-review-ii
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Akuna
- Source: Wackerly 5.97
- Tags: Covariance
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-25 20:07:18 America/New_York
- Last Edited By: Gabe

### 题干

You are given the following information:
\[\begin{aligned}
\mathbb{E}[X_1] &= -3 \\ 
\mathbb{E}[X_2] &= 7 \\ 
\text{Var}[X_1] &= 24 \\ 
\text{Var}[X_2] &= 6 \\ 
\end{aligned}\]
Compute the maximum possible value for $\text{Cov}(X_1, X_2)$. 

### Hint

You are given the following information:
\[\begin{aligned}
\mathbb{E}[X_1] &= -3 \\ 
\mathbb{E}[X_2] &= 7 \\ 
\text{Var}[X_1] &= 24 \\ 
\text{Var}[X_1] &= 6 \\ 
\end{aligned}\]
Compute the maximum possible value for $\text{Cov}(X_1, X_2)$. 

### 解答

The correlation coefficient $\rho$ is defined as
\[\begin{aligned}
\rho &= \frac{\text{Cov}(X_1, X_2)}{\sigma_1 \sigma_2}, \text{ where} \\
\sigma_1^2 &= \text{Var}(X_1) \text{ and } \\
\sigma_2^2 &= \text{Var}(X_2). 
\end{aligned}\]
The correlation coefficient must satisfy $-1 \leq \rho \leq 1$. 
\[\begin{aligned}
-1 &\leq \frac{\text{Cov}(X_1, X_2)}{\sigma_1 \sigma_2} \leq 1 \\
-1 &\leq \frac{\text{Cov}(X_1, X_2)}{12} \leq 1 \\
-12 &\leq \text{Cov}(X_1, X_2) \leq 12
\end{aligned}\]
The maximum possible value for $\text{Cov}(X_1, X_2)$ is $12$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "12"
    ],
    "companies": [
      {
        "company": "Akuna"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "o5wKyO8J9iNJdBp2eD2F",
    "internalDifficulty": "1",
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-25 20:07:18 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3196097,
    "source": "Wackerly 5.97",
    "status": "published",
    "tags": [
      {
        "tag": "Covariance"
      }
    ],
    "title": "Covariance Review II",
    "topic": "probability",
    "urlEnding": "covariance-review-ii"
  },
  "list_summary": {
    "companies": [
      {
        "company": "Akuna"
      }
    ],
    "difficulty": "easy",
    "id": "o5wKyO8J9iNJdBp2eD2F",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Covariance"
      }
    ],
    "title": "Covariance Review II",
    "topic": "probability",
    "urlEnding": "covariance-review-ii"
  }
}
```
