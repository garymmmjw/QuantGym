# QuantGuide Question

## 227. Make Your Martingale III

**Metadata**

- ID: `IDNYuKKB8TkpL6qgsyvn`
- URL: https://www.quantguide.io/questions/make-your-martingale-iii
- Topic: pure math
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: JHU Stoch Calc
- Tags: Stochastic Calculus
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-6 20:37:59 America/New_York
- Last Edited By: Gabe

### 题干

Let $X_1,X_2,\dots \sim \text{Exp}(\lambda)$ IID. Define the process $\{M_n\}_{n \geq 0}$ by $M_0 = 1$ and $M_n = M_{n-1} \cdot \dfrac{1}{2}e^{\frac{\lambda}{2}X_n}$ with the natural filtration $\mathcal{F}_n = \sigma(X_1,\dots,X_n)$. If $0 < a < p < b$ for some real values $a$ and $b$, then $\{M_n^p\}_{n \geq 0}$ is a sub-martingale. Find $a + b$. 

### Hint

Compute $\mathbb{E}[M_{n+1}^p \mid M_n^p]$ and find the range where the coefficient is larger than $1$. 

### 解答

By direct computation, we have that $$\mathbb{E}[M_{n+1}^p \mid M_n^p] = \mathbb{E}\left[M_n^p \cdot \dfrac{1}{2^p}e^{\frac{\lambda p}{2}X_{n+1}} \mid M_n^p\right] = \dfrac{M_n^p}{2^p} \mathbb{E}\left[e^{\frac{\lambda p}{2} X_{n+1}} \mid M_n^p\right]$$ We know that $X_{n+1}$ is independent of $M_n^p$, as $M_n$ is only a function of $X_1,\dots, X_n$. Therefore, $\mathbb{E}\left[e^{\frac{\lambda p}{2} X_{n+1}} \mid M_n^p\right] = \mathbb{E}\left[e^{\frac{\lambda p}{2} X_{n+1}}\right] = M\left(\dfrac{\lambda p}{2}\right)$, where $M(\theta) = \dfrac{\lambda}{\lambda - \theta}$ is the MGF of an $\text{Exp}(\lambda)$ random variable. Substituting in, $\mathbb{E}\left[e^{\frac{\lambda p}{2} X_{n+1}}\right] = \dfrac{\lambda}{\lambda - \dfrac{\lambda p}{2}} = \dfrac{2}{2-p}$. This means that $\mathbb{E}[M_{n+1}^p \mid M_n^p] = M_n^p \cdot \dfrac{2^{1-p}}{2-p}$. We have a sub-martingale whenever $\dfrac{2^{1-p}}{2-p} > 1$, which means $2-p < 2^{1-p}$. 

$$$$

Note that $0 < p < 2$ because of the assumption $p > 0$ and that our step where we plug into the MGF of the exponential distribution is otherwise invalid if $p > 2$. This is since the MGF is only defined for $\theta < \lambda$, so as $\theta = \dfrac{\lambda p}{2}$ here, for $p \geq 2$, this is at least $\lambda$, which is not in our domain of definition. Thus, we restrict ourselves to $(0,2)$. In particular, we have equality at $p = 0,1$. As $2^{1-p} > 2-p$ for $p < 0$, we must have that $2^{1-p} < 2-p$ on $(0,1)$ and $2^{1-p} > 2-p$ for $1 < p < 2$. This means that $1 < p < 2$ yields a sub-martingale, so $a + b = 3$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "IDNYuKKB8TkpL6qgsyvn",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "lastEditedAt": "2023-9-6 20:37:59 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1797699,
    "source": "JHU Stoch Calc",
    "status": "published",
    "tags": [
      {
        "tag": "Stochastic Calculus"
      }
    ],
    "title": "Make Your Martingale III",
    "topic": "pure math",
    "urlEnding": "make-your-martingale-iii",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "IDNYuKKB8TkpL6qgsyvn",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Stochastic Calculus"
      }
    ],
    "title": "Make Your Martingale III",
    "topic": "pure math",
    "urlEnding": "make-your-martingale-iii"
  }
}
```
