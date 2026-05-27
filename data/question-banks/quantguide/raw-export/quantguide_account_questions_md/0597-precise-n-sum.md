# QuantGuide Question

## 597. Precise N Sum

**Metadata**

- ID: `AQIlzQKzGv4hVrTbHuGu`
- URL: https://www.quantguide.io/questions/precise-n-sum
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: https://math.stackexchange.com/questions/2452389/what-is-the-formula-that-the-sum-of-three-independent-uniform-discrete-random-va?rq=1
- Tags: Conditional Probability, Discrete Random Variables
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Suppose $N > 0$ is an integer. Let $X_1,X_2,X_3$ be independently selected uniformly at random from the set $\{0,1,\dots,N\}$. Let $p_N = \mathbb{P}[X_1 + X_2 + X_3 = N]$. Find $\displaystyle \lim_{N \rightarrow \infty} Np_N$. If this limit does not exist, enter $-1$.

### Hint

For $X_1+X_2+X_3 = N$ to occur, we would need $X_1 + X_2 \leq N$ and $X_3 = N - X_1 - X_2$ to occur simultaneously. Condition on the first event happening to compute the probability the second event happens.

### 解答

For $X_1+X_2+X_3 = N$ to occur, we would need $X_1 + X_2 \leq N$ and $X_3 = N - X_1 - X_2$ to occur simultaneously. This is because all of the values we select are non-negative. Let $A_N = \{X_1 + X_2 \leq N\}$ and $B_N = \{X_3 = N - X_1 - X_2\}$. Then we want $$\mathbb{P}[A_N \cap B_N] = \mathbb{P}[B_N \mid A_N]\mathbb{P}[A_N]$$ $\mathbb{P}[B_N \mid A_N]$ asks for the probability $X_3 = N - X_1 - X_2$ given $X_1 + X_2 \leq N$. This probability is just $\dfrac{1}{N+1}$ since $X_3$ is discrete uniform over $\{0,1,\dots,N\}$ and the requested value is in the support since we know $0 \leq X_1 + X_2 \leq N$, meaning $N - X_1 - X_2$ is too. 

$$$$

For $\mathbb{P}[A_N]$, the trick here is to treat $X_1$ and $X_2$ as continuous uniform on $[0,N]$. At the end of the day, we only need an approximation, although this probability can be found explicitly. As $X_1$ and $X_2$ are both continuous and symmetric about their means, which are both $\dfrac{N}{2}$, $X_1 + X_2$ will be symmetric about its mean, which is $N$. Therefore, the probability in the continuous case is $\dfrac{1}{2}$, meaning the probability converges to that in the discrete case. Therefore, $p_N \approx \dfrac{1}{2(N+1)}$. Therefore, using the known rules of limits of rational functions, $Np_N = \dfrac{1}{2} \cdot \dfrac{N}{N+1} \rightarrow \dfrac{1}{2}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/2"
    ],
    "companies": [],
    "difficulty": "medium",
    "id": "AQIlzQKzGv4hVrTbHuGu",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 4763283,
    "source": "https://math.stackexchange.com/questions/2452389/what-is-the-formula-that-the-sum-of-three-independent-uniform-discrete-random-va?rq=1",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Precise N Sum",
    "topic": "probability",
    "urlEnding": "precise-n-sum"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "AQIlzQKzGv4hVrTbHuGu",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Precise N Sum",
    "topic": "probability",
    "urlEnding": "precise-n-sum"
  }
}
```
