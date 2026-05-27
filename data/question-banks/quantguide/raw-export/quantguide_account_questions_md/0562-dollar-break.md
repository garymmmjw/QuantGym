# QuantGuide Question

## 562. Dollar Break

**Metadata**

- ID: `A9fQhYuHp8uZXP6QcDt8`
- URL: https://www.quantguide.io/questions/dollar-break
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: quantquestions
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

What is the maximum amount of money in coins you can have in your pocket and not be able to make change for a dollar? The coin denominations in the USA are pennies ($0.01$ dollars), nickels ($0.05$ dollars), dimes ($0.10$ dollars), and quarters ($0.25$ dollars).

### Hint

What is the maximum amount of money in coins you can have in your pocket and not be able to make change for a dollar?

### 解答

The most clear choice is that we should have $4$ pennies. This is so that we can't create any other coin using these 4 pennies. Next, let's look at quarters. We only want to have 1 quarter because if we have more than one, we will be able to create change potentially by $50$ cents with 2 quarters. We want to ensure that doesn't happen. Next, we want to load in as many dimes as possible. We can put in $9$ dimes and still have no change for a dollar since the closest we can get is $99$ cents (7 dimes, 1 quarter, 4 pennies). We can't add in any nickels, as then we would be able to make a dollar with 1 quarter, 7 dimes, and a nickel. Therefore, our maximal value is $0.25 + 9 \cdot 0.10 + 4 \cdot 0.01 = 1.19$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1.19"
    ],
    "difficulty": "easy",
    "id": "A9fQhYuHp8uZXP6QcDt8",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 4511128,
    "source": "quantquestions",
    "status": "published",
    "tags": [],
    "title": "Dollar Break",
    "topic": "brainteasers",
    "urlEnding": "dollar-break"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "A9fQhYuHp8uZXP6QcDt8",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Dollar Break",
    "topic": "brainteasers",
    "urlEnding": "dollar-break"
  }
}
```
