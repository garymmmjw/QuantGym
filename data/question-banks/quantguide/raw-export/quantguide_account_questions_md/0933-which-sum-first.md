# QuantGuide Question

## 933. Which Sum First?

**Metadata**

- ID: `b12v4xB4ze0IIQFHkVKb`
- URL: https://www.quantguide.io/questions/which-sum-first
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: https://math.stackexchange.com/questions/4797304/obtain-a-sum-of-4-before-a-sum-of-2
- Tags: Conditional Probability
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-10-31 22:40:51 America/New_York
- Last Edited By: Gabe

### 题干

When rolling two dice continuously, what's the probability that you roll a sum of $5$ before you roll a sum of $2$?

### Hint

How many combinations of $5$-sum and $2$-sum are there? We have to end with one of these.

### 解答

To start, we must see that out of $36$ possible combinations, there are $4$ combimations which will yield a sum of $5$, and only $1$ combination that will yield a sum of $2$. If we roll infinitely, we will assuredly stop at some point, either hitting a sum of $2$ or $5$. Therefore, we can ignore all other possibilities and simply calculate the likelihood that our $4$ combinations of dice rolls that sum to $5$, will come before the $1$ combination of dice rolls that sum up to $2$. This is given by $\frac{4}{4+1}$ (number of wins over total cases) yielding the probability of $4/5$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "4/5"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "b12v4xB4ze0IIQFHkVKb",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-31 22:40:51 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7617483,
    "source": "https://math.stackexchange.com/questions/4797304/obtain-a-sum-of-4-before-a-sum-of-2",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Which Sum First?",
    "topic": "probability",
    "urlEnding": "which-sum-first",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "b12v4xB4ze0IIQFHkVKb",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Which Sum First?",
    "topic": "probability",
    "urlEnding": "which-sum-first"
  }
}
```
