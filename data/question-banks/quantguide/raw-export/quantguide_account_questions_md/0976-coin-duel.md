# QuantGuide Question

## 976. Coin Duel

**Metadata**

- ID: `046pBhG9dEboa3FmPV6k`
- URL: https://www.quantguide.io/questions/coin-duel
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: SIG
- Source: og
- Tags: Conditional Probability, Discrete Random Variables
- Premium: False
- Solution Free: False
- Version: 3
- Last Edited: 2023-11-7 08:28:31 America/New_York
- Last Edited By: Gabe

### 题干

Bill and Bob are simultaneously flipping coins with probability $1/3$ of heads per flip. Find the probability that Bill obtains his first heads in strictly less flips than Bob.

### Hint

Find the probability that Bill and Bob obtain their first heads at the same type and use an exchangeability argument.

### 解答

Let $X_1$ and $X_2$ represent the number of flips needed for Bill and Bob, respectively, to obtain their first heads. We are going to generalize this to probability $p$ of heads per flip. We immediately know that $X_1,X_2 \sim \text{Geom}(p)$ by the fact we are looking for a waiting time until first heads. One might guess that the answer to this is $\dfrac{1}{2}$, but the issue is that there is positive probability of equality, so we first need to subtract that out, and then we can use exchangeability to claim that $\mathbb{P}[X_1 > X_2] = \mathbb{P}[X_1 < X_2]$. $$$$First, let's find $\mathbb{P}[X_1 = X_2]$. This is simple enough to find, as $X_1$ and $X_2$ are independent, so $$\mathbb{P}[X_1 = X_2] = \displaystyle \sum_{n=1}^{\infty} \mathbb{P}[X_1 = X_2 \mid X_2 = n]\mathbb{P}[X_2 = n] = \displaystyle \sum_{n=1}^{\infty} \mathbb{P}[X_1 = n]\mathbb{P}[X_2 = n]$$ as we want the probability $X_1 = X_2$ and we know that $X_2 = n$. The previous work is just by the Law of Total Probability applied by conditioning on $X_2$. We have that $$\mathbb{P}[X_1 = n] = \mathbb{P}[X_2 = n] = p(1-p)^{n-1}$$ by the fact that $X_1$ and $X_2$ are IID. Thus, previous sum becomes $$\displaystyle \sum_{n=1}^{\infty} p^2(1-p)^{2n-2} = \displaystyle p^2 \sum_{n=1}^{\infty} \left[(1-p)^2\right]^{n-1}$$ by rearranging slightly. We do this because we want to get an $n-1$ in the exponent of the interior since the lower index of the sum is $n=1$ and we would ideally by able to apply the geometric sum formula. The sum inside is now geometric with $r = (1-p)^2 < 1$, so the above expression becomes $\dfrac{p^2}{1 - (1-p)^2} = \dfrac{p^2}{p(2-p)} = \dfrac{p}{2-p}$. This is $\mathbb{P}[X_1 = X_2]$, so $$\mathbb{P}[X_1 \neq X_2] = 1 - \mathbb{P}[X_1 = X_2] = 1 - \dfrac{p}{2-p} = \dfrac{2(1-p)}{2-p}$$. This is $\mathbb{P}[X_1 \neq X_2]$, and this is partitioned into two events, namely that $\mathbb{P}[X_1 \neq X_2] = \mathbb{P}[X_1 > X_2] + \mathbb{P}[X_1 < X_2]$. This is because if they are not equal, then one of them must be larger than the other. Since $X_1$ and $X_2$ are IID, they are exchangeable, so we have that the should have equally likely probabilities of being larger or smaller than one another. Thus, the two probabilities on the RHS are equal. Substituting in our found value on the LHS for $\mathbb{P}[X_1 \neq X_2]$, we have that $\dfrac{2(1-p)}{2-p} = 2\mathbb{P}[X_1 < X_2]$, meaning that $\mathbb{P}[X_1 < X_2] = \dfrac{1-p}{2-p}$. Since there is positive probability of equality between $X_1$ and $X_2$, it makes sense that the probability slightly less than $\dfrac{1}{2}$.

$$$$

Alternatively, we can give an argument by a one-step Law of Total Probability approach. Let $x$ be the probability in question. We can condition on the $4$ outcomes of the first flip. If Bob flips a heads on the first flip, which occurs with probability $p$, Bill can't obtain a heads before him, so this conditional probability is $0$. If Bob flips a tails, then if Bill flips a heads, he wins immediately. This occurs with probability $p(1-p)$. If Bill flips a tails as well, then the probability is just the same as at the start, which is $x$. Therefore, we obtain the equation $$x = p(1-p) + (1-p)^2x \iff (2p - p^2)x = p(1-p) \iff x = \dfrac{1-p}{2-p}$$

$$$$

In this case, $p = 1/3$, so our answer is $\dfrac{2}{5}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2/5"
    ],
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "046pBhG9dEboa3FmPV6k",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 08:28:31 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7954996,
    "randomizable": "",
    "source": "og",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Coin Duel",
    "topic": "probability",
    "urlEnding": "coin-duel",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "medium",
    "id": "046pBhG9dEboa3FmPV6k",
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
    "title": "Coin Duel",
    "topic": "probability",
    "urlEnding": "coin-duel"
  }
}
```
