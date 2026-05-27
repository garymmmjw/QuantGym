# QuantGuide Question

## 655. Ping Pong Tournament II

**Metadata**

- ID: `s7qJKtF1lLQugJtS4sY3`
- URL: https://www.quantguide.io/questions/ping-pong-tournament-ii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: Five Rings, Two Sigma
- Source: Original
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-30 09:59:45 America/New_York
- Last Edited By: Gabe

### 题干

$$50$ people are competing in a ping pong tournament where there is only one ping pong table. The competitors are numbered $1$ through $50$. Suppose that if two competitors meet, the one with the larger number wins. Two competitors are chosen at random, and the loser is removed from the tournament. The winner moves on to the next round, where their opponent is chosen at random. This process is repeated until one person is left (a total $49$ rounds will be played). Compute the probability that competitor $49$ is still in the tournament after the first $10$ rounds have been played.

### Hint

In order for competitor 49 to survive the first 10 rounds, either (1) competitor 49 does not appear until the 11th round, or (2) competitor 49 plays their first round within the first 10 rounds, and competitor 50 does not play within the first 10 rounds. 

### 解答

In order for competitor 49 to survive the first 10 rounds, either (1) competitor 49 does not appear until the 11th round, or (2) competitor 49 plays their first round within the first 10 rounds, and competitor 50 does not play within the first 10 rounds. 

$$$$

Consider case 1. Note that there are a total of 39 rounds between rounds 11 and 49, inclusive. If we want competitor 49 to play their first round after the 10th round, then competitor 49 must be at position 12 or later (39 possible positions) in a random ordering of the 50 competitors. The probability of case 1 occuring is then $\dfrac{39}{50}$. 

$$$$

Next, consider case 2. In this case, in a random ordering of 50 competitors, competitor 49 must be among the first 11 competitors, and competitor 50 must be among the last 39 competitors. This occurs with probability $\dfrac{\binom{11}{1} \binom{39}{1} 48!}{50!} = \dfrac{429}{2450}$. By countable additivity, we find the answer to be $\dfrac{39}{50} + \dfrac{429}{2450} = \dfrac{234}{245}.$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "234/245"
    ],
    "companies": [
      {
        "company": "Five Rings"
      },
      {
        "company": "Two Sigma"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "s7qJKtF1lLQugJtS4sY3",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-30 09:59:45 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5265583,
    "source": "Original",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Ping Pong Tournament II",
    "topic": "probability",
    "urlEnding": "ping-pong-tournament-ii",
    "version": 1
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
    "difficulty": "medium",
    "id": "s7qJKtF1lLQugJtS4sY3",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Ping Pong Tournament II",
    "topic": "probability",
    "urlEnding": "ping-pong-tournament-ii"
  }
}
```
