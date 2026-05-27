# QuantGuide Question

## 60. Matching Die Trio

**Metadata**

- ID: `fgDQglyim1Y9rRxyYCJd`
- URL: https://www.quantguide.io/questions/matching-die-trio
- Topic: probability
- Difficulty: medium
- Internal Difficulty: N/A
- Companies: N/A
- Source: N/A
- Tags: Events, Conditional Probability
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Three fair $6-$sided dice are rolled and their upfaces are recorded. Find the probability that the values showing upon rolling all three dice again is the same as the original three values recorded.

### Hint

Condition on how many faces are showing that are distinct.

### 解答

With three dice being rolled originally, we can either have all show the same value, have two distinct values, or have all three be distinct values. We condition on the the number of distinct values showing after the first roll.

$$$$

The probability all of the values are the same is $\dfrac{6}{6^3} = \dfrac{1}{36}$, as you can roll the first die and the other two must match that value, which occurs with probability $\dfrac{1}{6}$ per die. The probability that all three values are distinct is easily calculated to be $\dfrac{6 \cdot 5 \cdot 4}{6^3} = \dfrac{5}{9}$. Therefore, the probability that exactly two distinct values appear is $1 - \dfrac{1}{36} - \dfrac{5}{9} = \dfrac{5}{12}$. Now, we must calculate the probability in each case that the second values match the first values.

$$$$

If all values are the same, the probability the second rolling matches the first only happens when all three of the dice share that same value, which occurs with probability $\dfrac{1}{6^3} = \dfrac{1}{216}$. If we have two distinct values, say $a \neq b$, then there are $3$ sequences that would result in the same values as the first rolling, which are $aab, aba,$ and $baa$. Therefore, the probability in this case is $\dfrac{3}{6^3} = \dfrac{1}{72}$. Lastly, if all three values are distinct, say $a \neq b \neq c$, there are $3! = 6$ outcomes that result in the same values appearing, so the probability in this case is $\dfrac{3!}{6^3} = \dfrac{1}{36}$. 

$$$$

By Law of Total Probability, the probability of matching values between the rolls is thus $\dfrac{1}{36} \cdot \dfrac{1}{216} + \dfrac{5}{12} \cdot \dfrac{1}{72} + \dfrac{5}{9} \cdot \dfrac{1}{36} = \dfrac{83}{3888}$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "83/3888"
    ],
    "difficulty": "medium",
    "id": "fgDQglyim1Y9rRxyYCJd",
    "internalDifficulty": 0,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 434683,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Matching Die Trio",
    "topic": "probability",
    "urlEnding": "matching-die-trio"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "fgDQglyim1Y9rRxyYCJd",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Events"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Matching Die Trio",
    "topic": "probability",
    "urlEnding": "matching-die-trio"
  }
}
```
