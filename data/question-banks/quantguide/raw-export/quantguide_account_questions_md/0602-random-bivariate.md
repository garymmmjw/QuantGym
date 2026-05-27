# QuantGuide Question

## 602. Random Bivariate

**Metadata**

- ID: `bwZerBdmbNErr3WGvCVw`
- URL: https://www.quantguide.io/questions/random-bivariate
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: original
- Tags: Expected Value, Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Suppose that $M$ and $S$ are IID Exp$(1)$ random variables. Given that $M = \mu$ and $S = \sigma$, $(X,Y) \sim \text{BVN}(\mu,\mu,\sigma^2,\sigma^2,\rho)$, where $|\rho| \leq 1$ is fixed. Compute $\text{Var}(Y)$.

### Hint

Write down the transform that yields the bivariate normal distribution and then use Law of Total Variance.

### 解答

We know that $Y = M + S(\rho Z_1 + \sqrt{1-\rho^2}Z_2)$, where $Z_1$ and $Z_2$ are IID $N(0,1)$. This is the definition of the transform that yields a bivariate normal pair. We have then that $\text{Var}(Y) = \text{Var}(M + S(\rho Z_1 + \sqrt{1-\rho^2}Z_2) = \text{Var}(M) + \text{Var}(S(\rho Z_1 + \sqrt{1-\rho^2}Z_2))$. This is because the two terms are independent. 

$$$$

$\text{Var}(M) = 1$ by known formulas of the Exp$(1)$ distribution. By the Law of Total Variance, $$\text{Var}(S(\rho Z_1 + \sqrt{1-\rho^2} Z_2)) = \mathbb{E}[\text{Var}(S(\rho Z_1 + \sqrt{1-\rho^2} Z_2) \mid S)] + \text{Var}(\mathbb{E}[S(\rho Z_1 + \sqrt{1-\rho^2} Z_2) \mid S])$$ The second term is just $0$ because $\mathbb{E}[S(\rho Z_1 + \sqrt{1-\rho^2} Z_2) \mid S] = S\mathbb{E}[\rho Z_1 + \sqrt{1-\rho^2}Z_2] = 0$ by the fact $Z_1, Z_2 \sim N(0,1)$. The first term is $\mathbb{E}[S^2]$, as $$\text{Var}(S(\rho Z_1 + \sqrt{1-\rho^2} Z_2) \mid S) = S^2(\text{Var}(\rho Z_1) + \text{Var}(\sqrt{1-\rho^2} Z_2)) = S^2$$ Thus, $\mathbb{E}[S^2] = 2$ by known formulas, so our answer is $\text{Var}(Y) = 3$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3"
    ],
    "difficulty": "medium",
    "id": "bwZerBdmbNErr3WGvCVw",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 4784038,
    "source": "original",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Random Bivariate",
    "topic": "probability",
    "urlEnding": "random-bivariate"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "bwZerBdmbNErr3WGvCVw",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Random Bivariate",
    "topic": "probability",
    "urlEnding": "random-bivariate"
  }
}
```
