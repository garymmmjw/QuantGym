# QuantGuide Question

## 156. Close Dice II

**Metadata**

- ID: `raYzCJsJXXT1z1kVICLP`
- URL: https://www.quantguide.io/questions/close-dice-ii
- Topic: probability
- Difficulty: hard
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

On average, how many times does a fair $6-$sided die need to be rolled to obtain two consecutive rolls that differ by at most $1$?

### Hint

Let $E_i$ be the expected time for this to happen given that our current roll is $i$ and $E$ be the expected value of the event we are interested in. Then $$E = 1 + \dfrac{E_1 + E_2 + E_3 + E_4 + E_5 + E_6}{6}$$ by Law of Total Expectation. By the symmetry of the fair die, $E_1 = E_6$, $E_2 = E_5$ and $E_3 = E_4$. Set up a Markov Chain to solve for the rest of the values.

### 解答

Let $E_i$ be the expected time for this to happen given that our current roll is $i$ and $E$ be the expected value of the event we are interested in. Then $$E = 1 + \dfrac{E_1 + E_2 + E_3 + E_4 + E_5 + E_6}{6}$$ by Law of Total Expectation. By the symmetry of the fair die, $E_1 = E_6$, $E_2 = E_5$ and $E_3 = E_4$. Note that $E_2 \neq E_3$ for the same reason as in Close Dice I. Using the substitution yields $E = 1 + \dfrac{E_1 + E_2 + E_3}{3}$.

$$$$

It remains to calculate equations for $E_1, E_2,$ and $E_3$. For $E_1$, we get the equation $E_1 = 1 + \dfrac{1}{6} E_1 + \dfrac{1}{6}E_2 + \dfrac{1}{3}E_3$. This is because if we roll a $1$ or $2$, we are done. If we roll a $3$ or $4$, they are same the EV, so we combine per above. If we roll a $5$ or $6$, we just get $E_2$ and $E_1$ respectively. By similar logic, we have $E_2 = 1 + \dfrac{1}{6}E_1 + \dfrac{1}{6}E_2 + \dfrac{1}{6}E_3$ and $E_3 = 1 + \dfrac{1}{3}E_1 + \dfrac{1}{6}E_2$. Solving these linear equations yields $E_1 = \dfrac{288}{115}, E_2 = \dfrac{246}{115},$ and $E_3 = \dfrac{252}{115}$. Plugging these back into the equation for $E$, $E = 1 + \dfrac{262}{115} = \dfrac{377}{115}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "377/115"
    ],
    "difficulty": "hard",
    "id": "raYzCJsJXXT1z1kVICLP",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 1163508,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Close Dice II",
    "topic": "probability",
    "urlEnding": "close-dice-ii"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "hard",
    "id": "raYzCJsJXXT1z1kVICLP",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Close Dice II",
    "topic": "probability",
    "urlEnding": "close-dice-ii"
  }
}
```
