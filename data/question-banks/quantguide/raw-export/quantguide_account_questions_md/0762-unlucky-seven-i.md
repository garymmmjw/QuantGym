# QuantGuide Question

## 762. Unlucky Seven I

**Metadata**

- ID: `Hk5G20Mytsg7Q9YHkD6L`
- URL: https://www.quantguide.io/questions/unlucky-seven-i
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Jane Street
- Source: N/A
- Tags: Conditional Expectation, Expected Value
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-13 19:42:41 America/New_York
- Last Edited By: Gabe

### 题干

You are given a fair $6-$sided die and you roll it. You can either choose to keep your roll and receive the observed value in dollars. Alternatively, you are allowed to roll again, but if the sum of your two rolls is at least $7$, you pay the value equal to your first roll. If the sum of the two rolls is less than $7$, you receive the second observed value in dollars. Assuming optimal play, what is your expected payout?

### Hint

Condition on the value of the cube and find the expected payout upon reroll in each case.

### 解答

The first observation that can be made is that if we roll a $3, 4,5,$ or $6$, we should not consider rolling again. This is because we can only improve our stance by rolling a number larger, but the sum is guaranteed to go over $7$ in any of these cases if our first roll is any of these numbers. Therefore, we should look at just rolling a $1$ or $2$. If we roll a $1$, we either lose $\$1$ with probability $\dfrac{1}{6}$ (if we roll a $6$ on the second roll). Otherwise, we make $1,2,\dots,5$, each with probability $\dfrac{1}{6}$. Therefore our expected payout if we roll again is $\dfrac{1}{6} \cdot (-1) + \dfrac{1+2+3+4+5}{6} = \dfrac{7}{3} > 1$. This implies we should roll again if we receive a $1$. If we roll a $2$, then with probability $\dfrac{1}{3}$ we lose $\$2$ (if we roll a 5 or 6). Otherwise, we receive $1,2,3,$ or $4$ with equal probability $\dfrac{1}{6}$. Therefore, the expected value upon rolling again is $\dfrac{1}{3} \cdot (-2) + \dfrac{1+2+3+4}{6} = 1 < 2$. This implies we should not roll again and keep the two. As a result, we keep all values that aren't $1$, and otherwise, we roll a $1$ again. This yields an expected value of $\dfrac{\frac{7}{3} + 2 + 3 + 4 + 5 + 6}{6} = \dfrac{67}{18}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "67/18"
    ],
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "Hk5G20Mytsg7Q9YHkD6L",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-13 19:42:41 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6210988,
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
    "title": "Unlucky Seven I",
    "topic": "probability",
    "urlEnding": "unlucky-seven-i",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "medium",
    "id": "Hk5G20Mytsg7Q9YHkD6L",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Unlucky Seven I",
    "topic": "probability",
    "urlEnding": "unlucky-seven-i"
  }
}
```
