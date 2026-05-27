# QuantGuide Question

## 447. Bakery Boxes

**Metadata**

- ID: `idVQRAhpfr2N7E2i99QI`
- URL: https://www.quantguide.io/questions/bakery-boxes
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: original
- Tags: Combinatorics, Expected Value, Conditional Expectation
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-5 08:31:29 America/New_York
- Last Edited By: Gabe

### 题干

A bakery manager uniformly at random selects an integer (name it $k$) between 1 and 4, inclusive. He then chooses from $k$ distinct desert types at his shop to create a gift basket consisting of $k$ items. Find the expected number of ways that the manager can create the gift basket.

### Hint

Condition on the number that the bakery manager selects. Then, you can use the Stars and Bars method to compute the number of baskets.

### 解答

Given that he chooses the value $k$, we want to find the number of non-negative integer solutions to the equation $x_1 + \dots + x_k = k$. This is because we can treat each commodity he puts in the gift basket as a separate "item", and we want the number of distinct combinations of different quantities of those items. By Stars and Bars, this is $\displaystyle \binom{k + k - 1}{k - 1} = \binom{2k-1}{k-1}$. Therefore, since each value of $k$ is equally likely to be selected, the answer will just be $\dfrac{1}{4}\left[\displaystyle \binom{1}{0} + \binom{3}{1} + \binom{5}{2} + \binom{7}{3}\right] = \dfrac{49}{4}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "49/4"
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "idVQRAhpfr2N7E2i99QI",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-5 08:31:29 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3562329,
    "source": "original",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Bakery Boxes",
    "topic": "probability",
    "urlEnding": "bakery-boxes",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "idVQRAhpfr2N7E2i99QI",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Bakery Boxes",
    "topic": "probability",
    "urlEnding": "bakery-boxes"
  }
}
```
