# QuantGuide Question

## 648. Adjacent Birthdays

**Metadata**

- ID: `oVwyLQecE2wY3LpLpPVv`
- URL: https://www.quantguide.io/questions/adjacent-birthdays
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: 50 challenge probs, additional question
- Tags: Expected Value
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 13:58:33 America/New_York
- Last Edited By: Gabe

### 题干

Find the average number of people needed for there to be a pair of people with adjacent birthdays. Round your answer to the nearest tenth. You may assume the standard assumptions of the birthday problem i.e. $365$ days in a year, birthdays are independent, etc. We count December $31$ and January $1$ to be adjacent. It may be good to use computer software to evaluate the answer.

### Hint

Let $N$ be the number of people needed for this to occur. Then $\mathbb{E}[N] = \displaystyle \sum_{k=1}^{\infty} \mathbb{P}[N \geq k]$. What does the event $\{N \geq k\}$ mean here?

### 解答

Let $N$ be the number of people needed for this to occur. Then $\mathbb{E}[N] = \displaystyle \sum_{k=1}^{\infty} \mathbb{P}[N \geq k]$ by our alternative form of expectation. The event $\{N \geq k\}$ here means that none of the first $k-1$ people in the room share adjacent birthdays. Each birthday removes $3$ possible days for the remaining people to have. Therefore, the $i$th person entering the room has $365 - 3(i-1) = 368 - 3i$ possible days for their birthday to not have it overlap with any other birthday. This means that $$\mathbb{P}[N \geq k] = \dfrac{365}{365} \cdot \dfrac{362}{365} \cdot \dfrac{359}{365} \cdot \dots \cdot \dfrac{368 - 3k}{365} = \dfrac{\displaystyle \prod_{i=1}^k (368-3i)}{365^k}$$ Now, we sum over the support of $N$. There are $365$ possible birthdays, and each person entering removes up to $3$ days. Therefore, we know that $N \leq 122$ with probability $1$, as with $122$ people, there must be a pair that is adjacent. This is because if none were adjacent, the $122$ people would block out $122 \cdot 3 = 366 > 365$ days, which is not possible. Thus, two must overlap. Therefore, we can stop our sum at $122$. Our final expectation is $$\mathbb{E}[N] = \displaystyle \sum_{k=1}^{122} \dfrac{\displaystyle \prod_{i=1}^k (368-3i)}{365^k} \approx 13.5$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "13.5"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "oVwyLQecE2wY3LpLpPVv",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 13:58:33 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5214635,
    "source": "50 challenge probs, additional question",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Adjacent Birthdays",
    "topic": "probability",
    "urlEnding": "adjacent-birthdays"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "oVwyLQecE2wY3LpLpPVv",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Adjacent Birthdays",
    "topic": "probability",
    "urlEnding": "adjacent-birthdays"
  }
}
```
