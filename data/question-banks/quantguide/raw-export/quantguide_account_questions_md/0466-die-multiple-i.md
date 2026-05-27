# QuantGuide Question

## 466. Die Multiple I

**Metadata**

- ID: `7UNaUDYBshU6vnBYZ8oH`
- URL: https://www.quantguide.io/questions/die-multiple-i
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: Probability and Stochastic Calculus Quant Interview Questions
- Tags: Conditional Expectation
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

A fair $6-$sided die is rolled until the sum of all upfaces is even. Find the expected number of rolls performed.

### Hint

Condition on the parity of the first roll.

### 解答

We condition on the parity of the first roll. Let $N$ be the number of rolls needed for this and $E$ be the event that the first roll is even. Then $$\mathbb{E}[N] = \mathbb{E}[N \mid E]\mathbb{P}[E] + \mathbb{E}[N \mid E^c]\mathbb{P}[E^c]$$ As the die is fair, $\mathbb{P}[E] = \mathbb{P}[E^c] = \dfrac{1}{2}$. If the first roll is even, we are done in one roll, so $\mathbb{E}[N \mid E ] = 1$. If the first roll is odd, then we just need to roll another odd value to obtain an even sum. There is probability $\dfrac{1}{2}$ per trial of rolling an odd value, so the distribution of the number of rolls needed to see another odd value is $\text{Geom}(0.5)$, which has mean $2$. Therefore, $\mathbb{E}[N \mid E^c] = 3$, as we must account for the $1$ roll at the beginning. This means our total answer is $\mathbb{E}[N] = \dfrac{1+3}{2} = 2$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2"
    ],
    "companies": [],
    "difficulty": "easy",
    "id": "7UNaUDYBshU6vnBYZ8oH",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 3739336,
    "source": "Probability and Stochastic Calculus Quant Interview Questions",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Die Multiple I",
    "topic": "probability",
    "urlEnding": "die-multiple-i"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "7UNaUDYBshU6vnBYZ8oH",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Die Multiple I",
    "topic": "probability",
    "urlEnding": "die-multiple-i"
  }
}
```
