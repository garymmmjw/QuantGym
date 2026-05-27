# QuantGuide Question

## 75. Tennis Deuces II

**Metadata**

- ID: `5G6cIu6qq27xQgrqWQ7w`
- URL: https://www.quantguide.io/questions/tennis-deuces-ii
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Maven Securities, Optiver
- Source: Kaushik - Maven Glassdoor
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 3
- Last Edited: 2023-11-4 20:08:25 America/New_York
- Last Edited By: Gabe

### 题干

Andrew and Beth are playing a game of tennis. Tennis scoring works off these rules:
$$$$
1. Scoring starts at 0-0 and when someone wins a point, their score goes up by $1$ (thus either 1-0 or 0-1). 
$$$$
2. If a player gets $4$ points before the other player, they win unless the score was 3-3 (deuce). If the score was 3-3, a player has to win by two points to win the game. 
$$$$
How many ways are there to get to a score of 4-4?


### Hint

What score do you have to always get before reaching 4-4?

### 解答

From "Tennis Deuces I", we know there are $20$ ways to get to 3-3. We know we have to get to 3-3 before getting to 4-4 since any score of 4-$x$ where $x$ isn't a number greater than or equal to 3 means the game ended prematurely. From here, to make 4-4, either Andrew wins a point and then Beth does or vice-versa which is two different outcomes. $20\cdot2=40$ ways.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "40"
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
    "id": "5G6cIu6qq27xQgrqWQ7w",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-4 20:08:25 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 504857,
    "source": "Kaushik - Maven Glassdoor",
    "status": "published",
    "tags": [],
    "title": "Tennis Deuces II",
    "topic": "probability",
    "urlEnding": "tennis-deuces-ii",
    "version": 3
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
    "id": "5G6cIu6qq27xQgrqWQ7w",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Tennis Deuces II",
    "topic": "probability",
    "urlEnding": "tennis-deuces-ii"
  }
}
```
