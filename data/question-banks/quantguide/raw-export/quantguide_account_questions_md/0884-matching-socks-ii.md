# QuantGuide Question

## 884. Matching Socks II

**Metadata**

- ID: `VjeLeEqtmSQZAxIsb0wK`
- URL: https://www.quantguide.io/questions/matching-socks-ii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Jane Street
- Source: glassdoor
- Tags: Expected Value
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-9 21:28:55 America/New_York
- Last Edited By: Gabe

### 题干

6 distinct pairs of socks are in a drawer. You're in a hurry to pack for a trip, so you draw out 8 socks uniformly at random from the drawer. Find the expected number of pairs of socks that remain in the drawer.

### Hint

Set up indicators representing the events that each pair of socks is in the drawer after drawing out $8$ socks and apply linearity of expectation.

### 解答

Since we want to count the expected number of pairs that remain in the drawer, it makes sense to use indicators and linearity of expected here to count. Label the pairs of socks $1-6$ and let $I_i$ be the indicator that pair $i$ is still in the drawer after drawing out the pairs of socks. Then $T = I_1 + \dots + I_6$ gives the total number of pairs of socks remaining in the drawer. By linearity of expectation and the exchangeability of the sock pairs, $\mathbb{E}[T] = 6\mathbb{E}[I_1]$.

$$$$

$\mathbb{E}[I_1]$ is just the probability of the event that $I_1$ indicates. Namely, this is the probability that pair $1$ is still in the drawer after drawing out the socks. To not pick any of pair 1 socks, we must pick $8$ socks from the other $10$, so there are $\displaystyle \binom{10}{8}$ ways to do this. There are $\displaystyle \binom{12}{8}$ ways to pick $8$ socks in general, so the probability (and hence $\mathbb{E}[I_1])$ is $\dfrac{\binom{10}{8}}{\binom{12}{8}} = \dfrac{1}{11}$. Therefore, $\mathbb{E}[T] = \dfrac{6}{11}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "6/11"
    ],
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "VjeLeEqtmSQZAxIsb0wK",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-9 21:28:55 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7263625,
    "source": "glassdoor",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Matching Socks II",
    "topic": "probability",
    "urlEnding": "matching-socks-ii",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "medium",
    "id": "VjeLeEqtmSQZAxIsb0wK",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Matching Socks II",
    "topic": "probability",
    "urlEnding": "matching-socks-ii"
  }
}
```
