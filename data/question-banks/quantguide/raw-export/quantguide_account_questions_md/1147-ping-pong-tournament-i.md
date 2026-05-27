# QuantGuide Question

## 1147. Ping Pong Tournament I

**Metadata**

- ID: `wA9mxWx993jbp9ctLglC`
- URL: https://www.quantguide.io/questions/ping-pong-tournament-i
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Five Rings, Two Sigma
- Source: Original
- Tags: Combinatorics
- Premium: True
- Solution Free: False
- Version: 3
- Last Edited: 2023-11-5 10:01:33 America/New_York
- Last Edited By: Gabe

### 题干

$$50$ people are competing in a ping pong tournament where there is only one ping pong table. The competitors are numbered $1$ through $50$. Suppose that if two competitors meet, the one with the larger number wins. Two competitors are chosen at random, and the loser is removed from the tournament. The winner moves on to the next round, where their opponent is chosen at random. This process is repeated until one person is left (a total $49$ rounds will be played). Compute the probability that competitors $49$ and $50$ play in the final round.

### Hint

There are two ways for competitors 49 and 50 to play in the final round: (1) competitor 49 does not play until the final round, or (2) competitor 50 does not play until the final round. 

### 解答

When competitor 50 appears, they will beat out all other competitors until they win the tournament. Similarly, if competitor 49 appears before competitor 50, they will beat out all other competitors until they play competitor 50. There are two ways for competitors 49 and 50 to play in the final round: (1) competitor 49 does not play until the final round, or (2) competitor 50 does not play until the final round. Let's consider the first case. Notice that we can rewrite our problem as: ``after ordering numbers 1 through 50, what is the probability that 49 appears last?'' This probability is simply $\frac{49!}{50!} = \frac{1}{50}.$ Next, let's consider the second case. Similarly, we can instead solve ``after ordering numbers 1 through 50, what is the probability that 50 appears last?'' This probability is again just $\frac{49!}{50!} = \frac{1}{50}$. Since these two cases are mutually exclusive events, we employ countable additivity to determine the answer to be $\frac{1}{25}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/25"
    ],
    "companies": [
      {
        "company": "Five Rings"
      },
      {
        "company": "Two Sigma"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "wA9mxWx993jbp9ctLglC",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 10:01:33 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9453099,
    "source": "Original",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Ping Pong Tournament I",
    "topic": "probability",
    "urlEnding": "ping-pong-tournament-i",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "Five Rings"
      },
      {
        "company": "Two Sigma"
      }
    ],
    "difficulty": "easy",
    "id": "wA9mxWx993jbp9ctLglC",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Ping Pong Tournament I",
    "topic": "probability",
    "urlEnding": "ping-pong-tournament-i"
  }
}
```
