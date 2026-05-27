# QuantGuide Question

## 986. Take and Roll I

**Metadata**

- ID: `FbZUrXoBrZvSIpoyjEj3`
- URL: https://www.quantguide.io/questions/take-and-roll-i
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Jane Street
- Source: N/A
- Tags: Expected Value, Games
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-22 16:14:09 America/New_York
- Last Edited By: Gabe

### 题干

You are given a fair $20-$sided die and 100 actions in a game. The die starts with upface $1$. The two options you can perform are to roll and to take. Performing a roll re-rolls the current upface of the die. Performing a take allows you to cash out the current upface of the die. Note that the game does not end when you perform a take and that you do not have to roll between takes. Therefore, for example, you can just perform $100$ takes on the initial $\$1$ upface and walk away with $\$100$ guaranteed. Your strategy is to cash out the upface when you roll at least some threshold $n$ for the first time. You fix this $n$ at the beginning of the game. Assuming rational strategy in selecting $n$, what is your expected payout on this game?

### Hint

The stopping value is going to be in the form of taking after you have obtained a value at least $k$ for the first time. This is because you will not want to risk re-rolling and losing out on potential money. Therefore, if you take when you have at least $k$ for the first time, your expected face showing is $\dfrac{20+k}{2}$. Additionally, as there are $21-k$ values on the die at least $k$, the probability on any given roll of seeing at least $k$ is $\dfrac{21-k}{20}$.

### 解答

If you take when you have at least $k$ for the first time, your expected face showing is $\dfrac{20+k}{2}$. Additionally, as there are $21-k$ values on the die at least $k$, the probability on any given roll of seeing at least $k$ is $\dfrac{21-k}{20}$. Therefore, the average number of rolls needed to see a value at least $k$ is $\dfrac{20}{21-k}$. This means that you are able to claim on $100 - \dfrac{20}{21-k}$ turns.  Thus, your expected payout would be $$p(k) = \dfrac{20+k}{2} \cdot \left(100 - \dfrac{20}{21-k}\right)$$ To find the maximum, one can treat $p(k)$ as continuous and differentiate in $k$ and then consider the two integers $k$ is between as potential maximizers.

$$$$

Doing this by product rule and simplifying, $p'(k) = \dfrac{10}{(k-21)^2} \cdot (5k^2 - 210k + 2164)$. The zeros of this polynomial, by quadratic formula, are $k^* = \dfrac{105 \pm \sqrt{205}}{5}$. The root where we add is larger than $20$, so $k^* = \dfrac{105 - \sqrt{205}}{5} \approx 18.137$ is our optimizer. In an interview, one could notice that $14^2 < 205 < 15^2$, so that's how one could deduce $18 < k^* < 19$. Lastly, plugging in $k = 18$ and $k = 19$ yields that $k = 18$ yields the optimal value with $\dfrac{5320}{3}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "5320/3"
    ],
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "FbZUrXoBrZvSIpoyjEj3",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-22 16:14:09 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8035884,
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Games"
      }
    ],
    "title": "Take and Roll I",
    "topic": "probability",
    "urlEnding": "take-and-roll-i",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "medium",
    "id": "FbZUrXoBrZvSIpoyjEj3",
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
    "title": "Take and Roll I",
    "topic": "probability",
    "urlEnding": "take-and-roll-i"
  }
}
```
