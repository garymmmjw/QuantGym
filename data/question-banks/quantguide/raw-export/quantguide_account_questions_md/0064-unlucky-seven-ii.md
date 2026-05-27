# QuantGuide Question

## 64. Unlucky Seven II

**Metadata**

- ID: `RxL3arXjqxT0pG3Q5Q7w`
- URL: https://www.quantguide.io/questions/unlucky-seven-ii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Jane Street
- Source: N/A
- Tags: Conditional Expectation, Expected Value
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-13 19:43:00 America/New_York
- Last Edited By: Gabe

### 题干

You are given a fair $6-$sided die and you roll it. You can either choose to keep your roll and receive the observed value in dollars. Alternatively, you are allowed to roll again, but if the sum of your two rolls is at least $7$, you pay the value equal to your first roll. If the sum of the two rolls is less than $7$, you receive the sum of the two observed values in dollars. Assuming optimal play, what is your expected payout?

### Hint

Condition on the value of the cube and find the expected payout upon re-roll in each case.

### 解答

Condition on the value of the first roll. If we roll a $1$, we either lose $\$1$ with probability $\dfrac{1}{6}$ (if we roll a $6$ on the second roll). Otherwise, we make a total of $2,3,\dots,6$, each with probability $\dfrac{1}{6}$. Therefore our expected payout if we roll again is $\dfrac{1}{6} \cdot (-1) + \dfrac{2+3+4+5+6}{6} = \dfrac{19}{6} > 1$. This implies we should roll again if we receive a $1$. 

$$$$

If we roll a $2$, then with probability $\dfrac{1}{3}$ we lose $\$2$ (if we roll a 5 or 6). Otherwise, we receive $3,4,5,$ or $6$ with equal probability $\dfrac{1}{6}$. Therefore, the expected value upon rolling again is $\dfrac{1}{3} \cdot (-2) + \dfrac{3+4+5+6}{6} = \dfrac{7}{3} > 2$. This implies we should roll. If we roll a $3$, then with probability $\dfrac{1}{2}$ we lose $\$3$ (rolling 4 or more). Otherwise, we earn $4,5,$ or $6$ each with probability $\dfrac{1}{6}$. Therefore, our expected profit upon rolling again is $\dfrac{1}{2} \cdot (-3) + \dfrac{4 + 5 + 6}{6} = 1 < 3$. Therefore, for any value $3$ or more, we should not roll again. This implies that our expected value on this game with this strategy is $\dfrac{\frac{19}{6} + \frac{14}{6} + 3 + 4 + 5 + 6}{6} = \dfrac{47}{12}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "47/12"
    ],
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "RxL3arXjqxT0pG3Q5Q7w",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-13 19:43:00 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 457613,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Unlucky Seven II",
    "topic": "probability",
    "urlEnding": "unlucky-seven-ii",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "medium",
    "id": "RxL3arXjqxT0pG3Q5Q7w",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Unlucky Seven II",
    "topic": "probability",
    "urlEnding": "unlucky-seven-ii"
  }
}
```
