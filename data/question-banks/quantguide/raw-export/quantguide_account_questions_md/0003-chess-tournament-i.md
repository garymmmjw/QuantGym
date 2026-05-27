# QuantGuide Question

## 3. Chess Tournament I

**Metadata**

- ID: `55UVEh3mOW4tsHDNHTxz`
- URL: https://www.quantguide.io/questions/chess-tournament-i
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Arrowstreet Capital, Five Rings
- Source: N/A
- Tags: Events, Combinatorics
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-5 10:01:51 America/New_York
- Last Edited By: Gabe

### 题干

A chess tournament has 128 players, each with a distinct rating. Assume that the player with the higher rating always wins against a lower rated opponent and that the winner proceeds to the subsequent round. What is the probability that the highest rated and second-highest rated players will meet in the final?

### Hint

Consider visualizing this problem as two sets of 64 players that halves at each round until there is a finalist.

### 解答

The highest rated player ($P_1$) will always make it to the final since no other player can knock him or her out. The second-highest rated player ($P_2$) makes it to the final if and only if he or she does not play $P_1$ beforehand, in which the $P_2$ will be knocked out before the final. In the first round, the 128 players are divided into two subgroups of 64. $P_2$ will make it to the final if he or she is in a different subgroup as $P_1$. More concretely, $P_2$ has 127 possible match-ups, 64 of which are not in the same subgroup as $P_1$. Thus, the probability that $P_1$ and $P_2$ meet in the final is $$\frac{64}{127}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "64/127"
    ],
    "companies": [
      {
        "company": "Arrowstreet Capital"
      },
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "55UVEh3mOW4tsHDNHTxz",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 10:01:51 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 14,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      },
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Chess Tournament I",
    "topic": "probability",
    "urlEnding": "chess-tournament-i",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Arrowstreet Capital"
      },
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "medium",
    "id": "55UVEh3mOW4tsHDNHTxz",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Events"
      },
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Chess Tournament I",
    "topic": "probability",
    "urlEnding": "chess-tournament-i"
  }
}
```
