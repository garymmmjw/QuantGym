# QuantGuide Question

## 946. Dice Strike Price

**Metadata**

- ID: `SlUESBb7jeqeeETpsj2g`
- URL: https://www.quantguide.io/questions/dice-strike-price
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: Conditional Expectation
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-8-26 14:29:18 America/New_York
- Last Edited By: Gabe

### 题干

A fair $12-$sided die has the values $1,3,\dots,23$ on it. What is the fair price of an option with strike price $12$, where you are paid out the numerical value in dollars of the resultant face of the die upon rolling it? 

### Hint

Condition on the die value being less than or more than 12. What is the expected profit in each case?

### 解答

We know that with probability $\dfrac{1}{2}$, we are lower than $12$ in value, so we don't exercise the option. Otherwise, we are larger than $12$, and each with probability $\dfrac{1}{12}$, we profit $1,3,5,7,9,11$. This is because we subtract $12$ from each of the values larger than $12$. Therefore, our fair price is $$\dfrac{1}{2} \cdot 0 + \dfrac{1 + 3 + 5 + 7 + 9 + 11}{12} = 3$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "SlUESBb7jeqeeETpsj2g",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 14:29:18 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7707876,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Dice Strike Price",
    "topic": "probability",
    "urlEnding": "dice-strike-price",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "SlUESBb7jeqeeETpsj2g",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Dice Strike Price",
    "topic": "probability",
    "urlEnding": "dice-strike-price"
  }
}
```
