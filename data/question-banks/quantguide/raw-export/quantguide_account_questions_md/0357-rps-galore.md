# QuantGuide Question

## 357. RPS Galore

**Metadata**

- ID: `I1oKDYirl4oTsrZoZXoW`
- URL: https://www.quantguide.io/questions/rps-galore
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 2
- Companies: SIG
- Source: N/A
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Jack and Jane play Rock (R) Paper (P) Scissors (S) 10 times. It is known that each round had a winner. Additionally, it is known that Jack played R, P, and S, respectively, $3,1,$ and $6$ times, while Jane played R, P, and S, respectively, $2,4,$ and $4$ times. How many wins did Jack have? If it is not possible to know, answer "-1".

### Hint

Note that if Jack plays S, Jane must have played either R or P to get a distinct winner.

### 解答

Note that if Jack plays S, Jane must have played either R or P to get a distinct winner. Therefore, from the 6 times Jack played S, they would have 4 wins from the times that Jane played P and 2 losses from the two R. From the last 4 games, Jane played S 4 times, so they would 3 losses to the three R from Jack and $1$ win from the time that they played P. Therefore, Jack has 7 total wins.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "7"
    ],
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "id": "I1oKDYirl4oTsrZoZXoW",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 2730199,
    "source": "",
    "status": "published",
    "tags": [],
    "title": "RPS Galore",
    "topic": "brainteasers",
    "urlEnding": "rps-galore"
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "id": "I1oKDYirl4oTsrZoZXoW",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "RPS Galore",
    "topic": "brainteasers",
    "urlEnding": "rps-galore"
  }
}
```
