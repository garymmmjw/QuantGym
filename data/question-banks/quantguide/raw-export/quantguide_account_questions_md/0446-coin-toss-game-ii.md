# QuantGuide Question

## 446. Coin Toss Game II

**Metadata**

- ID: `eP0pDnsrjh0N6pubonOk`
- URL: https://www.quantguide.io/questions/coin-toss-game-ii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: Kaushik - MSE (https://math.stackexchange.com/questions/675678/probability-of-coin-game?rq=1)
- Tags: Events
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-1 09:34:52 America/New_York
- Last Edited By: Gabe

### 题干

Alice and Bob are playing a game where they toss a fair coin. The first person to flip two heads (not necessarily sequentially) wins the game. Alice starts and then gives the coin to Bob and the cycle repeats until one of them has flipped two heads. What is the probability that Alice wins this game?

### Hint

There are several states to this situation so try using Markov Chains.

### 解答

There are several states to this situation so we can solve this question using Markov Chains. 
Let $P_{x,y}$ be the probability Alice wins at the state where Alice has flipped $x$ heads and Bob has flipped $y$ heads and it is Alice's turn. We then arrive at these following equations:
$$P_{0,0} = \frac{1}{4}\cdot P_{0,0}+\frac{1}{4}\cdot P_{1,0}+\frac{1}{4}\cdot P_{0,1}+\frac{1}{4}\cdot P_{1,1}$$
$$P_{1,0} = \frac{1}{2}+\frac{1}{4}\cdot P_{1,0}+\frac{1}{4}\cdot P_{1,1}$$
$$P_{0,1} = \frac{1}{4}\cdot P_{0,1}+\frac{1}{4}\cdot P_{1,1}$$
$$P_{1,1} = \frac{1}{2}+\frac{1}{4}\cdot P_{1,1}$$
Solving these equations yields $P_{0,0}=\frac{16}{27}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "16/27"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "eP0pDnsrjh0N6pubonOk",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-1 09:34:52 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3544902,
    "source": "Kaushik - MSE (https://math.stackexchange.com/questions/675678/probability-of-coin-game?rq=1)",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Coin Toss Game II",
    "topic": "probability",
    "urlEnding": "coin-toss-game-ii",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "eP0pDnsrjh0N6pubonOk",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Coin Toss Game II",
    "topic": "probability",
    "urlEnding": "coin-toss-game-ii"
  }
}
```
