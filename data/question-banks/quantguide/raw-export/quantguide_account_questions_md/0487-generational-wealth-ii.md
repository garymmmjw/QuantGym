# QuantGuide Question

## 487. Generational Wealth II

**Metadata**

- ID: `wAkj1lupFMYD1nJFN4Kz`
- URL: https://www.quantguide.io/questions/generational-wealth-ii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Continuous Random Variables, Expected Value
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 14:00:23 America/New_York
- Last Edited By: Gabe

### 题干

Suppose that you generate a uniformly random number in the interval $(0,1)$. You can generate additional random numbers as many times as you want for a fee of $\$0.05$ per generation. The number of additional generations must be made prior to your first number that you generate. Your payout is the maximum of all the numbers you generate. Assuming optimal strategy, what is your expected payout of this game?

### Hint

Write the expected payout as a function of $n$, the amount of uniforms that you generate. Try to maximize it in $n$.

### 解答

It is known that if $X_1,\dots, X_n \sim \text{Unif}(0,1)$ IID, then if $M_n = \text{max}\{X_1,\dots,X_n\}$, $\mathbb{E}[M_n] = \dfrac{n}{n+1} = 1 - \dfrac{1}{n+1}$. In fact, one can show that $M_n \sim \text{Beta}(n,1)$, but we don't need this level of depth for this question. Namely, we want to find $n$ that maximizes our expected payout. If we generate $n$ numbers total, that means we have $n-1$ re-generations of numbers. The expected max would be $1 - \dfrac{1}{n+1}$, and we would have to pay $\dfrac{n-1}{20}$ to get those re-generations. Thus, our payout as a function of the total number of generations that we do is $f(n) = 1 - \dfrac{1}{n+1} - \dfrac{n-1}{20}$. We want maximize in $n$, so treat $f(n)$ as continuous and take the derivative in $n$. Then, we want to set this equal to $0$ to find the maximizer.

$$$$

This means $f'(n) = \dfrac{1}{(n+1)^2} - \dfrac{1}{20} = 0$, which means $20 = (n+1)^2$. This means $n = \sqrt{20} - 1$. As this is not an integer, we should test the two integers closest to this value to see what the expected value is. As $4 < \sqrt{20} < 5$, we should test $n = 3$ and $n = 4$ to see what the expected value is. One can quickly see by direct substitution that $f(3) = f(4) = \dfrac{13}{20}$, so our answer is $\dfrac{13}{20}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "13/20"
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "wAkj1lupFMYD1nJFN4Kz",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 14:00:23 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3868833,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Generational Wealth II",
    "topic": "probability",
    "urlEnding": "generational-wealth-ii"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "wAkj1lupFMYD1nJFN4Kz",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Generational Wealth II",
    "topic": "probability",
    "urlEnding": "generational-wealth-ii"
  }
}
```
