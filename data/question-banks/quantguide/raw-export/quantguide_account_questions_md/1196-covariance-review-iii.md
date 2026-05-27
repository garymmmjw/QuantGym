# QuantGuide Question

## 1196. Covariance Review III

**Metadata**

- ID: `RtlJApgcxNu9NzvvEcin`
- URL: https://www.quantguide.io/questions/covariance-review-iii
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: Wackerly 5.100
- Tags: Continuous Random Variables, Covariance
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

$$Z \sim \mathcal{N}(0, 1), X = Z, Y = Z^2$. Compute $\text{Cov}(X, Y)$.

### Hint

All odd moments of $Z$ are $0$.

### 解答

Recall 
\[\begin{aligned}
\text{Cov}(X, Y) &= \mathbb{E}[XY] - \mathbb{E}[X] \mathbb{E}[Y].
\end{aligned}\]
Let's begin with $\mathbb{E}[XY]$. We have
\[\begin{aligned}
\mathbb{E}[XY] &= \mathbb{E}[Z^3] \\
&= \int_\mathbb{R} \frac{z^3}{\sqrt{2 \pi}}e^{-z^2/2} \, dz
\end{aligned}\]
Note that we may avoid this tedious computation. For each value of $z$ such that $z> 0$, $f_Z(z) = f_Z(-z)$, since the standard normal is symmetric about $z = 0$. More informally, all positive values of $z$ plugged into the even function $\frac{z^3}{\sqrt{2 \pi}}e^{-z^2/2}$ should cancel out with all negative values of $z$ plugged into the same even function, leaving us with $\mathbb{E}[XY] = 0$. $$$$

Next, we know that $\mathbb{E}[X] = \mathbb{E}[Z] = 0$. Finally, we need to compute $\mathbb{E}[Y] = \mathbb{E}[Z^2]$. We can again avoid a tedious integral by utilizing what we know about the variance. 
\[\begin{aligned}
\text{Var}(Z) &= 1 \\
\mathbb{E}[Z^2] - (\mathbb{E}[Z])^2 &= 1 \\
\mathbb{E}[Z^2] - 0 &= 1 \\
\mathbb{E}[Z^2] &= 1. 
\end{aligned}\]
Our final step is to plug everything into our covariance expression. 
\[\begin{aligned}
\text{Cov}(X, Y) &= \mathbb{E}[XY] - \mathbb{E}[X] \mathbb{E}[Y] \\
&= 0 - (-1) \cdot 0 \\
&= 0
\end{aligned}\]
It is important to note that if $\text{Cov}(X, Y) = 0$, then it is not necessarily the case that $X$ and $Y$ are independent. Recall that the rule ``If $X$ and $Y$ are independent, then $\text{Cov}(X, Y) = 0$'' is not an if-and-only-if statement. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0"
    ],
    "difficulty": "easy",
    "id": "RtlJApgcxNu9NzvvEcin",
    "internalDifficulty": "1",
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 9932993,
    "source": "Wackerly 5.100",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Covariance"
      }
    ],
    "title": "Covariance Review III",
    "topic": "probability",
    "urlEnding": "covariance-review-iii"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "RtlJApgcxNu9NzvvEcin",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Covariance"
      }
    ],
    "title": "Covariance Review III",
    "topic": "probability",
    "urlEnding": "covariance-review-iii"
  }
}
```
