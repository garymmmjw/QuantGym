# QuantGuide Question

## 545. Stamp Sum

**Metadata**

- ID: `QT6Fyi9gKtARojvUzcVY`
- URL: https://www.quantguide.io/questions/stamp-sum
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Jane Street, Goldman Sachs
- Source: glassdoor
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-7 19:45:06 America/New_York
- Last Edited By: Gabe

### 题干

You have infinitely many stamps of values $5$ and $21$. Find the largest value that is unable to be expressed as a combination of these stamps.

### Hint

Note that $21,42,63,$ and $84$ are the smallest values that can be expressed as change that are equivalent to $1,2,3,$ and $4$ modulo $5$, respectively.

### 解答

Note that $21,42,63,$ and $84$ are the smallest values that can be expressed as change that are equivalent to $1,2,3,$ and $4$ modulo $5$, respectively. Afterwards, if we add some amount of $5$ value stamps to these, we are able to obtain stamps of any number equivalent to those in modulo $5$. Therefore, the largest value we can't create would is something $4$ modulo $5$, as that is the highest starting point. Namely, the largest integer that can't be created here is $79$, as anything that is $4$ modulo $5$ and at least $84$ can be created, so $79$ is our answer.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "79"
    ],
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "QT6Fyi9gKtARojvUzcVY",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "lastEditedAt": "2023-9-7 19:45:06 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4350512,
    "source": "glassdoor",
    "status": "published",
    "tags": [],
    "title": "Stamp Sum",
    "topic": "brainteasers",
    "urlEnding": "stamp-sum",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "easy",
    "id": "QT6Fyi9gKtARojvUzcVY",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Stamp Sum",
    "topic": "brainteasers",
    "urlEnding": "stamp-sum"
  }
}
```
