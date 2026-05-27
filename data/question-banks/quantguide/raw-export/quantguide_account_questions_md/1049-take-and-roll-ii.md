# QuantGuide Question

## 1049. Take And Roll II

**Metadata**

- ID: `GIZilPbwoQiDBKOF3v8d`
- URL: https://www.quantguide.io/questions/take-and-roll-ii
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: Jane Street
- Source: Jane Street
- Tags: Expected Value, Games
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-22 16:09:29 America/New_York
- Last Edited By: Gabe

### 题干

You are given a fair $20-$sided die and 100 actions in a game. The die starts with upface $1$. The two options you can perform are to roll and to take. Performing a roll re-rolls the current upface of the die. Performing a take allows you to cash out the current upface of the die. Note that the game does not end when you perform a take. However, you must roll the die again before doing another take. Your strategy is to accept any number that is at least some threshold $n$. This $n$ must be decided in advance and is fixed for the entire game. Assuming rational play in selecting $n$, find your expected payout.

### Hint

The optimal strategy will once again to be accept any number that it at least some threshold $n$. To get a baseline to compare to, suppose we just roll and take in an alternating fashion. We will be able to perform this $50$ times (as each is one action) and the expected value per roll is $10.5$, so our expected payout would be $50 \cdot 10.5 = 525$ with this strategy. Write the expected payoff as a function of $n$.

### 解答

To get a baseline to compare to, suppose we just roll and take in an alternating fashion. We will be able to perform this $50$ times (as each is one action) and the expected value per roll is $10.5$, so our expected payout would be $50 \cdot 10.5 = 525$ with this strategy.

$$$$

Now, let's write the expected payoff as a function of $n$. If we accept any value at least $n$, then the expected value we roll given we accept is $\dfrac{20+n}{2}$. There are $21-n$ values that are at least value $n$, so the probability on each roll that we obtain a value at least $n$ is $\dfrac{21-n}{20}$. As this probability is constant between rolls, the expected number of terms of obtain a value at least $n$ is $\dfrac{20}{21-n}$. However, we now must claim it after we obtain a roll satisfying this threshold, so the expected number of turns needed to roll and claim the money is $\dfrac{20}{21-n} + 1$. Therefore, on average, we are able to roll and claim the money $\dfrac{100}{\frac{20}{21-n} + 1}$ times in the game, as it takes us that many turns on average to roll and claim and we have $100$ total turns. Lastly, this implies our expected payout is $f(n) = \dfrac{100}{\frac{20}{21-n} + 1} \cdot \dfrac{20+n}{2}$, as we multiply the expected number of times we are paid by the expected payout per time.

$$$$

To find the $n$ maximizing this, one can treat $f$ as continuous and use the derivative of it to find the optimal $n$. The details of taking the derivative messy and not enlightening, so the steps are excluded. However, after using the basic rules and simplifying, $$f'(n) = \dfrac{50}{(n-41)^2} \cdot \left(n^2 - 82n + 461\right) = 0$$ The roots of the polynomial are $n_{1,2} = 41 \pm 2\sqrt{305}$. The root adding $2\sqrt{305}$ is larger than $20$, so $n^* = 41 - 2\sqrt{305}$ must be the maximizer. As $17 < \sqrt{305} < 18$ and our optimal $n$ must be an integer, we can test $n = 5, 6, 7$ to see which gives us the largest expected payout.

$$$$

Plugging all three of these in reveals $n = 6$ maximizes $f(n)$ with payout $\dfrac{3900}{7}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3900/7"
    ],
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "GIZilPbwoQiDBKOF3v8d",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-22 16:09:29 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8527145,
    "source": "Jane Street",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Games"
      }
    ],
    "title": "Take And Roll II",
    "topic": "probability",
    "urlEnding": "take-and-roll-ii",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "hard",
    "id": "GIZilPbwoQiDBKOF3v8d",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Games"
      }
    ],
    "title": "Take And Roll II",
    "topic": "probability",
    "urlEnding": "take-and-roll-ii"
  }
}
```
