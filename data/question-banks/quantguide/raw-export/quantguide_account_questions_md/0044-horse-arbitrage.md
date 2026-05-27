# QuantGuide Question

## 44. Horse Arbitrage

**Metadata**

- ID: `QVwdW4K1n6kiB3qXJ8l9`
- URL: https://www.quantguide.io/questions/horse-arbitrage
- Topic: finance
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: tqd
- Tags: Arbitrage
- Premium: False
- Solution Free: False
- Version: 7
- Last Edited: 2023-11-2 15:21:52 America/New_York
- Last Edited By: Kaushik

### 题干

There are three horses numbered $1,2,$ and $3$. You have $\$1$ to make bets. You may make bets in fractions of dollars. If horse $1$ wins, you get $\$2$ back for a $\$1$ bet. If horse $2$ wins, you receive $\$4$ back for a $\$1$ bet. If horse $3$ wins, you receive $\$6$ back for a $\$1$ bet. Note that you do not receive your initial bet back. There is an arbitrage here. Find the maximum guaranteed profit that can be made from this arbitrage.


### Hint

The implied odds of the respect horses are $1/2, 1/4,$ and $1/6$, respectively. These sum to strictly less than $1$, so there is an arbitrage.

### 解答

The implied odds of the respect horses are $1/2, 1/4,$ and $1/6$, respectively. These sum to strictly less than $1$, so there is an arbitrage. We want to make a constant amount of money regardless of the outcome. Namely, if we bet our money in proportions $\$6/11, \$3/11,$ and $\$2/11$ in order on the three horses, we see that regardless of the outcome, we get a payout of $\$12/11$. However, we only bet $\$1$, yielding a profit of $\$1/11$ always. 

$$$$

We obtain our proportions because the sum of the probabilities is $11/12$, so all we need to do is bet in a way that yields a constant positive expected payout relative to the probabilities of each horse winning. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/11"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": true,
    "id": "QVwdW4K1n6kiB3qXJ8l9",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-2 15:21:52 America/New_York",
    "lastEditedBy": "Kaushik",
    "orderId": 329537,
    "source": "tqd",
    "status": "published",
    "tags": [
      {
        "tag": "Arbitrage"
      }
    ],
    "title": "Horse Arbitrage",
    "topic": "finance",
    "urlEnding": "horse-arbitrage",
    "version": 7
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "QVwdW4K1n6kiB3qXJ8l9",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Arbitrage"
      }
    ],
    "title": "Horse Arbitrage",
    "topic": "finance",
    "urlEnding": "horse-arbitrage"
  }
}
```
