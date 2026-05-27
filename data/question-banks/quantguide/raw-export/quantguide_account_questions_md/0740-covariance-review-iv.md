# QuantGuide Question

## 740. Covariance Review IV

**Metadata**

- ID: `w6DYTOVcfa3HjtQNjl5c`
- URL: https://www.quantguide.io/questions/covariance-review-iv
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: Wackerly 5.110
- Tags: Covariance
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

$$X_1$ and $X_2$ have a correlation coefficient $\rho_{X_1, X_2} = 0.2$. $Y_1 = 1 + 2X_1$, and $Y_2 = 3 - 4X_2$. Compute $\rho_{Y_1, Y_2}$, the correlation coefficient for $Y_1$ and $Y_2$. 

### Hint

Correlation is a scale-invariant measurement of linear association.

### 解答

We will present two solutions: one using just the basic definition of covariance, and another using properties of covariance of linear combinations of random variables. 


Recall 
\[\begin{aligned}
\text{Cov}(Y_1, Y_2) &= \mathbb{E}[Y_1 Y_2] - \mathbb{E}[Y_1] \mathbb{E}[Y_2]
\end{aligned}\]
and 
\[\begin{aligned}
\rho_{Y_1, Y_2} &= \frac{\text{Cov}(Y_1, Y_2)}{\sigma_{Y_1} \sigma_{Y_2}}. 
\end{aligned}\]
Then, 
\[\begin{aligned}
\text{Cov}(Y_1, Y_2) &= \mathbb{E}[(1 + 2X_1) (3 - 4X_2)] - \mathbb{E}[1 + 2X_1] \mathbb{E}[3 - 4X_2] \\
&= \mathbb{E}[3] + 6\mathbb{E}[X_1] - 4 \mathbb{E}[X_2] - 8 \mathbb{E}[X_1 X_2] - (1 + 2\mathbb{E}[X_1)(3 - 4\mathbb{E}[X_2]) \\
&= 3 + 6\mathbb{E}[X_1] - 4 \mathbb{E}[X_2] - 8 \mathbb{E}[X_1 X_2] - 3 - 6\mathbb{E}[X_1] +  4 \mathbb{E}[X_2] + 8 \mathbb{E}[X_1] \mathbb{E}[X_2] - 8 \mathbb{E}[X_1 X_2]\\
&= 8 \mathbb{E}[X_1] \mathbb{E}[X_2] \\
&= -8 \text{Cov}(X_1, X_2)
\end{aligned}\]
Additionally, 
\[\begin{aligned}
\text{Var}[Y_1] &= \text{Var}[1 + 2X_1] \\
&= 4 \text{Var}[X_1] \\
\Rightarrow \sigma_{Y_1} &= 2 \sigma_{X_1} \\
\text{Var}[Y_2] &= \text{Var}[3 - 4X_2] \\
&= 16 \text{Var}[X_2] \\
\Rightarrow \sigma_{Y_1} &= 4 \sigma_{X_2} \\
\end{aligned}\]
We conclude,
\[\begin{aligned}
\rho_{Y_1, Y_2} &= \frac{\text{Cov}(Y_1, Y_2)}{\sigma_{Y_1} \sigma_{Y_2}} \\
&= \frac{-8 \text{Cov}(X_1, X_2)}{8\sigma_{X_1}\sigma_{X_2}} \\
&= - \rho_{X_1, X_2} \\
&= -0.2.
\end{aligned}\]

Another possible solution utilizes the following two properties of covariance:
\[\begin{aligned}
\text{Cov}\left(\sum_{i = 1}^m a_iX_i, \sum_{j = 1}^n b_jY_j\right) &= \sum_{i = 1}^n \sum_{j = 1}^m a_ib_j \text{Cov}(X_i, Y_j), \\
\text{Cov}(c, X) &= 0.
\end{aligned}\]
Substituting appropriately, we find
\[\begin{aligned}
\text{Cov}\left(1 + 2X_1, 3 - 4X_2 \right) &= -8 \text{Cov}\left(X_1, X_2 \right).
\end{aligned}\]
We proceed from here in a similar manner as in the first solution. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "-0.2"
    ],
    "difficulty": "easy",
    "id": "w6DYTOVcfa3HjtQNjl5c",
    "internalDifficulty": "1",
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 6059552,
    "source": "Wackerly 5.110",
    "status": "published",
    "tags": [
      {
        "tag": "Covariance"
      }
    ],
    "title": "Covariance Review IV",
    "topic": "probability",
    "urlEnding": "covariance-review-iv"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "w6DYTOVcfa3HjtQNjl5c",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Covariance"
      }
    ],
    "title": "Covariance Review IV",
    "topic": "probability",
    "urlEnding": "covariance-review-iv"
  }
}
```
