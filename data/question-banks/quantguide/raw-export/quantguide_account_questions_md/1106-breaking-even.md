# QuantGuide Question

## 1106. Breaking Even

**Metadata**

- ID: `2WQNrGyUlisH3oIrwECn`
- URL: https://www.quantguide.io/questions/breaking-even
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Events
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-5 10:27:51 America/New_York
- Last Edited By: Gabe

### 题干

Julie and Judy bet on a series of 8 successive coin tosses. After each toss, assuming that both players have at least $\$1$, Julie gives Judy $\$1$ if it is heads, and Judy gives Julie $\$1$ if it is tails. They both start out with $\$4$ each. Compute the probability that they break even. 

### Hint

In order to break even after $8$ rounds, Julie and Judy must (1) end up with $\$4$ each, and (2) never reach $\$0$.

### 解答

In order to break even after $8$ rounds, Julie and Judy must (1) end up with $\$4$ each, and (2) never reach $\$0$. To satisfy the first condition, the coin must end up as heads for 4 of the 8 tosses. The second condition is satisfied for any arrangement of $4$ heads and $4$ tails except for $HHHHTTTT$ and $TTTTHHHH$, which is when Julie and Judy begin the fifth round with $\$0$. Hence, there are a total of $8 \choose 4$ -2 possible head-tail arrangements such that Julie and Judy break even. Putting it all together, we find the probability of breaking even to be $$\left[\binom{8}{4} - 2 \right] \left( \frac{1}{2}\right)^8 = \frac{17}{64}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "17/64"
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "2WQNrGyUlisH3oIrwECn",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 10:27:51 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9054123,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Breaking Even",
    "topic": "probability",
    "urlEnding": "breaking-even",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "2WQNrGyUlisH3oIrwECn",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Breaking Even",
    "topic": "probability",
    "urlEnding": "breaking-even"
  }
}
```
