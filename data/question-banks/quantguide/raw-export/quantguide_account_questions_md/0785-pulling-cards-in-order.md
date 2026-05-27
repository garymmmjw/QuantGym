# QuantGuide Question

## 785. Pulling Cards in Order

**Metadata**

- ID: `4erEt461NfGxb0hYtQn4`
- URL: https://www.quantguide.io/questions/pulling-cards-in-order
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: SIG
- Source: SIG Quizlet (https://quizlet.com/542824675/sig-flash-cards/)
- Tags: Combinatorics
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-8-26 14:12:47 America/New_York
- Last Edited By: Gabe

### 题干

You have a $100$ card deck in front of you containing the numbers from 1 to 100. You randomly pick one card after the other $4$ times (without replacement). What is the probability that the cards you picked out are in ascending order?

### Hint

Imagine you pull out the four cards at once instead of one at a time. What are the odds they are in order in your hand?


### 解答

Instead of thinking about the situation as picking out cards one at a time, think about picking 4 cards out of the 100 all at once. Since all the numbers are unique, there is only 1 way the numbers can show up in ascending order out of 4! orderings. Thus the answer is $\dfrac{1}{4!} = \dfrac{1}{24}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/24"
    ],
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "4erEt461NfGxb0hYtQn4",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 14:12:47 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6385345,
    "source": "SIG Quizlet (https://quizlet.com/542824675/sig-flash-cards/)",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Pulling Cards in Order",
    "topic": "probability",
    "urlEnding": "pulling-cards-in-order",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "id": "4erEt461NfGxb0hYtQn4",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Pulling Cards in Order",
    "topic": "probability",
    "urlEnding": "pulling-cards-in-order"
  }
}
```
