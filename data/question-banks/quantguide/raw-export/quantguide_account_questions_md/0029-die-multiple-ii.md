# QuantGuide Question

## 29. Die Multiple II

**Metadata**

- ID: `aHeX3jCmO38u83jzBuoa`
- URL: https://www.quantguide.io/questions/die-multiple-ii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: common q
- Tags: Expected Value
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 13:58:06 America/New_York
- Last Edited By: Gabe

### 题干

You roll a fair $6-$sided die until the sum of all upfaces is a multiple of $6$. Find the expected number of rolls performed.

### Hint

On each roll, regardless of what was rolled prior, there is a $\dfrac{1}{6}$ probability that the sum will be divisible by $6$.

### 解答

Let $S_k = X_1 + \dots + X_k$ represent the sum of the first $k$ die rolls, with $X_i$ being the value of the $i$th die roll. On each roll, regardless of what was rolled prior, there is a $\dfrac{1}{6}$ probability that the sum will be divisible by $6$. This is because exactly $1$ of the $6$ values on each roll makes the sum divisible by $6$, no matter what the current sum is. Therefore, the number of rolls needed is $\text{Geom}\left(\dfrac{1}{6}\right)$, which has mean $6$. Therefore, our answer is $6$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "6"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "aHeX3jCmO38u83jzBuoa",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 13:58:06 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 202323,
    "source": "common q",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Die Multiple II",
    "topic": "probability",
    "urlEnding": "die-multiple-ii"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "aHeX3jCmO38u83jzBuoa",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Die Multiple II",
    "topic": "probability",
    "urlEnding": "die-multiple-ii"
  }
}
```
