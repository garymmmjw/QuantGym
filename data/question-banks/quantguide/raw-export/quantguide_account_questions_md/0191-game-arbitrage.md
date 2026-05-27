# QuantGuide Question

## 191. Game Arbitrage I

**Metadata**

- ID: `HcF8d3RtNvf0QKm8ORoG`
- URL: https://www.quantguide.io/questions/game-arbitrage
- Topic: finance
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: False
- Solution Free: False
- Version: 5
- Last Edited: 2023-9-30 23:14:58 America/New_York
- Last Edited By: Gabe

### 题干

Consider the following group with the following teams. The contracts are given in the format of $\text{(Team, Time-0 Price)}$. The price of $0.67$ means that if the team wins, you will get paid $1$. If the team loses, you will get paid $0$. 

$$\begin{align*}
(\text{Team 1}, 0.84) \\ 
(\text{Team 2}, 0.73) \\ 
(\text{Team 3}, 0.25) \\ 
(\text{Team 4}, 0.15)
\end{align*}$$

The group works as follows: 2 teams are guaranteed to make it out. Find the arbitrage. You are allowed to long or short contracts. You are also allowed to long or short bonds, which pay $1$ at expiry. Assume interest rates are $0$, so $Z_0 = 1$. 

$$\\$$

Give the answer in the form of the initial credit you will receive in the arbitrage. 



### Hint

Use the fact that $2$ teams are guaranteed to make it out of the group. 

### 解答

$$2$ teams are guaranteed to make it out of the group. So, if we long every contract, we expect a payout of $2$. However, if we add the time-$0$ price of the $4$ teams, we get $1.97 < 2$. So, there is an arbitrage opportunity. 

Here, we long the undervalued item and short the overvalued item. $2$ corresponds to the bank account. Since interest rates are $0$, we do not need to worry about discounting. We long $1$ unit of every team and borrow $2$ bonds. This gives us the following:

$$0.84 + 0.73 + 0.25 + 0.15 - 2 = -0.03$$

So, we get an initial credit of $3$ cents. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0.03"
    ],
    "companies": [],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "HcF8d3RtNvf0QKm8ORoG",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 23:14:58 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1461604,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Game Arbitrage I",
    "topic": "finance",
    "urlEnding": "game-arbitrage",
    "version": 5
  },
  "list_summary": {
    "companies": [],
    "difficulty": "hard",
    "id": "HcF8d3RtNvf0QKm8ORoG",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Game Arbitrage I",
    "topic": "finance",
    "urlEnding": "game-arbitrage"
  }
}
```
