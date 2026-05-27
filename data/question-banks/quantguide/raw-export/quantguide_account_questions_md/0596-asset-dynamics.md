# QuantGuide Question

## 596. Asset Dynamics

**Metadata**

- ID: `sId3eqi4LCozoXhUgiAo`
- URL: https://www.quantguide.io/questions/asset-dynamics
- Topic: pure math
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: Stochastic Calculus, Finance
- Premium: True
- Solution Free: False
- Version: 4
- Last Edited: 2023-9-30 23:21:41 America/New_York
- Last Edited By: Gabe

### 题干

Let $X$ denote an asset that has the following dynamics with $X_0 = 2$.

$$dX_t = 5 dt + 2 dW_t$$

where $dW_t$ is a standard Brownian motion. 

Find the mean $\mu_T$ and variance $\sigma^2_T$ of $X_T$, where $T = 0.2$. Give the answer in the format of $\mu_T * \sigma^2_T$. 

### Hint

Remember that a standard Brownian Motion follows $W_t \sim \mathcal{N}(0,t)$

### 解答

When we have an asset following dynamics $dX_t = a \ dt + b \ dW_t$, where $a, b \in \mathbb{R}$, we have the following properties. 

$$\begin{align*}
\mu_T &= X_0 + a T \\ 
\sigma^2_T &= b^2 T 
\end{align*}$$

We can also obtain these results intuitively without using the fact that a standard Brownian Motion follows $W_t \sim \mathcal{N}(0,t)$. The Brownian motion component is the randomness contributing part, with mean $0$. Thus, we can expect our time $T$ value to increase in direction by $a \ dt$ with an initial position of $X_0$. We can then use properties of a normal distribution to obtain the variance of our time $T$ position (as the $dW_t$ term contributes solely to the randomness of our time $T$ position. We can see that $b \ \mathcal{N}(0, t) = \mathcal{N}(0, b^2t)$. 

 



### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2.4"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "sId3eqi4LCozoXhUgiAo",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 23:21:41 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4761381,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Stochastic Calculus"
      },
      {
        "tag": "Finance"
      }
    ],
    "title": "Asset Dynamics",
    "topic": "pure math",
    "urlEnding": "asset-dynamics",
    "version": 4
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "sId3eqi4LCozoXhUgiAo",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Stochastic Calculus"
      },
      {
        "tag": "Finance"
      }
    ],
    "title": "Asset Dynamics",
    "topic": "pure math",
    "urlEnding": "asset-dynamics"
  }
}
```
