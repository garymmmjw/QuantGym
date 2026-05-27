# QuantGuide Question

## 718. Discrete Walker

**Metadata**

- ID: `DWJNE5ZQBb0PgUoOCVbz`
- URL: https://www.quantguide.io/questions/discrete-walker
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Goldman Sachs, Five Rings
- Source: glassdoor
- Tags: Conditional Probability
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-25 20:24:36 America/New_York
- Last Edited By: Gabe

### 题干

Consider a random walk on a discrete line of $11$ points ($0$ through $10$). Supposed you have equal probability of stepping up or down at each movement. If you reach either $10$ or $0$ you must stop. If you start at point $6$, what is the probability that you arrive at $10$ before you arrive at $0$?

### Hint

This is just a standard symmetric random walk problem.

### 解答

This is just a standard symmetric random walk problem. The probability that $10$ is hit before $0$ starting at $6$ is just $\dfrac{6}{10}$ by considering the ratio of the distance from the lower boundary $(0)$ to our starting position $(6)$ to the entire length of our region $(10)$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3/5"
    ],
    "companies": [
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "DWJNE5ZQBb0PgUoOCVbz",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-25 20:24:36 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5860161,
    "source": "glassdoor",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Discrete Walker",
    "topic": "probability",
    "urlEnding": "discrete-walker",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "easy",
    "id": "DWJNE5ZQBb0PgUoOCVbz",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Discrete Walker",
    "topic": "probability",
    "urlEnding": "discrete-walker"
  }
}
```
