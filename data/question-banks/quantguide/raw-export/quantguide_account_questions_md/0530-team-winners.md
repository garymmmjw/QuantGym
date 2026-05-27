# QuantGuide Question

## 530. Team Winners

**Metadata**

- ID: `pVl7wqWkpIGbcYAW7Ssh`
- URL: https://www.quantguide.io/questions/team-winners
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: IIT JEE
- Tags: Events
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 09:43:34 America/New_York
- Last Edited By: Gabe

### 题干

A tournament consistent of $32$ teams plays in a round-robin style tournament. This means that every single team plays every other team exactly one time. Suppose that every team is equally skilled so that every team is equally likely to beat any other team in a given match. Each team keeps track of how many wins they have. Find the probability that every team has won a distinct number of games at the end of the tournament. The answer will be in the form $\dfrac{a!}{2^b}$ for integers $a$ and $b$, where $b$ is maximal. Find $a + b$.

### Hint

How many ways are there to assign win counts to the teams? How many total tournament outcomes are there.

### 解答

There are a total of $\displaystyle \binom{32}{2} = 496$ games played in this tournament, meaning that there are $2^{496}$ total outcomes of the tournament. We want the number of outcomes where each team wins a distinct amount of games. However, this fixes the tournament outcome completely, as each team must have a distinct integer $0,1,\dots, 31$ wins, and note that $0 + 1 + \dots + 31 = \dfrac{31 \cdot 32}{2} = 496$. Therefore, we have already fixed the outcomes of the tournament, so we really just need to assign labels to which team obtains which amount of wins. There are $32!$ ways to do this, so our answer is $\dfrac{32!}{2^{496}}$. This means $a = 32, b = 496$, so $a + b = 528$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "528"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "pVl7wqWkpIGbcYAW7Ssh",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 09:43:34 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4231507,
    "source": "IIT JEE",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Team Winners",
    "topic": "probability",
    "urlEnding": "team-winners"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "pVl7wqWkpIGbcYAW7Ssh",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Team Winners",
    "topic": "probability",
    "urlEnding": "team-winners"
  }
}
```
