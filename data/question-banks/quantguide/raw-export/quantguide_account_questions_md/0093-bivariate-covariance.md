# QuantGuide Question

## 93. Bivariate Covariance

**Metadata**

- ID: `wGjzSAK1wfIKAERNlYNK`
- URL: https://www.quantguide.io/questions/bivariate-covariance
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: https://math.stackexchange.com/questions/3705032/covariance-of-x-and-y2-when-x-y-follow-n0-1?noredirect=1&lq=1
- Tags: Continuous Random Variables, Covariance
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Let $(X,Y)$ follow a Bivariate Normal distribution with $X$ and $Y$ marginally standard normal and $\text{Corr}(X,Y) = \rho$. Compute 
 $\text{Cov}(X,Y^2)$.

### Hint

If $Z_1, Z_2 \sim N(0,1)$ IID, we know that the joint transformation that would yield $(X,Y)$ is $X = Z_1$, $Y = \rho Z_1 + \sqrt{1-\rho^2}Z_2$. 

### 解答

If $Z_1, Z_2 \sim N(0,1)$ IID, we know that the joint transformation that would yield $(X,Y)$ is $X = Z_1$, $Y = \rho Z_1 + \sqrt{1-\rho^2}Z_2$. Therefore, $\text{Cov}(X,Y^2) = \mathbb{E}[XY^2] - \mathbb{E}[X]\mathbb{E}[Y^2]$. As we know that $X \sim N(0,1)$ marginally, $\mathbb{E}[X] = 0$. Therefore, we have to compute the first term. Substituting in, we get

$$$$

$$\mathbb{E}[XY^2] = \mathbb{E}[Z_1(\rho Z_1 + \sqrt{1-\rho^2}Z_2)^2] = \mathbb{E}[Z_1(Z_1^2 + 2\rho\sqrt{1-\rho^2} Z_1Z_2 + (1-\rho^2)Z_2^2)]$$ By distributing through the $Z_1$ and applying linearity of expectation, we get that the above is $$\mathbb{E}[Z_1^3] + 2\rho\sqrt{1-\rho^2}\mathbb{E}[Z_1^2Z_2] + (1-\rho^2)\mathbb{E}[Z_1Z_2^2]$$ Using the independence of $Z_1$ and $Z_2$ and the fact that all odd moments of the standard normal distribution are $0$, all of the above cancels and the answer is $0$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0"
    ],
    "companies": [],
    "difficulty": "medium",
    "id": "wGjzSAK1wfIKAERNlYNK",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 677192,
    "source": "https://math.stackexchange.com/questions/3705032/covariance-of-x-and-y2-when-x-y-follow-n0-1?noredirect=1&lq=1",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Covariance"
      }
    ],
    "title": "Bivariate Covariance",
    "topic": "probability",
    "urlEnding": "bivariate-covariance"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "wGjzSAK1wfIKAERNlYNK",
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
    "title": "Bivariate Covariance",
    "topic": "probability",
    "urlEnding": "bivariate-covariance"
  }
}
```
