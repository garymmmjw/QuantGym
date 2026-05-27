# QuantGuide Question

## 292. Coin Toss Game I

**Metadata**

- ID: `6aDaMPdRGJuwsU9Bhrmb`
- URL: https://www.quantguide.io/questions/coin-toss-game-i
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: Kaushik - Variation of MSE question
- Tags: Events
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-1 09:34:08 America/New_York
- Last Edited By: Gabe

### 题干

Alice and Bob are playing a game where they toss a fair coin. The first person to flip both a heads and a tails (not necessarily in that order) wins the game. Alice starts and then gives the coin to Bob and the cycle repeats until one of them has flipped both a heads and a tails. What is the probability that Alice wins this game?

### Hint

Create a probability diagram and see if you notice a pattern. 

### 解答

Its worth noting that it doesn't matter what each player flips in their first two flips. They'll each have a $\frac{1}{2}$ chance to get the other flip they need after each of their first flips and assuming they have the coin. Thus, starting on the third flip, Alice will have a $\frac{1}{2}$ chance to win the game right there. If she doesn't get the other flip she needed on the third flip, Alice needs Bob to flip what he flipped previously. If that happens, we start back at a state similar to the third flip. Given this, we can model this situation as a singular state equation. Say $P$ is the probability that Alice wins in the state of the third flip (both Alice and Bob need one specific roll). Then Alice will win half the time and a fourth of the time we repeat the same state. So
$$ P = \frac{1}{2} + \frac{1}{4} \cdot P$$
Thus $P = \frac{2}{3}$ which is the probability Alice wins.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2/3"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "6aDaMPdRGJuwsU9Bhrmb",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-1 09:34:08 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2259551,
    "randomizable": "",
    "source": "Kaushik - Variation of MSE question",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Coin Toss Game I",
    "topic": "probability",
    "urlEnding": "coin-toss-game-i",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "6aDaMPdRGJuwsU9Bhrmb",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Coin Toss Game I",
    "topic": "probability",
    "urlEnding": "coin-toss-game-i"
  }
}
```
