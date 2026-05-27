# QuantGuide Question

## 988. Decreasing Uniform Chain

**Metadata**

- ID: `tDb2EF6nHPpPOnvP8mBt`
- URL: https://www.quantguide.io/questions/decreasing-uniform-chain
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: Five Rings
- Source: MSE
- Tags: Conditional Expectation, Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: 3
- Last Edited: 2023-10-17 13:16:51 America/New_York
- Last Edited By: Gabe

### 题干

Let $X_1,X_2,\dots \sim \text{Unif}(0,1)$ IID. Let $N$ be the first index $n$ where $X_n \neq \text{min}\{X_1,\dots, X_n\}$. Find $\mathbb{E}[X_{N-1}]$ i.e. the smallest value among the first $N$ values selected. The answer will be in the form $a + be$ for integers $a$ and $b$. Note here that $e$ is Euler's constant. Find $a + b$.

### Hint

Use Law of Total Expectation to condition on the next value. 

### 解答

Let $f(x)$ be the expected smallest number given that the current smallest is $x$. We want $f(1)$, as we are selecting uniform values on $(0,1)$, so our initial value is $1$. We don't choose a starting value higher than $1$ since we can't generate values larger than $1$.

$$$$

With probability $1-x$, the next value is larger than $x$, and our smallest value will be $x$. Otherwise, if our next value is $y<x$, $y$ is uniformly distributed on $(0,x)$, so the expected minimum in that case is $f(y)$. We integrate over all $0 < y < x$ since we are applying Law of Total Probability. Written as an equation, this is $$f(x) = x(1-x) + \displaystyle \int_0^x f(y)dy$$ Taking the derivative to convert into a differential equation, we get that $f'(x) = f(x) + (1-2x)$. Equivalently, $f'(x) - f(x) = 1-2x$. An initial condition for this differential equation is $f(0) = 0$, as we can't go any lower than $0$. 

$$$$

This is a linear first order differential equation, so we can use the method of integrating factors here. In particular, the integrating factor is $\mu(x) = e^{\int -1 dx} = e^{-x}$. Multiplying this on both sides, $(e^{-x}f(x))' = (1-2x)e^{-x}$, meaning $e^{-x}f(x) = \displaystyle \int e^{-x} - 2xe^{-x} dx= (2x+1)e^{-x} + C$. This means that $f(x) = 1+2x+ Ce^x$. Using our initial condition $f(0) = 0$, this immediately yields $C = -1$, so $f(x) = 1+2x - e^x$. In particular, $f(1) = 3-e$, so our answer is $3 - 1 =2$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2"
    ],
    "companies": [
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "tDb2EF6nHPpPOnvP8mBt",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-17 13:16:51 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8052492,
    "source": "MSE",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Decreasing Uniform Chain",
    "topic": "probability",
    "urlEnding": "decreasing-uniform-chain",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "hard",
    "id": "tDb2EF6nHPpPOnvP8mBt",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Decreasing Uniform Chain",
    "topic": "probability",
    "urlEnding": "decreasing-uniform-chain"
  }
}
```
