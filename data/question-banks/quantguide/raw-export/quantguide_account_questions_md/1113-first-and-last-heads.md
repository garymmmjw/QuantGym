# QuantGuide Question

## 1113. First and Last Heads

**Metadata**

- ID: `ryJ4WFtwfWuNKFHrbfP8`
- URL: https://www.quantguide.io/questions/first-and-last-heads
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Citadel
- Source: citadel OA
- Tags: Discrete Random Variables
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-4 23:56:54 America/New_York
- Last Edited By: Gabe

### 题干

A fair coin is flipped $5$ times. Find the probability that the number of heads in the first $3$ flips is equal to the number of heads in the last $2$ flips. 

### Hint

Condition based on the number of heads in both segments.

### 解答

We condition based on the number of heads in both segments. The only way to get $0$ heads in both segments is $TTTTT$, so that yields $1$ outcome. To get one head in both segments, there are $3$ initial sequences in the first $3$ flips that have $1$ head (namely, $HTT, THT,$ and $TTH$) and $2$ sequences in the last two flips that have $1$ head ($HT$ and $TH$). This yields $3 \cdot 2 = 6$ outcomes here. Lastly, to get two heads in each segment, there are $3$ initial sequences in the first $3$ flips that have $2$ heads (namely, $HHT, HTH,$ and $THH$). There is only one sequence with $2$ heads in the last two flips. Therefore, this yields $3 \cdot 1 = 3$ sequences. Adding these all up, we get $1 + 6 + 3= 10$ sequences where this is satisfied. There are $2^5 = 32$ total sequences of $5$ flips, so our answer is $$\dfrac{10}{32} = \dfrac{5}{16}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "5/16"
    ],
    "companies": [
      {
        "company": "Citadel"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "ryJ4WFtwfWuNKFHrbfP8",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-4 23:56:54 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9110661,
    "source": "citadel OA",
    "status": "published",
    "tags": [
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "First and Last Heads",
    "topic": "probability",
    "urlEnding": "first-and-last-heads",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Citadel"
      }
    ],
    "difficulty": "easy",
    "id": "ryJ4WFtwfWuNKFHrbfP8",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "First and Last Heads",
    "topic": "probability",
    "urlEnding": "first-and-last-heads"
  }
}
```
