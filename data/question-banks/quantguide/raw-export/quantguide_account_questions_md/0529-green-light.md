# QuantGuide Question

## 529. Green Light

**Metadata**

- ID: `PU6sQgZ1PKbVGoRyVGdi`
- URL: https://www.quantguide.io/questions/green-light
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: TQD
- Tags: Combinatorics
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-8-26 14:30:51 America/New_York
- Last Edited By: Gabe

### 题干

There are 4 green balls and 11 red balls in a bin. We draw out balls without replacement. Find the probability that the 4th green ball is picked out on the 9th draw.

### Hint

Fix the 4th green ball in the 9th spot. How many green balls are in the first $8$ spots?

### 解答

Fix the 4th green ball in the 9th spot. This means that there are $3$ green balls in the first $8$ spots. There are $\displaystyle \binom{8}{3}$ ways to pick the locations of those in the first $8$ spots. There are $\displaystyle \binom{15}{4}$ ways to pick the locations of the $4$ green balls with no restrictions, so the probability in question is just $\dfrac{\binom{8}{3}}{\binom{15}{4}} = \dfrac{8}{195}$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "8/195"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "PU6sQgZ1PKbVGoRyVGdi",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 14:30:51 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4216776,
    "randomizable": "",
    "source": "TQD",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Green Light",
    "topic": "probability",
    "urlEnding": "green-light",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "PU6sQgZ1PKbVGoRyVGdi",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Green Light",
    "topic": "probability",
    "urlEnding": "green-light"
  }
}
```
