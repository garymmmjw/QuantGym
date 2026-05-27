# QuantGuide Question

## 1165. Dice Labels

**Metadata**

- ID: `uM75fsEkl10mMjErKAyZ`
- URL: https://www.quantguide.io/questions/dice-labels
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: SIG, DRW
- Source: SIG Quizlet (https://quizlet.com/542824675/sig-flash-cards/)
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-4 23:23:47 America/New_York
- Last Edited By: Gabe

### 题干

How many distinct ways can you label a $6$ sided dice if you wipe off all the numbers? Arrangements that can be formed by rotating the die around are not considered distinct.

### Hint

Fix one side of the die and then find the possibilities for the opposite side. Then count the orderings for the last 4 faces.

### 解答

Lets start with placing the number $1$ on any side and let's consider it the top. Then there’s $5$ different numbers that can be on the opposite side of the dice. Finally, with the $4$ remaining numbers, there's $4!$ different orderings of the numbers but this counts the same orderings but starting on different faces so we divide by $4$. Think about it this way, lets say we have 1 on the top and 6 on the bottom. The last 4 numbers are 2, 3, 4, and 5. There are $4!$ orderings of these numbers. But let's specifically consider the order $2, 3, 4, 5$. This order is the exact same as $5, 2, 3, 4$ and $4, 5, 2, 3$ and $3, 4, 5, 2$. As you can see, any order will have $4$ different orderings and placements, so we divide by $4$. Putting everything together, $5* 4!/4 = 5*3! = 30$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "30"
    ],
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "DRW"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "uM75fsEkl10mMjErKAyZ",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-4 23:23:47 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9687212,
    "source": "SIG Quizlet (https://quizlet.com/542824675/sig-flash-cards/)",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Dice Labels",
    "topic": "probability",
    "urlEnding": "dice-labels",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "DRW"
      }
    ],
    "difficulty": "medium",
    "id": "uM75fsEkl10mMjErKAyZ",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Dice Labels",
    "topic": "probability",
    "urlEnding": "dice-labels"
  }
}
```
