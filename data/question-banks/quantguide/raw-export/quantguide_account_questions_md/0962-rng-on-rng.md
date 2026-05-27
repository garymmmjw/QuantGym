# QuantGuide Question

## 962. RNG on RNG

**Metadata**

- ID: `T88X71RpCexToqcnt07w`
- URL: https://www.quantguide.io/questions/rng-on-rng
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: N/A
- Tags: Continuous Random Variables, Expected Value, Games
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-23 11:32:27 America/New_York
- Last Edited By: Gabe

### 题干

You generate a uniformly random number in the interval $(0,1)$. You can generate additional random numbers as many times as you want for a fee of $\$0.02$ per generation. This decision can be made with the information of all of the previous values that have been generated. Your payout is the maximum of all the numbers you generate. Under the optimal strategy, find your expected payout of this game.

### Hint

The optimal strategy will be in the form of a payout when you generate some value $x \geq T$ for a threshold $T$. The threshold here needs to satisfy that the payout if you stop now equals the value that you receive by playing on that doesn't involve stopping.

### 解答

The optimal strategy will be in the form of a payout when you generate some value $x \geq T$ for a threshold $T$. This is because you can intuitively view each roll as a new game with some stopping threshold that we want to achieve. Therefore, our payout should a function $f(T)$ that we want to maximize.

$$$$

Let's compute what $f(T)$ is now. If we generate a value in excess of $T$, the distribution of that value is Unif$(T,1)$, so the expected value of it is $\dfrac{1+T}{2}$. However, the expected price to pay for that value is $0.02 \cdot \left(\dfrac{1}{1-T} - 1\right)$, as the probability that on any given trial we roll a value at least $T$ is $1-T$, so the distribution of the number of trials needed to obtain a value at least $T$ is Geom$(1-T)$. The mean of this distribution is $\dfrac{1}{1-T}$. The cost per trial besides the first is $0.02$, so this yields our equation above. Therefore, the expected payout is $f(T) = \dfrac{1+T}{2} - \dfrac{1}{50} \cdot \left(\dfrac{1}{1-T} - 1\right)$. As we want to maximize this in $T$, we just take a derivative and set it equal to $0$ to solve. Namely, $f'(T) = \dfrac{1}{2} - \dfrac{1}{50(1-T)^2} = 0$. Rearranging this yields $(1-T)^2 = \dfrac{1}{25} = \dfrac{1}{5^2}$, so as $0 < T < 1$, the solution is $T = 0.8$. Plugging this back in, $f(0.8) = 0.82$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0.82"
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "T88X71RpCexToqcnt07w",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-23 11:32:27 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7843358,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Games"
      }
    ],
    "title": "RNG on RNG",
    "topic": "probability",
    "urlEnding": "rng-on-rng",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "hard",
    "id": "T88X71RpCexToqcnt07w",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Games"
      }
    ],
    "title": "RNG on RNG",
    "topic": "probability",
    "urlEnding": "rng-on-rng"
  }
}
```
