# QuantGuide Question

## 433. Deriving Log-Price Dynamics

**Metadata**

- ID: `Uomh4Cj8dsJqRQeB53ta`
- URL: https://www.quantguide.io/questions/deriving-logprice-dynamics
- Topic: pure math
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Two Sigma
- Source: N/A
- Tags: Stochastic Calculus
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-12 08:42:16 America/New_York
- Last Edited By: Gabe

### 题干

Let's say $S_t$ follows the dynamics:

$$dS_t = 3 S_t dt + 4 S_t dW_t$$

where $W_t$ is a standard Brownian motion.

Find the dynamics of $X_t = \ln(S_t)$, where we can write the dynamics as:

$$dX_t = a dt + b dW_t$$

Find $a^2 + b^2$



### Hint

Use Ito's Lemma

### 解答

We can use Ito's Lemma on $f(x) = \ln(x)$. We have $f'(x) = \frac{1}{x}$ and $f''(x) = -\frac{1}{x^2}$.

Ito's Lemma says that $df = f'(S_t) dS_t + \frac{1}{2}f''(S_t) (dS_t)^2$. Plugging in the dynamics from above into $dS_t$, the derivatives, and using the fact that $(dS_t)^2 = 16 S_t^2 dt$, we get the following. 

$$\begin{align*}df &= \frac{1}{S_t} (3S_t dt + 4S_t dW_t) + \frac{1}{2}\frac{-1}{S_t^2}16S_t^2 dt \\ 
&= 3 dt + 4 dW_t - 8 dt \\ 
&= -5 dt + 4 dW_t 
\end{align*}$$

So, we have $a = -5$ and $b = 4$. Plugging the values in, we get $(-5)^2 + 4^2 = 41$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "41"
    ],
    "companies": [
      {
        "company": "Two Sigma"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "Uomh4Cj8dsJqRQeB53ta",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-12 08:42:16 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3465228,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Stochastic Calculus"
      }
    ],
    "title": "Deriving Log-Price Dynamics",
    "topic": "pure math",
    "urlEnding": "deriving-logprice-dynamics",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Two Sigma"
      }
    ],
    "difficulty": "medium",
    "id": "Uomh4Cj8dsJqRQeB53ta",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Stochastic Calculus"
      }
    ],
    "title": "Deriving Log-Price Dynamics",
    "topic": "pure math",
    "urlEnding": "deriving-logprice-dynamics"
  }
}
```
