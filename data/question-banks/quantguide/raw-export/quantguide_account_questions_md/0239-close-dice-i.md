# QuantGuide Question

## 239. Close Dice I

**Metadata**

- ID: `ftHDrgxpAlmqXttLp3pP`
- URL: https://www.quantguide.io/questions/close-dice-i
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: N/A
- Tags: Expected Value
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

On average, how many times does a fair $6-$sided die need to be rolled to obtain two consecutive rolls that differ by exactly $1$?

### Hint

Let $E_i$ be the expected time for this to happen given that our current roll is $i$ and $E$ be the expected value of the event we are interested in. Then $$E = 1 + \dfrac{E_1 + E_2 + E_3 + E_4 + E_5 + E_6}{6}$$ by Law of Total Expectation. By the symmetry of the fair die, $E_1 = E_6$, $E_2 = E_5$ and $E_3 = E_4$. Note that $E_2 \neq E_3$ because intuitively $E_1$ and $E_6$ should be larger since there is only one possible value we can roll in the next roll that will give a difference of $1$. Set up the rest of the Markov Chain.

### 解答

Let $E_i$ be the expected time for this to happen given that our current roll is $i$ and $E$ be the expected value of the event we are interested in. Then $$E = 1 + \dfrac{E_1 + E_2 + E_3 + E_4 + E_5 + E_6}{6}$$ by Law of Total Expectation. By the symmetry of the fair die, $E_1 = E_6$, $E_2 = E_5$ and $E_3 = E_4$. Note that $E_2 \neq E_3$ because intuitively $E_1$ and $E_6$ should be larger since there is only one possible value we can roll in the next roll that will give a difference of $1$. For $E_3$ the valid values are $2$ and $4$, whereas for $E_2$ it would be $1$ and $3$. Using the substitution yields $E = 1 + \dfrac{E_1 + E_2 + E_3}{3}$.

$$$$

It remains to calculate equations for $E_1, E_2,$ and $E_3$. We know $E_1 = \dfrac{1}{6} \cdot 1 + \dfrac{1+E_1}{6} + \dfrac{1+E_3}{6} + \dots + \dfrac{1+E_6}{6} = 1 + \dfrac{1}{3}E_1 + \dfrac{1}{6} E_2 + \dfrac{1}{3}E_3$ because of our substitutions with $E_i = E_{7-i}$. Namely, we get $E_1 + 1$ as the expected value when we roll a $1$ or $6$. We get $E_3 + 1$ as the expected value when we roll $3$ or $4$. Lastly, we get $E_2 + 1$ as the expected value when we roll $5$. If we roll a $2$, then it takes $1$ roll. 

$$$$

Using this same logic, $$E_2 = 1 + \dfrac{1}{6}E_1 + \dfrac{1}{3}E_2 + \dfrac{1}{6}E_3$$ $$E_3 = 1 + \dfrac{1}{3}E_1 + \dfrac{1}{6}E_2 + \dfrac{1}{6}E_3$$

To solve for $E_1,E_2,$ and $E_3$, we now have three equations with three unknowns. One can check that the solution is $E_1 = \dfrac{70}{17}, E_2 = \dfrac{58}{17}$, and $E_3 = \dfrac{60}{17}$, so plugging this into our equation for $E$, the actual expected value we are interested in, $$E = 1 + \dfrac{188}{51} = \dfrac{239}{51}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "239/51"
    ],
    "difficulty": "medium",
    "id": "ftHDrgxpAlmqXttLp3pP",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 1892785,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Close Dice I",
    "topic": "probability",
    "urlEnding": "close-dice-i"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "ftHDrgxpAlmqXttLp3pP",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Close Dice I",
    "topic": "probability",
    "urlEnding": "close-dice-i"
  }
}
```
