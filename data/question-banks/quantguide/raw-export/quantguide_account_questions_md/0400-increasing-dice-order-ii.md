# QuantGuide Question

## 400. Increasing Dice Order II

**Metadata**

- ID: `u23wSPIpnyInJYyimH5T`
- URL: https://www.quantguide.io/questions/increasing-dice-order-ii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: IMC
- Source: N/A
- Tags: Combinatorics, Conditional Probability
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-5 00:30:16 America/New_York
- Last Edited By: Gabe

### 题干

You roll a standard $10$-sided dice $5$ times. The probability that the values are strictly increasing can be written in the form:
$$\frac{x}{10^5}$$

What is $x$?

### Hint

If a collection of values are strictly increasing, then they must be unique: $$
    \mathbb{P}(\text{strictly increasing})
    = \mathbb{P}(\text{increasing} \,|\, \text{unique}) \cdot \mathbb{P}(\text{unique})$$.

### 解答

If a collection of values are strictly increasing, then they must be unique. $$     \mathbb{P}(\text{strictly increasing})     = \mathbb{P}(\text{increasing} \,|\, \text{unique}) \cdot \mathbb{P}(\text{unique})$$ For any set of $5$ unique integer values between $1$ and $10$ inclusive, there exists only 1 ordering out of a total of $5!$ possible orderings such that the values are strictly increasing.  $$     \mathbb{P}(\text{strictly increasing} \,|\, \text{unique}) = \frac{1}{5!}$$      Finally, let's compute $\mathbb{P}(\text{unique})$.  $$     \mathbb{P}(\text{unique}) = \frac{10 \cdot 9 \cdot 8 \cdot 7 \cdot 6}{10^5} $$  Putting it all together, we get:  \[\begin{aligned}     \mathbb{P}(\text{strictly increasing}) &= \frac{1}{5!} \frac{10 \cdot 9 \cdot 8 \cdot 7 \cdot 6}{10^5} \\     &= \frac{252}{10^5} \end{aligned}\] The value of x is $252$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "252"
    ],
    "companies": [
      {
        "company": "IMC"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "u23wSPIpnyInJYyimH5T",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 00:30:16 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3141374,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Increasing Dice Order II",
    "topic": "probability",
    "urlEnding": "increasing-dice-order-ii",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "IMC"
      }
    ],
    "difficulty": "medium",
    "id": "u23wSPIpnyInJYyimH5T",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Increasing Dice Order II",
    "topic": "probability",
    "urlEnding": "increasing-dice-order-ii"
  }
}
```
