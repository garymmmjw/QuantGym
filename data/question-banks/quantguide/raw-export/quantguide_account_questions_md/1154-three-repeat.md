# QuantGuide Question

## 1154. Three Repeat I

**Metadata**

- ID: `PI5qrOODQK7twGElvR8Z`
- URL: https://www.quantguide.io/questions/three-repeat
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Old Mission, Jane Street, TransMarket Group, Optiver, SIG
- Source: N/A
- Tags: Combinatorics
- Premium: True
- Solution Free: False
- Version: 3
- Last Edited: 2023-11-8 10:01:20 America/New_York
- Last Edited By: Gabe

### 题干

A fair coin is flipped $5$ times. Find the probability of obtaining exactly $3$ consecutive heads somewhere in the $5$ flips.

### Hint

What are the possible samples of such a space?

### 解答

Note that the sequence must in the form $HHH--, -HHH-,$ or $--HHH$. For the first form, the first dash must be $T$ so that the run doesn't extend. The second dash can be anything, so this gives 2 options. For the second form, both dashes must be tails because the $HHH$ is adjacent to both dashes, so this is just one possibility. The last sequence must have a $T$ in the second dash so that the run doesn't extend. The first dash can be either outcome, so this gives 2 sequences as well. Therefore, we have 5 sequences corresponding to this outcome, so the probability is $\dfrac{5}{32}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "5/32"
    ],
    "companies": [
      {
        "company": "Old Mission"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "TransMarket Group"
      },
      {
        "company": "Optiver"
      },
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "PI5qrOODQK7twGElvR8Z",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-8 10:01:20 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9530601,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Three Repeat I",
    "topic": "probability",
    "urlEnding": "three-repeat",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "Old Mission"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "TransMarket Group"
      },
      {
        "company": "Optiver"
      },
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "id": "PI5qrOODQK7twGElvR8Z",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Three Repeat I",
    "topic": "probability",
    "urlEnding": "three-repeat"
  }
}
```
