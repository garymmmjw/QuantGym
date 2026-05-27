# QuantGuide Question

## 74. Dice Products

**Metadata**

- ID: `3pRZVQ0Sfn6QiHLint8n`
- URL: https://www.quantguide.io/questions/dice-products
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: original
- Tags: Events, Combinatorics
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 11:43:03 America/New_York
- Last Edited By: Gabe

### 题干

Take the product of 2 fair dice rolls. What is the probability that it is divisible by $6$?


### Hint

Count the possibilities, there are only 36 possible dice rolls.

### 解答

If one of the dice is $6$, we know the product will always be divisible by $6$. There are 11 rolls that involve the number $6$ (5 pairs with distinct numbers × 2 orderings + 1 way to roll double 6). The other way to make a product divisible by 6 is to roll a number with factors of $2$ and $3$. Since we counted rolls with 6 already, we leave those aside. So we’ll need either a $2$ or $4$ on one die and a $3$ on the other. In this case we have 2 possibilities for the first die, 1 possibility for the second, and 2 different orderings. $2×1×2 = 4$ combinations. Adding this $4$ with the previously calculated $11$ and we have $15$ rolls which result in a number divisible by $6$. There are 36 total possibilities of 2 rolls, each being the same probability of occurring, so the probability will be $15/36 = 42.5\%$


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0.425",
      "15/36",
      "5/12"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "3pRZVQ0Sfn6QiHLint8n",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 11:43:03 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 501558,
    "source": "original",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      },
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Dice Products",
    "topic": "probability",
    "urlEnding": "dice-products"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "3pRZVQ0Sfn6QiHLint8n",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Events"
      },
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Dice Products",
    "topic": "probability",
    "urlEnding": "dice-products"
  }
}
```
