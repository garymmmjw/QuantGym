# QuantGuide Question

## 825. Random Minimal Sum

**Metadata**

- ID: `3Ol2vDSokTtQ2BPqmBwa`
- URL: https://www.quantguide.io/questions/random-minimal-sum
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 4
- Companies: N/A
- Source: N/A
- Tags: Expected Value
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 11:42:46 America/New_York
- Last Edited By: Gabe

### 题干

Let $X_1,X_2,\dots \sim \text{Unif}(0,1)$ IID. Consider the summation $S = \displaystyle \sum_{i=1}^N \dfrac{X_i}{2^i}$, where $N$ is the first index $k$ where $X_k < X_{k+1}$. If no such index exists, then $k = \infty$. Compute $\mathbb{E}[S]$. The answer will be in the form $ae^b + c$, where $a$ and $c$ are integers and $b$ is a rational number in fully reduced form. Find $a^2 + c^2 + 4b$.

### Hint

Rewrite $S$ as an infinite sum using some indicator random variable. Then, to calculate the interior expectation, use LOTE and LOTUS. 

### 解答

We can write $S = \displaystyle \sum_{i=1}^{\infty} \dfrac{X_i}{2^i}I_{N \geq i}$, as this indicator evaluates to $0$ if $i > N$ and $1$ otherwise, so the summation is equivalent. Assuming valid interchange of expectation and infinite summation (this can be rigorously justified with Fubini-Tonelli Theorem), $\mathbb{E}[S] = \displaystyle \sum_{i=1}^{\infty} \dfrac{1}{2^i}\mathbb{E}[X_iI_{N \geq i}]$. What remains is to calculate that expectation.

$$$$

To calculate $\mathbb{E}[X_iI_{N \geq i}]$, it is easiest to condition on the value of $X_i$. This is because of the fact that it is easy to evaluate the probability all of the remaining values are at least $X_i$ from this. Therefore, $\mathbb{E}[X_iI_{N \geq i}] = \mathbb{E}[\mathbb{E}[X_iI_{N \geq i} \mid X_i]] = \mathbb{E}[X_i\mathbb{E}[I_{N \geq i} \mid X_i]]$. This expectation on the inside evaluates to the probability that given $X_i$, $1 > X_1 > \dots X_{i-1} > X_i$. The probability all of the first $i-1$ random variables are at least as large as $X_i$ is $(1 - X_i)^{i-1}$, as it occurs with probability $1 - X_i$ independently for each random variable. The probability that $X_1 > X_2 > \dots > X_{i-1}$ is $\dfrac{1}{(i-1)!}$, as there are $(i-1)!$ equally likely orderings of the IID values and this is one of them. Therefore, as the ordering and the restriction on the minimum value are independent, $\mathbb{E}[I_{N \geq i} \mid X_i] = \dfrac{(1-X_i)^{i-1}}{(i-1)!}$. Therefore, 
$\mathbb{E}[X_iI_{N \geq i}] = \mathbb{E}\left[\dfrac{X_i(1-X_i)^{i-1}}{(i-1)!}\right]$.

$$$$

Using LOTUS,

\[\begin{aligned}
    \mathbb{E}\left[\dfrac{(1-X_i)^{i-1}}{(i-1)!}\right] &= \displaystyle \int_0^1 t \cdot \dfrac{(1-t)^{i-1}}{(i-1)!} \cdot 1dt \\ &= \dfrac{1}{(i-1)!} \int_0^1 t(1-t)^{i-1}dt \\ &= \dfrac{\Gamma(i)\Gamma(2)}{\Gamma(i+2)} \cdot \dfrac{1}{\Gamma(i)} \\ &= \dfrac{1}{(i+1)!}
\end{aligned}\]

 Note that this is because of the Beta integral $\displaystyle \int_0^1 t^{a-1}(1-t)^{b-1}dt = \dfrac{\Gamma(a)\Gamma(b)}{\Gamma(a+b)}$. Using this, we can sum the series:

$$\mathbb{E}[S] = \displaystyle \sum_{i=1}^{\infty} \dfrac{1}{2^i(i+1)!} = 2 \sum_{i=1}^{\infty} \dfrac{1}{2^{i+1}(i+1)!} = 2\sum_{i=2}^{\infty} \dfrac{\left(\frac{1}{2}\right)^i}{i!}$$

This last sum is just that of $\sqrt{e}$ without the $i = 0$ and $i = 1$ terms. Therefore, that sum evaluates to $\sqrt{e} - 1 - \dfrac{1}{2 \cdot 1!} = \sqrt{e} - \dfrac{3}{2}$. Substituting this in, $\mathbb{E}[S] = 2\sqrt{e} - 3$. This means $a = 2, c = -3, b = \frac{1}{2}$. This implies $a^2 + c^2 + 4b = 15$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "15"
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "3Ol2vDSokTtQ2BPqmBwa",
    "internalDifficulty": 4,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 11:42:46 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6781934,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Random Minimal Sum",
    "topic": "probability",
    "urlEnding": "random-minimal-sum"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "hard",
    "id": "3Ol2vDSokTtQ2BPqmBwa",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Random Minimal Sum",
    "topic": "probability",
    "urlEnding": "random-minimal-sum"
  }
}
```
