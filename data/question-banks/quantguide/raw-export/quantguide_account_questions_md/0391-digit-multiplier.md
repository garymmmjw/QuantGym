# QuantGuide Question

## 391. Digit Multiplier

**Metadata**

- ID: `2OKOjFIqXt3HL9lItY8E`
- URL: https://www.quantguide.io/questions/digit-multiplier
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: IIT JEE
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Four numbers from $\{1,2,\dots, 9\}$ are selected with repetition allowed. Find the probability that the product of the four integers has a units digit of $1,3,7,$ or $9$.

### Hint

What needs to be true for the product to end in those four digits?

### 解答

For the product to end in those four digits, we already know that none of the four integers can be even. Otherwise, the product would be even. We also know that none of the integers can be $5$, as then the product of the integers will end in a $5$ as well. Therefore, this is equivalent to just asking the probability that each of the digits we select is in the subset $\{1,3,7,9\}$. The probability of this for each digit is $\dfrac{4}{9}$, so the probability of interest is $\dfrac{4^4}{9^4} = \dfrac{256}{6561}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "256/6561"
    ],
    "difficulty": "easy",
    "id": "2OKOjFIqXt3HL9lItY8E",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 3035184,
    "randomizable": "",
    "source": "IIT JEE",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Digit Multiplier",
    "topic": "probability",
    "urlEnding": "digit-multiplier"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "2OKOjFIqXt3HL9lItY8E",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Digit Multiplier",
    "topic": "probability",
    "urlEnding": "digit-multiplier"
  }
}
```
