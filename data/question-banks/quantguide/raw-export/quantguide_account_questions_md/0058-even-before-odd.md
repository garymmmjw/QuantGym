# QuantGuide Question

## 58. Odd Before Even

**Metadata**

- ID: `6KXIzLLReSxB7LOgMRVZ`
- URL: https://www.quantguide.io/questions/even-before-odd
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: IMC, SIG
- Source: IMC
- Tags: Conditional Probability, Combinatorics
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-8 09:37:07 America/New_York
- Last Edited By: Gabe

### 题干

Suppose you are continually rolling a standard fair $6-$sided die. Find the probability that all of the odd values show up before the first even value.

### Hint

We need three things to happen: The first odd must show up before the first even, the second odd must show up before the first even, and the final odd must show up before the first even. This is really a chain of conditional probabilities, as the second odd showing up must occur given the first odd has already shown up.

### 解答

We need three things to happen: The first odd must show up before the first even, the second odd must show up before the first even, and the final odd must show up before the first even. This is really a chain of conditional probabilities, as the second odd showing up must occur given the first odd has already shown up.

$$$$

The probability the first odd shows up before the first even is $\dfrac{1}{2}$, as the first roll is either odd or even with equal probability, so the first roll must appear odd. Afterwards, given the first odd has appeared, we now have reduced our sample space to $5$ outcomes of interest. If we roll the odd that has already appeared, it is as if we ignore it. Therefore, given one of the other $5$ outcomes occurs, the probability it is odd is $\dfrac{2}{5}$, as two of the remaining $5$ outcomes are odd integers. By the same logic, once the second odd has occurred, if we see either of those two odds again, we ignore. Conditional on one of the other $4$ outcomes appearing, the probability that it is the final odd is $\dfrac{1}{4}$, as $1$ of the last $4$ outcomes is odd.

$$$$

This implies that the probability of this event is $\dfrac{1}{2}\cdot \dfrac{2}{5} \cdot \dfrac{1}{4} = \dfrac{1}{20}$.

$$$$

Alternatively, consider all $6! = 720$ ways to arrange the orders of the appearance of the $6$ values. We must have $1,3,5$ appear in the first $3$ spots (in any order), while $2,4,6$ must appear in the last three spots in any order. There are $3! \cdot 3! = 6 \cdot 6 = 36$ ways to arrange the values satisfying the condition, so the probability of this occurring is $\dfrac{36}{720} = \dfrac{1}{20}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/20"
    ],
    "companies": [
      {
        "company": "IMC"
      },
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "6KXIzLLReSxB7LOgMRVZ",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-8 09:37:07 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 422973,
    "source": "IMC",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Odd Before Even",
    "topic": "probability",
    "urlEnding": "even-before-odd",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "IMC"
      },
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "id": "6KXIzLLReSxB7LOgMRVZ",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Odd Before Even",
    "topic": "probability",
    "urlEnding": "even-before-odd"
  }
}
```
