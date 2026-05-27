# QuantGuide Question

## 11. Basketball Practice II

**Metadata**

- ID: `V4FUGBnHeKWmdCRMvNmY`
- URL: https://www.quantguide.io/questions/basketball-practice-ii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: Original
- Tags: Expected Value
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Frank is shooting free throws. He makes his first free throw and misses his second free throw. For $n \geq 3$, the probability of making the $n$th free throw is equal to the proportion of free throws he made during his first $n-1$ attempts. How many free throws can Frank expect to make in 100 attempts?

### Hint

Write a recurrence relation for $E_n$, the expected number of free throws after $n$ total attempts.

### 解答

Let $E_n$ denote the expected number of free throws made after $n$ total attempts. Then, $E_n = \frac{E_{n-1}}{n - 1} + E_{n-1}$. This is because there is a probability of $\frac{E_{n-1}}{n - 1}$ that the $n$-th free throw attempt is made, increasing the total by 1. Simplifying the expression, we find $E_n = \frac{n}{n-1} E_{n-1}$. Note that $E_3 = \frac{3}{2}$. The recurrence relation can be rewritten in terms of $n$: $E_n = \frac{n}{2}$. So, for $n = 100$, we have $E_{100} = 50$.  This can also be seen by the first iteration of this question, as our total throw we make is uniform on $\{1,2,\dots,99\}$, which has mean $50$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "50"
    ],
    "companies": [],
    "difficulty": "medium",
    "id": "V4FUGBnHeKWmdCRMvNmY",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 60617,
    "randomizable": "",
    "source": "Original",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Basketball Practice II",
    "topic": "probability",
    "urlEnding": "basketball-practice-ii"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "V4FUGBnHeKWmdCRMvNmY",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Basketball Practice II",
    "topic": "probability",
    "urlEnding": "basketball-practice-ii"
  }
}
```
