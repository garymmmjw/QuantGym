# QuantGuide Question

## 412. Increasing Uniform Chain I

**Metadata**

- ID: `g3HMWQe5Fag0CSKzdtIq`
- URL: https://www.quantguide.io/questions/increasing-uniform-chain
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: Five Rings
- Source: og
- Tags: Conditional Probability, Continuous Random Variables
- Premium: True
- Solution Free: False
- Version: 2
- Last Edited: 2023-10-27 17:06:15 America/New_York
- Last Edited By: Gabe

### 题干

Let $X_1,X_2,\dots \sim \text{Unif}(0,1)$ IID. Let $N$ be the first index $n$ where $X_n \neq \text{max}\{X_1,\dots, X_n\}$. Find $\mathbb{E}[X_{N-1}]$ i.e. the largest value among the first $N$ values selected. The answer will be in the form $a + be$ for integers $a$ and $b$. Note here that $e$ is Euler's constant. Find $a + b$.

### Hint

Use Law of Total Probability to condition on the next value.

### 解答

Let $f(x)$ be the expected largest number given that the current largest is $x$. We want $f(0)$, as we are selecting uniform values on $(0,1)$, so our initial largest value is $0$. We don't choose a starting value lower than $0$ since we can't generate values lower than $0$.

$$$$

With probability $x$, the next value is smaller than $x$, and our largest value will be $x$. Otherwise, if our next value is $y>x$, $y$ is uniformly distributed on $(x,1)$, so the expected maximum in that case is $f(y)$. We integrate over all $x < y < 1$ since we are applying Law of Total Probability. Written as an equation, this is $$f(x) = x^2 + \displaystyle \int_x^1 f(y)dy$$ Taking the derivative to convert into a differential equation, we get that $f'(x) = 2x - f(x)$. Equivalently, $f'(x) + f(x) = 2x$. An initial condition for this differential equation is $f(1) = 1$, as we can't go any higher than $1$. 

$$$$

This is a linear first order differential equation, so we can use the method of integrating factors here. In particular, the integrating factor is $\mu(x) = e^{\int 1 dx} = e^{x}$. Multiplying this on both sides, $(e^{x}f(x))' = 2xe^{x}$, meaning $e^{x}f(x) = \displaystyle \int 2xe^{x}dx = 2e^x(x-1) + C$. This means that $f(x) = 2x  - 2+ Ce^{-x}$. Using our initial condition $f(1) = 1$, this yields $C = e$, so $f(x) = 2(x-1) + e^{1-x}$. In particular, $f(0) = e-2$, so our answer is $1 - 2 =-1$.

$$$$

For a sanity check, we can note that the answer to this question and the answer to Decreasing Uniform Chain sum to $1$. This makes perfect sense. If $X_i \sim \text{Unif}(0,1)$, then $1 - X_i \sim \text{Unif}(0,1)$, so there is a symmetry between the two problems.


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "-1"
    ],
    "companies": [
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "g3HMWQe5Fag0CSKzdtIq",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-27 17:06:15 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3235289,
    "source": "og",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Increasing Uniform Chain I",
    "topic": "probability",
    "urlEnding": "increasing-uniform-chain",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "hard",
    "id": "g3HMWQe5Fag0CSKzdtIq",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Increasing Uniform Chain I",
    "topic": "probability",
    "urlEnding": "increasing-uniform-chain"
  }
}
```
