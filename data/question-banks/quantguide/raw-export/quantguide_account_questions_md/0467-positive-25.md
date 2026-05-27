# QuantGuide Question

## 467. Positive 25

**Metadata**

- ID: `39x570gyKbocCCazJNfO`
- URL: https://www.quantguide.io/questions/positive-25
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: IMC
- Source: IMC
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-5 08:39:15 America/New_York
- Last Edited By: Gabe

### 题干

How many ways can you sum three positive integers to get a total of $25$?

### Hint

Set this up with an equation and think to use stars and bars.

### 解答

Let $x_1,x_2,$ and $x_3$ be the three integers. This question is asking the number of solutions to the equation $x_1 + x_ 2 + x_3 = 25$, where $x_1,x_2,x_3 \geq 1$ are integers. We can solve this by shifting this back to a problem whose solutions just need to be non-negative, as we know how to solve that with stars and bars. Since the "objects" (i.e. the individual 1's here) are indistinguishable, distribute each of the $x_i$'s $1$ to start with. Then, we have $22$ objects (i.e. 1's) remaining and the arrangements are not restricted, so this is equivalent to the number of solutions to $x_1 + x_2 + x_3 = 22$, where $x_1,x_2,x_3 \geq 0$. There are $\displaystyle \binom{22+3-1}{3-1} = \binom{24}{2} = 276$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "276"
    ],
    "companies": [
      {
        "company": "IMC"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "39x570gyKbocCCazJNfO",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 08:39:15 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3743334,
    "source": "IMC",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Positive 25",
    "topic": "probability",
    "urlEnding": "positive-25",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "IMC"
      }
    ],
    "difficulty": "easy",
    "id": "39x570gyKbocCCazJNfO",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Positive 25",
    "topic": "probability",
    "urlEnding": "positive-25"
  }
}
```
