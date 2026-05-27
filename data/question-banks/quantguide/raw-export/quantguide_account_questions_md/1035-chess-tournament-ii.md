# QuantGuide Question

## 1035. Chess Tournament II

**Metadata**

- ID: `joIZohRgiDquoOBnjOmI`
- URL: https://www.quantguide.io/questions/chess-tournament-ii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: Gabe
- Tags: Events
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-5 10:02:09 America/New_York
- Last Edited By: Gabe

### 题干

A chess tournament has 128 players, each with a distinct rating. Assume that the player with the higher rating always wins against a lower rated opponent and that the winner proceeds to the subsequent round. Since the tournament's structure resembles that of a knockout bracket, 7 total rounds are played, including the final. What is the probability that the highest rated and the third-highest rated players will meet in the final? 

### Hint

Divide the knockout tournament into two subgroups of size $64$ each. The top 2 players must be in the same group while the 3rd highest player must be in the opposite group.

### 解答

Let's divide our knockout tournament into two subgroups of size 64 each. For ease in explanation, let $x_1$ denote the highest-rated player, let $x_2$ denote the second-highest rated player, and let $x_3$ denote the third-highest rated explanation. Suppose $x_1$ is in subgroup $1$, without loss of generality. Then, there are 63 slots left in subgroup 1 for the remaining 127 players. The only way for $x_3$ and $x_1$ to meet in the finals is if $x_1$ and $x_2$ are in one subgroup, and $x_3$ is in the other subgroup. This occurs with probability $$\frac{63 \cdot 64}{127 \cdot 126} = \frac{32}{127}$$ 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "32/127"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "joIZohRgiDquoOBnjOmI",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 10:02:09 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8444457,
    "source": "Gabe",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Chess Tournament II",
    "topic": "probability",
    "urlEnding": "chess-tournament-ii",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "joIZohRgiDquoOBnjOmI",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Chess Tournament II",
    "topic": "probability",
    "urlEnding": "chess-tournament-ii"
  }
}
```
