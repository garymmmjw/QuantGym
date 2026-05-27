# QuantGuide Question

## 812. Whole Lotta Dice

**Metadata**

- ID: `bXm6BRwU3odtCJkSjwRO`
- URL: https://www.quantguide.io/questions/whole-lotta-dice
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: SIG
- Source: Random SIG Question
- Tags: Conditional Probability
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 13:59:45 America/New_York
- Last Edited By: Gabe

### 题干

We have $100$ fair $100-$sided dice in front of us and we toss them all at the same time. What is the probability that the resulting sum of the faces is divisible by $100$?


### Hint

Don't be fooled by the number of dice! There is a simpler solution to this question than counting outcomes. 

### 解答

No matter what the sum of any $99$ of the dice, there is only one face on the $100$th die that will yield a sum that's divisible by $100$. For example, say the first $99$ rolls add up to $3075$. Only rolling a $25$ on the last die will make the sum divisible by $100$. Thus the answer is $\dfrac{1}{100}$.


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/100"
    ],
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "bXm6BRwU3odtCJkSjwRO",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 13:59:45 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6624627,
    "source": "Random SIG Question",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Whole Lotta Dice",
    "topic": "probability",
    "urlEnding": "whole-lotta-dice"
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "medium",
    "id": "bXm6BRwU3odtCJkSjwRO",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Whole Lotta Dice",
    "topic": "probability",
    "urlEnding": "whole-lotta-dice"
  }
}
```
