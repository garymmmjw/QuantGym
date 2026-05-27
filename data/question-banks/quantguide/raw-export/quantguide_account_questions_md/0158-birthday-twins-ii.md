# QuantGuide Question

## 158. Birthday Twins II

**Metadata**

- ID: `n2GsUc6zk7ZbhuEU23UF`
- URL: https://www.quantguide.io/questions/birthday-twins-ii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Two Sigma, Arrowstreet Capital, Jump Trading, Five Rings, Goldman Sachs
- Source: N/A
- Tags: Combinatorics
- Premium: True
- Solution Free: False
- Version: 4
- Last Edited: 2023-11-7 12:24:44 America/New_York
- Last Edited By: Gabe

### 题干

Assuming 365 days in a year, how many people do we need in a class to make the probability that at least two people have the same birthday more than $\frac{1}{2}$?

### Hint

In order for the probability of at least two people having the same birthday to be greater than $\frac{1}{2}$, then the probability of no one having the same birthday must be less than $\frac{1}{2}$.

### 解答

In order for the probability of at least two people having the same birthday to be greater than $\frac{1}{2}$, then the probability of no one having the same birthday must be less than $\frac{1}{2}$. Let there be $n$ people in the class. The probability that there are no birthday collisions is $\frac{365}{365} \times \frac{364}{365} \times ... \times \frac{365-n+1}{365} < \frac{1}{2}$. The smallest such $n$ is $23$, which can be found via calculator.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "23"
    ],
    "companies": [
      {
        "company": "Two Sigma"
      },
      {
        "company": "Arrowstreet Capital"
      },
      {
        "company": "Jump Trading"
      },
      {
        "company": "Five Rings"
      },
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "n2GsUc6zk7ZbhuEU23UF",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 12:24:44 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1187007,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Birthday Twins II",
    "topic": "probability",
    "urlEnding": "birthday-twins-ii",
    "version": 4
  },
  "list_summary": {
    "companies": [
      {
        "company": "Two Sigma"
      },
      {
        "company": "Arrowstreet Capital"
      },
      {
        "company": "Jump Trading"
      },
      {
        "company": "Five Rings"
      },
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "medium",
    "id": "n2GsUc6zk7ZbhuEU23UF",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Birthday Twins II",
    "topic": "probability",
    "urlEnding": "birthday-twins-ii"
  }
}
```
