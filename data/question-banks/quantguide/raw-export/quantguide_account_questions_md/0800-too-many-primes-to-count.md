# QuantGuide Question

## 800. Too Many Primes to Count

**Metadata**

- ID: `ZBk73DYTsGBFWsZvoKFq`
- URL: https://www.quantguide.io/questions/too-many-primes-to-count
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: WorldQuant
- Source: https://www.glassdoor.com/Interview/First-player-tosses-perfect-dice-2017-times-Second-2016-times-What-is-probability-that-the-first-got-strictly-more-odd-QTN_2566576.htm
- Tags: Events, Expected Value
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-6 16:11:58 America/New_York
- Last Edited By: Gabe

### 题干

We are playing a game with two players. The first player rolls a $6-$sided die $10000$ times and the second player $10001$ times. What are the odds of the second player getting more prime numbers than the first one?

### Hint

There is a $\frac{1}{2}$ probability that either person will win with an equal amount of throws. What kind of edge does a single extra throw give to player 2?

### 解答

Let $X$ be the probability that they are tied after $10000$ throws each.
$$$$
There are two ways player $2$ can win:
$$$$
$\textbf{Case 1:}$ Player $2$ can be ahead after $10000$ throws from each, probability $\frac{1}{2} \cdot (1−X)$
$$$$
$\textbf{Case 2:}$ They can be tied at $10000$ and player $2$ might throw a prime number on the $10001$st, probability $\frac{1}{2} \cdot X$
$$$$
Thus the total probability that player $2$ wins is $\frac{1}{2} \cdot (1-X) + \frac{1}{2} \cdot X = \frac{1}{2}$


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/2"
    ],
    "companies": [
      {
        "company": "WorldQuant"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "ZBk73DYTsGBFWsZvoKFq",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-6 16:11:58 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6553655,
    "source": "https://www.glassdoor.com/Interview/First-player-tosses-perfect-dice-2017-times-Second-2016-times-What-is-probability-that-the-first-got-strictly-more-odd-QTN_2566576.htm",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Too Many Primes to Count",
    "topic": "probability",
    "urlEnding": "too-many-primes-to-count",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "WorldQuant"
      }
    ],
    "difficulty": "easy",
    "id": "ZBk73DYTsGBFWsZvoKFq",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Events"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Too Many Primes to Count",
    "topic": "probability",
    "urlEnding": "too-many-primes-to-count"
  }
}
```
