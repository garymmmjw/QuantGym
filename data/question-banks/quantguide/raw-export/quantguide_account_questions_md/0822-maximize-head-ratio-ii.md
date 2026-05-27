# QuantGuide Question

## 822. Maximize Head Ratio II

**Metadata**

- ID: `fsum2DSHItj4JHB8uV04`
- URL: https://www.quantguide.io/questions/maximize-head-ratio-ii
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 4
- Companies: SIG
- Source: Kaushik - SIG and MSE (https://math.stackexchange.com/questions/140184/expected-ratio-of-coin-flips)
- Tags: Combinatorics, Expected Value
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Say that you are flipping a fair coin where you can stop flipping whenever you want. Your goal is to maximize the ratio between the number of heads you get with the total number of flips. The ratios are in the form $a:1$. What is the expectation of $a$ when you follow the strategy of stopping when you have more heads than tails? Round your answer to the nearest thousandths. 

### Hint

When trying to find the probability of outcomes, use Dyck words. The Taylor Series for $\arcsin(x) = \displaystyle \sum_{n=0}^{\infty} \dfrac{1}{4^n(2n+1)}\binom{2n}{n}x^{2n+1}$

### 解答

The strategy here is close to optimal but needs simulations to fully reach optimality. However, this strategy makes sense intuitively because if the current ratio is $0.5:1$, we should always try and get another head as we can always get back to a ratio of $0.5:1$.

$$$$

To put this strategy in a mathematical context, the optimal ratio will be $\dfrac{n+1}{2n+1}$ where n is a number from 0 to infinity. Thus we should always end on an odd roll. To find the expectation, we need to find a weighted sum of this series, the weight being the probability we end on $2n+1$. When we stop on $2n+1$ and $n\neq0$, we know the last toss needs to be heads and for $k=1, 2, ..., 2n$, the first $k$ tosses can't include more heads than tails (we would've stopped the flips earlier in that case).


$$$$

To count such sequences, we can use Dyck words (length $2n$) and the $n$-th Catalan number can be found by $C_{n}=\dfrac{1}{n+1}\binom{2n}{n}$.

$$$$

Since each of the Catalan numbers have probability of $\left(\dfrac{1}{2}\right)^{2n}$ and the last flip is heads with probability of $\dfrac{1}{2}$, the expectation of the ratio becomes $\displaystyle \sum_{n=0}^{\infty}p_{n}\cdot\dfrac{n+1}{2n+1} = \dfrac{1}{2}\sum_{n=0}^{\infty}\dfrac{1}{4^n(2n+1)}\cdot\binom{2n}{n}$. Using the Taylor series for $\arcsin(x)$, this summation simplifies to $$\dfrac{1}{2}\cdot\arcsin(1)=\dfrac{\pi}{4} \approx 0.785$$


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0.785"
    ],
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "hard",
    "id": "fsum2DSHItj4JHB8uV04",
    "internalDifficulty": 4,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 6744956,
    "source": "Kaushik - SIG and MSE (https://math.stackexchange.com/questions/140184/expected-ratio-of-coin-flips)",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Maximize Head Ratio II",
    "topic": "probability",
    "urlEnding": "maximize-head-ratio-ii"
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "hard",
    "id": "fsum2DSHItj4JHB8uV04",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Maximize Head Ratio II",
    "topic": "probability",
    "urlEnding": "maximize-head-ratio-ii"
  }
}
```
