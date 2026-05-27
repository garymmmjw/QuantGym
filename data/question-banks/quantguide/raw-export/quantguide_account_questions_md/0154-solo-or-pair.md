# QuantGuide Question

## 154. Solo or Pair

**Metadata**

- ID: `7yLmnYckSykrS5DpzjJr`
- URL: https://www.quantguide.io/questions/solo-or-pair
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Jane Street, Goldman Sachs, Akuna
- Source: js
- Tags: Combinatorics
- Premium: True
- Solution Free: False
- Version: 3
- Last Edited: 2023-11-7 12:56:38 America/New_York
- Last Edited By: Gabe

### 题干

You are given the option between two games involving fair standard $6-$sided dice. Which one gives you a higher probability of winning? Answer $1$ for the first game, $2$ for the second game, or $3$ if both give you equal probability of winning.

$$$$

$\textbf{Game 1:}$ You are given $4$ rolls of a single die and you must roll $6$ at least once.
$$$$

$\textbf{Game 2:}$ You are given $24$ rolls of a pair of dice and you must roll $66$ at least once.

### Hint

The probability of winning in game $1$ is $1 - \left(\dfrac{5}{6}\right)^4$ by complementation, as to lose, you must roll each of the other $5$ values per roll. The probability of winning in game $2$ is $1 - \left(\dfrac{35}{36}\right)^{24}$, as to lose, you must roll any of the other $35$ outcomes of the two dice per turn. Try to reason out by approximation which is larger.

### 解答

The probability of winning in game $1$ is $1 - \left(\dfrac{5}{6}\right)^4$ by complementation, as to lose, you must roll each of the other $5$ values per roll. The probability of winning in game $2$ is $1 - \left(\dfrac{35}{36}\right)^{24}$, as to lose, you must roll any of the other $35$ outcomes of the two dice per turn. We need to determine which of these is larger, which is equivalent to determine which of $\left(\dfrac{5}{6}\right)^4$ and $\left(\dfrac{35}{36}\right)^{24}$ is smaller. We know that $\dfrac{35^2}{36^2} = \dfrac{1225}{1296} \approx \dfrac{1225}{1300} = \dfrac{49}{52}$. Then, squaring this yields $\dfrac{2401}{2704} \approx \dfrac{8}{9}$. Therefore, $\left(\dfrac{35}{36}\right)^8 \approx \dfrac{64}{81} \approx \dfrac{4}{5}$. Now, we just need to compare $\left(\dfrac{5}{6}\right)^4$ to $\dfrac{4^3}{5^3} = \dfrac{64}{125}$. However, this is easy to see, as $\dfrac{5^4}{6^4} = \dfrac{625}{1296} < \dfrac{1}{2} < \dfrac{64}{125}$. Therefore, we can conclude, at least approximately, that $\left(\dfrac{5}{6}\right)^4$ is smaller, so Game $1$ gives you better odds. When plugging into a calculator, this is indeed confirmed.


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1"
    ],
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "Akuna"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "7yLmnYckSykrS5DpzjJr",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 12:56:38 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1153370,
    "source": "js",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Solo or Pair",
    "topic": "brainteasers",
    "urlEnding": "solo-or-pair",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "Akuna"
      }
    ],
    "difficulty": "medium",
    "id": "7yLmnYckSykrS5DpzjJr",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Solo or Pair",
    "topic": "brainteasers",
    "urlEnding": "solo-or-pair"
  }
}
```
