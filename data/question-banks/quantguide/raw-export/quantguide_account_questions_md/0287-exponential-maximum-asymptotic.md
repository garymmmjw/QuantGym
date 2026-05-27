# QuantGuide Question

## 287. Exponential Maximum Asymptotic

**Metadata**

- ID: `BstZp2Ve8XCWtc1IM7Zb`
- URL: https://www.quantguide.io/questions/exponential-maximum-asymptotic
- Topic: probability
- Difficulty: medium
- Internal Difficulty: N/A
- Companies: N/A
- Source: N/A
- Tags: Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Let $X_1,X_2,\dots$ be IID Exp$(1)$ random variables and $M_n = \text{max}\{X_1,\dots,X_n\}$. Define $p_n$ as $\mathbb{P}[M_n \leq \ln(n)]$. Evaluate $\displaystyle \lim_{n \rightarrow \infty} p_n$. Your answer should be in the form $\dfrac{b}{e}$, where $b$ is some constant and $e$ is Euler's constant. What is $b$?

### Hint

If the maximum is at most $\ln(n)$, what does that say about the value of each random variable? Furthermore, recall the limit $\displaystyle \lim_{n \rightarrow \infty} \left(1 + \dfrac{x}{n}\right)^n = e^x, \forall x \in \mathbb{R}$ .

### 解答

Let us compute this probability directly. $\mathbb{P}[M_n \leq \ln(n)] = \mathbb{P}[\text{max}\{X_1,\dots,X_n\} \leq \ln(n)]$ by definition. Then, the maximum being $\leq \ln(n)$ means each individual random variable is at most $\ln(n)$. This means the above is just $\mathbb{P}[X_1 \leq \ln(n),\dots, X_n \leq \ln(n)]$. By independence, we can split this up to obtain $\mathbb{P}[X_1 \leq \ln(n)]\dots \mathbb{P}[X_n \leq \ln(n)]$. Since all of the random variables are identically distributed, we can just take one of them and raise it to the $n$th power, so this is $\mathbb{P}[X_1\leq \ln(n)]^n$.

$$$$

$\mathbb{P}[X_1 \leq \ln(n)] = 1 - e^{-\ln(n)} = 1 - \dfrac{1}{n}$ by the CDF of the Exp$(1)$ distribution. Therefore, $\mathbb{P}[M_n \leq \ln(n)] = \left(1 - \dfrac{1}{n}\right)^n$. Recall from Calculus that for any real $x$, $\displaystyle \lim_{n \rightarrow \infty} \left(1 + \dfrac{x}{n}\right)^n = e^x$. This is just the exponential limit with $x = -1$, so our limit is $e^{-1} = \dfrac{1}{e}$. Therefore, $b = 1$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1"
    ],
    "difficulty": "medium",
    "id": "BstZp2Ve8XCWtc1IM7Zb",
    "internalDifficulty": 0,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 2217049,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Exponential Maximum Asymptotic",
    "topic": "probability",
    "urlEnding": "exponential-maximum-asymptotic"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "BstZp2Ve8XCWtc1IM7Zb",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Exponential Maximum Asymptotic",
    "topic": "probability",
    "urlEnding": "exponential-maximum-asymptotic"
  }
}
```
