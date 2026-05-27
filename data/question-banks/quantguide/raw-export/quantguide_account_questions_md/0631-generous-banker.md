# QuantGuide Question

## 631. Generous Banker

**Metadata**

- ID: `uvQjJyQzGkXaEk79ovx6`
- URL: https://www.quantguide.io/questions/generous-banker
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: Variation of HOTS
- Tags: Games, Discrete Random Variables
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

You are at the bank and it is your lucky day. The banker is going pick random positive integer and you are too. You are both allowed to determine the probability distribution on the positive integers that you select from. If you and the banker select the same value, say $n$, you receive $n^2$ dollars. Otherwise, you receive nothing. Neither party knows the distribution the other selected. Assuming optimal strategy from both parties, what is your expected payout from this game? The answer will be in the form $\dfrac{a}{\pi^b}$ for integers $a$ and $b$. Find $ab$.

### Hint

Consider this game on the finite set $\{1,2,\dots,N\}$. We can quickly see that in this finite state game, the banker selecting uniformly at random is not optimal, as to maximize the expected payout, you would select $N$ as your value and your expected payout on the game would be $N$. Maybe you want to make the payout constant per value.

### 解答

Consider this game on the finite set $\{1,2,\dots,N\}$. We can quickly see that in this finite state game, the banker selecting uniformly at random is not optimal, as to maximize the expected payout, you would select $N$ as your value and your expected payout on the game would be $N$. 

$$$$

What we want to do is find a distribution on the positive integers so that the expected payout from the banker is constant regardless of the value that he selects. This would be because of the fact that no matter which probability distribution you select, you would now have constant payout on the game, so you can't do any better by selecting another distribution. If $N$ is the value the banker selects, to have constant expected payout per value, we would need a distribution with PMF in the form $\mathbb{P}[N = n] = \dfrac{C}{n^2}$ for positive integers $n$.

$$$$

To find $C$, we note that $\displaystyle\sum_{n=1}^{\infty} \mathbb{P}[N = n] = 1$, so $C \cdot \displaystyle \sum_{n=1}^{\infty} \dfrac{1}{n^2} = 1$. This sum here is well-known to evaluate to $\dfrac{\pi^2}{6}$, so $C = \dfrac{6}{\pi^2}$. This PMF is actually known as the $\text{Zeta}(2)$ distribution. The expected payout is therefore $\dfrac{6}{\pi^2}$ for you, as any probability distribution you assign is just going to be weighting of $\dfrac{6}{\pi^2}$ for each value conditional on selecting some value. Therefore, the answer is $12$ to the question of interest.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "12"
    ],
    "companies": [],
    "difficulty": "medium",
    "id": "uvQjJyQzGkXaEk79ovx6",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 5027366,
    "source": "Variation of HOTS",
    "status": "published",
    "tags": [
      {
        "tag": "Games"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Generous Banker",
    "topic": "probability",
    "urlEnding": "generous-banker"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "uvQjJyQzGkXaEk79ovx6",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Games"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Generous Banker",
    "topic": "probability",
    "urlEnding": "generous-banker"
  }
}
```
