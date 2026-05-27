# QuantGuide Question

## 1139. Odd Valued Roll

**Metadata**

- ID: `1H12poLag3zagUqZCkJr`
- URL: https://www.quantguide.io/questions/odd-valued-roll
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: IMC
- Source: IMC GD
- Tags: Expected Value, Discrete Random Variables
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-30 18:37:37 America/New_York
- Last Edited By: Gabe

### 题干

On average, how many times must a fair $12-$sided die with values $1-12$ be rolled to obtain an odd value showing up?

### Hint

$$6$ of the $12$ values on the die are odd

### 解答

$$6$ of the $12$ values are odd, meaning there is probability $\dfrac{1}{2}$ per roll of showing an odd value. Therefore, the number of rolls needed to see an odd value is $N \sim \text{Geom}(1/2)$ distributed, which has mean $2$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2"
    ],
    "companies": [
      {
        "company": "IMC"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "1H12poLag3zagUqZCkJr",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 18:37:37 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9398572,
    "randomizable": "",
    "source": "IMC GD",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Odd Valued Roll",
    "topic": "probability",
    "urlEnding": "odd-valued-roll",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "IMC"
      }
    ],
    "difficulty": "easy",
    "id": "1H12poLag3zagUqZCkJr",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Odd Valued Roll",
    "topic": "probability",
    "urlEnding": "odd-valued-roll"
  }
}
```
