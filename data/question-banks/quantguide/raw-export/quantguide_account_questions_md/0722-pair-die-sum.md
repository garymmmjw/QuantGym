# QuantGuide Question

## 722. Pair Die Sum

**Metadata**

- ID: `xe6G5Kuf4Tu53zLULoGA`
- URL: https://www.quantguide.io/questions/pair-die-sum
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: https://math.stackexchange.com/questions/2420956/what-is-the-probability-of-the-sum-of-numbers-on-the-red-die-less-than-the-sum-o?rq=1
- Tags: Combinatorics, Events
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-8-26 14:33:56 America/New_York
- Last Edited By: Gabe

### 题干

$$2$ red and $2$ blue fair $6-$sided dice are rolled and the values are recorded. Find the probability that the sum of the upfaces of the two blue dice is larger than the sum of the upfaces of the two red dice.

### Hint

There is symmetry in this game, as the dice are identical besides their color. Find the probability that the two dice are equal in value.

### 解答

There is symmetry in this game, as the dice are identical besides their color. Therefore, if $X$ and $Y$ are the sums of the upfaces of the blue and red dice, respectively, then we want $\mathbb{P}[X > Y]$. Note that by symmetry, $\mathbb{P}[X > Y] = \mathbb{P}[X < Y]$. The only missing case here to be exhaustive is $\mathbb{P}[X = Y]$. Therefore, we have that $$\mathbb{P}[X > Y] = \dfrac{1 - \mathbb{P}[X = Y]}{2}$$ by substituting and rearranging in $\mathbb{P}[X > Y] + \mathbb{P}[X = Y] + \mathbb{P}[X < Y] = 1$. It now remains to evaluate $\mathbb{P}[X = Y]$. This is just a simple case of needing to count up all of the possible sums that they could equal. In particular, $\mathbb{P}[X = Y] = \displaystyle \sum_{k=2}^{12} \mathbb{P}[X = k] \mathbb{P}[Y=k]$ by the independence of $X$ and $Y$. Using the PMF of the sum of two dice, we evaluate this to be $\dfrac{1^2 + 2^2 + \dots + 6^2 + \dots + 2^2 + 1^2}{36^2} = \dfrac{146}{1296}$. Therefore, $$\mathbb{P}[X > Y] = \dfrac{1 - \frac{146}{1296}}{2} = \dfrac{575}{1296}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "575/1296"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "xe6G5Kuf4Tu53zLULoGA",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 14:33:56 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5896293,
    "source": "https://math.stackexchange.com/questions/2420956/what-is-the-probability-of-the-sum-of-numbers-on-the-red-die-less-than-the-sum-o?rq=1",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Events"
      }
    ],
    "title": "Pair Die Sum",
    "topic": "probability",
    "urlEnding": "pair-die-sum",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "xe6G5Kuf4Tu53zLULoGA",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Events"
      }
    ],
    "title": "Pair Die Sum",
    "topic": "probability",
    "urlEnding": "pair-die-sum"
  }
}
```
