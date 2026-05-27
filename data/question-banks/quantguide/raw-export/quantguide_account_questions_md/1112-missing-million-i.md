# QuantGuide Question

## 1112. Missing Million I

**Metadata**

- ID: `G8anf2suCfBHhpkoMmAt`
- URL: https://www.quantguide.io/questions/missing-million-i
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Optiver
- Source: optiver
- Tags: Conditional Probability
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-5 09:28:18 America/New_York
- Last Edited By: Gabe

### 题干

You are on a game show with $3$ doors in front of you. One of the doors has $\$1$ million inside, while the other two are empty. In the final round, the host lets you spin a wheel that may reveal which door the $\$1$ million is in.  This wheel will tell you the location of the $\$1$ million $3/5$ of the time. Otherwise, it tells you nothing, and you must guess uniformly at random. What is the probability you locate the $\$1$ million door?

### Hint

Condition on whether or not the wheel locates the money.

### 解答

We condition on whether or not the wheel locates the money. With probability $3/5$, it does so guaranteed. Otherwise, with probability $2/5$, you have a $1/3$ chance of guessing the location of the money correctly, as one of the three doors has the money. Therefore, the answer is $$\dfrac{3}{5} + \dfrac{2}{5} \cdot \dfrac{1}{3} = \dfrac{11}{15}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "11/15"
    ],
    "companies": [
      {
        "company": "Optiver"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "G8anf2suCfBHhpkoMmAt",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 09:28:18 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9102116,
    "source": "optiver",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Missing Million I",
    "topic": "probability",
    "urlEnding": "missing-million-i",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Optiver"
      }
    ],
    "difficulty": "easy",
    "id": "G8anf2suCfBHhpkoMmAt",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Missing Million I",
    "topic": "probability",
    "urlEnding": "missing-million-i"
  }
}
```
