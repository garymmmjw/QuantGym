# QuantGuide Question

## 765. Sum Exceedance I

**Metadata**

- ID: `D3z7mNptMSPp1ZrcvJXa`
- URL: https://www.quantguide.io/questions/sum-exceedance-i
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: JP Morgan, DE Shaw, Akuna, Goldman Sachs, Vatic Labs, Hudson River Trading
- Source: N/A
- Tags: Expected Value, Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: 7
- Last Edited: 2023-11-7 13:10:54 America/New_York
- Last Edited By: Gabe

### 题干

Let $X_1,X_2,\dots$ be IID Unif$(0,1)$ random variables and let $N = \text{min}\left\{n : X_1 + \dots + X_n > \ln(2)\right\}$. Find $\mathbb{E}[N]$.

### Hint

For $0 < x < 1$, let $m(x) = \mathbb{E}[N_x]$, where $N_x = \text{min}\left\{n : X_1 + \dots + X_n > x\right\}$. Use Law of Total Expectation by conditioning on the value of $X_1$.

### 解答

We are going to generalize this question. For $0 < x < 1$ (this restriction will be explained later), let $m(x) = \mathbb{E}[N_x]$, where $N_x = \text{min}\left\{n : X_1 + \dots + X_n > x\right\}$. By the Law of Total Expectation, $\mathbb{E}[N_x] = \mathbb{E}[\mathbb{E}[N_x \mid X_1]]$. If $X_1 > x$, then it takes $1$ trial and this occurs with probability $1-x$. If $X_1 \leq x$, then we have a remaining sum of $x - X_1$ remaining to exceed. Therefore, our expectation $1+m(x-X_1)$ in this case. We need to integrate over all values of $X_1$ from $0$ to $x$ by Law of Total Expectation. The expression that results is $$m(x) = (1-x) \cdot 1 + \displaystyle \int_0^x (1 + m(x-y))dy = 1 + \int_0^x m(x-y)dy$$ We can make the $u-$substitution $u = x - y$ and obtain the new integral equation $m(x) = 1 + \displaystyle \int_0^x m(u)du$. Assuming differentiability of $m(x)$, take the derivative on both sides and apply the fundamental theorem of calculus to obtain $m'(x) = m(x)$. The classic solution to this equation is $m(x) = Ce^x$. We now need an initial condition to obtain a particular solution. A reasonable initial condition is that $m(0) = 1$, as with probability $1$, our first random variable is larger than $0$, so it takes exactly $1$ random variable to exceed $0$. This initial condition implies $C = 1$ and $m(x) = e^x$. 

$$$$

Note that this equation is only valid for $0 < x < 1$. This is because for $0 < x < 1$, we can exceed $x$ with one random variable. Otherwise, for $x > 1$, the RHS is $m(x) - m(x-1)$. It is a good exercise to verify this. As $\ln(2) < 1$, the above is irrelevant for this question, so $m(\ln(2)) = e^{\ln(2)} = 2$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2"
    ],
    "companies": [
      {
        "company": "JP Morgan"
      },
      {
        "company": "DE Shaw"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "Vatic Labs"
      },
      {
        "company": "Hudson River Trading"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "D3z7mNptMSPp1ZrcvJXa",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 13:10:54 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6259752,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Sum Exceedance I",
    "topic": "probability",
    "urlEnding": "sum-exceedance-i",
    "version": 7
  },
  "list_summary": {
    "companies": [
      {
        "company": "JP Morgan"
      },
      {
        "company": "DE Shaw"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "Vatic Labs"
      },
      {
        "company": "Hudson River Trading"
      }
    ],
    "difficulty": "hard",
    "id": "D3z7mNptMSPp1ZrcvJXa",
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
    "title": "Sum Exceedance I",
    "topic": "probability",
    "urlEnding": "sum-exceedance-i"
  }
}
```
