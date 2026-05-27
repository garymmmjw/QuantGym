# QuantGuide Question

## 571. Tennis Deuces I

**Metadata**

- ID: `gk9JBGae2PL9dVM02fxK`
- URL: https://www.quantguide.io/questions/tennis-deuces
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Maven Securities, Optiver
- Source: Kaushik - Maven Glassdoor
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 7
- Last Edited: 2023-11-7 12:21:49 America/New_York
- Last Edited By: Gabe

### 题干

How many ways are there to get a score of $40$-$40$ (deuce) in tennis? Scores in tennis follow $0, 15, 30, 40$. 

### Hint

How many total points are needed to get to deuce and how many does each person have to win?

### 解答

Both players need to win exactly $3$ points against each other to obtain a deuce. This means that out of a length of $6$ points, $3$ come from Person 1 and $3$ come from Person 2. Thus we can choose $3$ positions out of the total $6$ points for Person 1 to score which gives us $\binom{6}{3}$ which yields $20$ ways.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "20"
    ],
    "companies": [
      {
        "company": "Maven Securities"
      },
      {
        "company": "Optiver"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "gk9JBGae2PL9dVM02fxK",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 12:21:49 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4594649,
    "source": "Kaushik - Maven Glassdoor",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Tennis Deuces I",
    "topic": "probability",
    "urlEnding": "tennis-deuces",
    "version": 7
  },
  "list_summary": {
    "companies": [
      {
        "company": "Maven Securities"
      },
      {
        "company": "Optiver"
      }
    ],
    "difficulty": "easy",
    "id": "gk9JBGae2PL9dVM02fxK",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Tennis Deuces I",
    "topic": "probability",
    "urlEnding": "tennis-deuces"
  }
}
```
