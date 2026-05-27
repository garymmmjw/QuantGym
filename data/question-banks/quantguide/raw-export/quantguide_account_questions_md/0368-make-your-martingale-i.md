# QuantGuide Question

## 368. Make Your Martingale I

**Metadata**

- ID: `cp4OfZnqyzeulJg27nn6`
- URL: https://www.quantguide.io/questions/make-your-martingale-i
- Topic: pure math
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: JHU Stoch Calc
- Tags: Stochastic Processes
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Let $X_1,X_2,\dots$ be IID random variables that take the values $\pm 1$ with equal probability. Fix a constant $c$. Let $M_0 = 1$ and $M_n = M_{n-1}e^{X_n + c}$. There is a unique value of $c$ such that $M_n$ is a martingale with respect to the natural filtration $\mathcal{F}_n = \sigma(X_1,\dots,X_n)$. Find $c$. The answer will be in the form $-\log\left(ae^b + ce^d\right)$ for integers $a,b,c,d$. $\log$ here refers to the natural logarithm. Find $a + b + c + d$.

### Hint

Compute $\mathbb{E}[M_{n+1} \mid M_n]$ as a function of $c$. Afterwards, find the value of $c$ so that the conditional expectation is $M_n$.

### 解答

Our goal is to compute $\mathbb{E}[M_{n+1} \mid M_n]$ as a function of $c$. Afterwards, we must find the value of $c$ so that the conditional expectation is $M_n$. Doing this, $\mathbb{E}[M_{n+1} \mid M_n] = \mathbb{E}\left[M_n e^{X_{n_1} + c} \mid M_n\right] = M_ne^c \mathbb{E}[e^{X_{n+1}} \mid M_n]$ by taking out constants and what is known. Note that $X_{n+1}$ is independent of $M_n$, so $\mathbb{E}[e^{X_{n+1}} \mid M_n] = \mathbb{E}[e^{X_{n+1}}]$. The computation of this is quite simple as $X_{n+1}$ only takes two values, so $$\mathbb{E}[e^{X_{n+1}}] = e \cdot \dfrac{1}{2} + e^{-1} \cdot \dfrac{1}{2}$$ Therefore, $\mathbb{E}[M_{n+1} \mid M_n] = M_n e^c \cdot \dfrac{e + e^{-1}}{2}$. 

$$$$

To make $M_n$ a martingale, we need all the constants to simplify to $1$. Namely, this means $e^c = \dfrac{2}{e + e^{-1}}$. Therefore, $c = \log\left(\dfrac{2}{e + e^{-1}}\right) = -\log\left(\dfrac{1}{2}e + \dfrac{1}{2}e^{-1}\right)$. For our question, the answer is $a + b + c + d = \dfrac{1}{2} + \dfrac{1}{2} + 1 - 1 = 1$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1"
    ],
    "companies": [],
    "difficulty": "easy",
    "id": "cp4OfZnqyzeulJg27nn6",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 2856291,
    "source": "JHU Stoch Calc",
    "status": "published",
    "tags": [
      {
        "tag": "Stochastic Processes"
      }
    ],
    "title": "Make Your Martingale I",
    "topic": "pure math",
    "urlEnding": "make-your-martingale-i"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "cp4OfZnqyzeulJg27nn6",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Stochastic Processes"
      }
    ],
    "title": "Make Your Martingale I",
    "topic": "pure math",
    "urlEnding": "make-your-martingale-i"
  }
}
```
