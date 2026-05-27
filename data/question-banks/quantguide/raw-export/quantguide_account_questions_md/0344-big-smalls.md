# QuantGuide Question

## 344. Big Smalls

**Metadata**

- ID: `TBgCvjJCkwLboHcYmj8D`
- URL: https://www.quantguide.io/questions/big-smalls
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Jane Street
- Source: https://math.stackexchange.com/questions/3411465/optimal-strategy-in-probability-based-game?noredirect=1#comment7016587_3411465
- Tags: Games, Expected Value
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-25 22:54:31 America/New_York
- Last Edited By: Gabe

### 题干

Alice and Bob play the following game: Alice generates a uniformly random integer between $1$ and $100$, inclusive of both. Bob can pick any number that he wants between $1$ and $100$, inclusive of both. Whoever has the larger number must pays out the amount of the smaller number to the person with the smaller number. For example, if Alice selects $70$ and Bob selects $50$, Bob will receive $50$ from Alice. If they select the same number, nobody pays out anything. Assuming optimal play by Bob, what is his expected payout?

### Hint

Let $Z_x$ be Bob's gain if he selects the value $x$. Furthermore, let $Y$ be the randomly generated number. We can ignore the case where $Y = x$, as the payout there is $0$ for both people. By Law of Total Expectation, we have
$$
\mathbb{E}[Z_x]=\mathbb{E}[Z_x \mid x>Y] \mathbb{P}[x>Y]+\mathbb{E}[Z_x \mid x<Y] \mathbb{P}[x<Y]

$$

Maximize this function.

### 解答

Let $Z_x$ be Bob's gain if he selects the value $x$. Furthermore, let $Y$ be the randomly generated number. We can ignore the case where $Y = x$, as the payout there is $0$ for both people. By Law of Total Expectation, we have
$$
\mathbb{E}[Z_x]=\mathbb{E}[Z_x \mid x>Y] \mathbb{P}[x>Y]+\mathbb{E}[Z_x \mid x<Y] \mathbb{P}[x<Y]

$$

We can see that  $\mathbb{P}[x>Y]=(x-1) / 100$ and $\mathbb{P}[x<Y]=(100-x) / 100$, as there are $x-1$ values in $\{1,\dots,x-1\}$ and $100-x$ numbers in $\{x + 1,\dots, 100\}$


$$$$
To compute $\mathbb{E}[Z_x \mid x>Y]$, we can see that if $Y < x$, it is uniform on $\{1,\dots,x-1\}$, so the expected amount Bob pays is $x / 2$. 

$$$$
To compute $\mathbb{E}[Z_x \mid x < Y]$, we just simply note that Bob receives his number as the payout, which is $x$. Combining all of the above,

$$
\begin{gathered}
\mathbb{E}[Z_x]=\left(\frac{x-1}{100}\right)\left(-\frac{x}{2}\right)+\left(\frac{100 -x}{100} \right) (x)\\
=\frac{201x - 3x^2}{200} .
\end{gathered}
$$
The derivative of this function if $\dfrac{1}{200}\left(201 - 6x\right)$, so this derivative equals $0$ precisely when $x^* = \dfrac{201}{6} = \dfrac{67}{2}$. Since the parabola is symmetric about the axis of symmetry, which is at the $x-$value of the maximum ($33.5$ in this case), we conclude that guessing $33$ and $34$ give equal payouts. Namely, $\mathbb{E}[Z_{33}] = \mathbb{E}[Z_{34}] = \dfrac{1683}{100}$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "16.83"
    ],
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "TBgCvjJCkwLboHcYmj8D",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-25 22:54:31 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2636952,
    "source": "https://math.stackexchange.com/questions/3411465/optimal-strategy-in-probability-based-game?noredirect=1#comment7016587_3411465",
    "status": "published",
    "tags": [
      {
        "tag": "Games"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Big Smalls",
    "topic": "probability",
    "urlEnding": "big-smalls"
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "medium",
    "id": "TBgCvjJCkwLboHcYmj8D",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Games"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Big Smalls",
    "topic": "probability",
    "urlEnding": "big-smalls"
  }
}
```
