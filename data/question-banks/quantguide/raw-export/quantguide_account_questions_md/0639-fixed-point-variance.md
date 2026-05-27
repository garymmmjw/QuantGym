# QuantGuide Question

## 639. Fixed Point Variance

**Metadata**

- ID: `xqE0AF4WFcDdcn96qkUn`
- URL: https://www.quantguide.io/questions/fixed-point-variance
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: WorldQuant
- Source: WorldQuant Glassdoor
- Tags: Expected Value, Conditional Probability, Combinatorics
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 13:31:43 America/New_York
- Last Edited By: Gabe

### 题干

Consider a uniformly random permutation of $(1,2,\dots,1000)$. Let $X$ be the number of fixed points and $Y$ be the number of non-fixed points. Compute $\text{Var}(X-Y)$.

### Hint

Note that $Y = 1000 - X$, as $X + Y = 1000$ always. Therefore, $\text{Var}(X-Y) = \text{Var}(1000 + 2X) = 4\text{Var}(X)$. It now remains to compute $\text{Var}(X)$. Note that $X = X_1 + \dots + X_{1000}$, where $X_i$ is the indicator of whether or not $i$ is fixed.

### 解答

Note that $Y = 1000 - X$, as $X + Y = 1000$ always. Therefore, $\text{Var}(X-Y) = \text{Var}(1000 + 2X) = 4\text{Var}(X)$. It now remains to compute $\text{Var}(X)$. Note that $X = X_1 + \dots + X_{1000}$, where $X_i$ is the indicator of whether or not $i$ is fixed. Then $\mathbb{E}[X] = 1000\mathbb{E}[X_1]$ by exchangeability. $\mathbb{E}[X_1]$ is just the probability $1$ is fixed, which is $\dfrac{1}{1000}$, as it is equally likely to end in any of the $1000$ spots. 

$$$$

To compute $\mathbb{E}[X^2]$, we expand out the sum squared. Namely, $$\mathbb{E}[X^2] = \mathbb{E}[(X_1 + \dots + X_{1000})^2] = \sum_{i=1}^{1000} \mathbb{E}[X_i^2] + \sum_{i \neq j} \mathbb{E}[X_iX_j]$$ The first term is where $i = j$ and the second term is where $i \neq j$. Note that $X_i^2 = X_i$, as $X_i$ only takes the values $0$ and $1$, so $\mathbb{E}[X_i^2] = \dfrac{1}{1000}$. 

$$$$

For the second sum, as the $X_i$ random variables are exchangeable, for any $i \neq j$, $\mathbb{E}[X_iX_j] = \mathbb{E}[X_1X_2]$. This expectation is just the probability both $1$ and $2$ are fixed. This probability is just $\dfrac{1}{1000} \cdot \dfrac{1}{999}$, as once $1$ is fixed, $2$ goes into spot $2$ with probability $\dfrac{1}{999}$. Therefore, $\mathbb{E}[X_1X_2] = \dfrac{1}{1000} \cdot \dfrac{1}{999}$. 

$$$$

There are $1000$ terms in the first sum, while there are $1000^2 - 1000 = 1000(1000 - 1) = 1000 \cdot 999$ terms in the second sum. Therefore, we have that $$\mathbb{E}[X^2] = 1000 \cdot \dfrac{1}{1000} + 1000 \cdot 999 \cdot \dfrac{1}{1000} \cdot \dfrac{1}{999} = 2$$

We thus have that $\mathbb{E}[X^2] = 2 - 1^2 = 1$, so $\text{Var}(X-Y) = 4(1) = 4$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "4"
    ],
    "companies": [
      {
        "company": "WorldQuant"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "xqE0AF4WFcDdcn96qkUn",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 13:31:43 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5090335,
    "randomizable": "",
    "source": "WorldQuant Glassdoor",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Fixed Point Variance",
    "topic": "probability",
    "urlEnding": "fixed-point-variance"
  },
  "list_summary": {
    "companies": [
      {
        "company": "WorldQuant"
      }
    ],
    "difficulty": "hard",
    "id": "xqE0AF4WFcDdcn96qkUn",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Fixed Point Variance",
    "topic": "probability",
    "urlEnding": "fixed-point-variance"
  }
}
```
