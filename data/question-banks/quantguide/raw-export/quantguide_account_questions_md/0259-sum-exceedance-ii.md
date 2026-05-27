# QuantGuide Question

## 259. Sum Exceedance II

**Metadata**

- ID: `vtY09VAizttaJaVMm6da`
- URL: https://www.quantguide.io/questions/sum-exceedance-ii
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 4
- Companies: Hudson River Trading, JP Morgan, DE Shaw, Akuna, Goldman Sachs, Vatic Labs
- Source: modification of existing question
- Tags: Expected Value
- Premium: False
- Solution Free: False
- Version: 4
- Last Edited: 2023-11-7 13:11:00 America/New_York
- Last Edited By: Gabe

### 题干

Let $X_1,X_2,\dots \sim \text{Unif}(0,1)$ IID and $N_2 = \text{min}\{n : X_1 + \dots + X_n > 2\}$. Find $\mathbb{E}[N_2]$. Your answer will be in the form $ae^2 + be$ for integers $a$ and $b$. $e$ here is Euler's constant. Find $a + b$.

### Hint

Write a delayed differential equation that $f(x) = \mathbb{E}[N_x]$ should satisfy on $(1,2)$. You can obtain this by using Law of Total Expectation on $X_1$ and differentiating the result. What is a reasonable initial condition for $f(1)$? You may also want to recall $f(x) = e^x$ on $(0,1)$.

### 解答

We are going to use the result of Sum Exceedance I that states that for any $0 < x  < 1$, if $f(x) = \mathbb{E}[N_x]$, with $N_x = \text{min}\{n : X_1 + \dots + X_n > x\}$, $f(x) = e^x$. We want to find $f(2)$. We should condition on $X_1$, as that will tell us how much further of a sum we need to exceed. Namely, $f(2) = \mathbb{E}[N_2] = \mathbb{E}[\mathbb{E}[N_2 \mid X_1]]$. Now, given $X_1$, we have $2 - X_1$ left to exceed starting from the next turn and we used $1$ turn, so $\mathbb{E}[N_2 \mid X_1] = 1 + N_{2-X_1}.$ Therefore, $\mathbb{E}[N_2] = 1 + \mathbb{E}[N_{2-X_1}]$ by plugging back into the above. In other words, $f(2) = 1 + f(2-X_1)$. Now, we need to condition on $X_1 = x_1$ and integrate. Namely, this means that $f(2) = \displaystyle \int_0^1 \left(1 + f(2-x_1)\right)dx_1 = 1 + \int_0^1 f(2 - x_1)dx_1$ By the $u$-substitution $u = 2-x_1$, we get that $f(2) = 1 + \displaystyle \int_1^2 f(u)du$. 

$$$$

More generally, for $1 < x < 2$, by replacing $2$ with $x$, note, that the bounds of the integral would now become $x-1$ to $x$ in this case, so $$f(x) = 1 + \displaystyle \int_{x-1}^x f(u)du$$ Taking the derivative, we have that $f'(x) = f(x) - f(x-1)$. However, as $1 < x  < 2$, $0 < x-1 < 1$, in which we know $f$ in the interval $(0,1)$. Therefore, using the result stated at the beginning, $f'(x) = f(x) - e^{x-1}$, as $f(x) = e^x$ in $(0,1)$. Rearranging this differential equation, we have $f'(x) - f(x) = -e^{x-1}$. Our initial condition is that $f(1) = e$, as this makes it continuous with the part of $f$ on $(0,1)$.

$$$$

This here is a first order linear differential equation that can be solved by integrating factors. Namely, the integrating factor here is $\mu(t) = e^{\int (-1)dx} = e^{-x}$. Multiplying by this on both sides yields $e^{-x}f'(x) - e^{-x}f(x) = -e^{-1}$. The LHS is just $(e^{-x}f(x))'$. Therefore, integrating both sides, $e^{-x}f(x) = \displaystyle \int -e^{-1}dx = -xe^{-1} + C$. Multiplying by $e^x$ on both sides, $f(x) = -xe^{x-1} + Ce^x$. We know that $f(1) = e$, so $e = -1 + Ce$, so $C = 1 + e^{-1}$. 

$$$$

Therefore, $f(x) = -xe^{x-1} + \left(1 + e^{-1}\right)e^x$. Plugging in $x = 2$ yields $f(2) = e^2 - e$. Thus, $a = 1$ and $b = -1$, so $a + b = 0$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0"
    ],
    "companies": [
      {
        "company": "Hudson River Trading"
      },
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
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "vtY09VAizttaJaVMm6da",
    "internalDifficulty": 4,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 13:11:00 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2028828,
    "source": "modification of existing question",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Sum Exceedance II",
    "topic": "probability",
    "urlEnding": "sum-exceedance-ii",
    "version": 4
  },
  "list_summary": {
    "companies": [
      {
        "company": "Hudson River Trading"
      },
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
      }
    ],
    "difficulty": "hard",
    "id": "vtY09VAizttaJaVMm6da",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Sum Exceedance II",
    "topic": "probability",
    "urlEnding": "sum-exceedance-ii"
  }
}
```
