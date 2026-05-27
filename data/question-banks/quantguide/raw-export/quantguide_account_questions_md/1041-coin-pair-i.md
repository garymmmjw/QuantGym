# QuantGuide Question

## 1041. Coin Pair I

**Metadata**

- ID: `a6gJ3wvUnWta3C7rqpSZ`
- URL: https://www.quantguide.io/questions/coin-pair-i
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Jane Street
- Source: Jane Street
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-26 11:06:21 America/New_York
- Last Edited By: Gabe

### 题干

Four fair coins appear in front of you. You flip all four at once and observe the outcomes of the coins. After seeing the outcomes, you may turn any pair of coins over. You may not flip over a single coin without flipping over another. You can iterate this process as many times as you would like. Assuming optimal play, find the expected number of heads that appear.

### Hint

We can flip over any pair of coins after flipping. Therefore, what are the possible ending states, and what initial states lead to those?

### 解答

We can flip over any pair of coins after flipping. Clearly, if we obtain $4$ heads from the start, we wouldn't turn over any. If we obtain no heads, we can turn over two pairs of $2$ coins to get all heads. Similarly, we can do this if we obtain $2$ tails. If we obtain $3$ heads, we have no benefit by turning over any coins. If we obtain $1$ heads, we turn over a pair of tails and end with $3$ heads. The probability we end with an even number of heads from the $4$ flips is $\dfrac{1 + 6 + 1}{16} = \dfrac{1}{2}$, as there are $\displaystyle \binom{4}{2} = 6$ ways to obtain $2$ heads and $2$ tails. 

$$$$

Therefore, the probability we end with either $3$ or $4$ heads from the $4$ flips is $\dfrac{1}{2}$. The answer is just $\dfrac{4+3}{2} = \dfrac{7}{2}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "7/2"
    ],
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "a6gJ3wvUnWta3C7rqpSZ",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-26 11:06:21 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8496198,
    "source": "Jane Street",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Coin Pair I",
    "topic": "probability",
    "urlEnding": "coin-pair-i",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "easy",
    "id": "a6gJ3wvUnWta3C7rqpSZ",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Coin Pair I",
    "topic": "probability",
    "urlEnding": "coin-pair-i"
  }
}
```
