# QuantGuide Question

## 966. Game Arbitrage II

**Metadata**

- ID: `eq3JybYxXg3OamCEW5Oz`
- URL: https://www.quantguide.io/questions/game-arbitrage-ii
- Topic: finance
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: N/A
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: 3
- Last Edited: 2023-9-30 23:15:01 America/New_York
- Last Edited By: Gabe

### 题干

Consider the following group with the following teams. The contracts are given in the format of $\text{(Team, Time-0 Price)}$. The price of $0.67$ means that if the team wins, you will get paid $1$. If the team loses, you will get paid $0$. 

$$\begin{align*}
(\text{Team 1}, 0.95) \\ 
(\text{Team 2}, 0.72) \\ 
(\text{Team 3}, 0.35) \\ 
(\text{Team 4}, 0.03)
\end{align*}$$

The group works as follows: 2 teams are guaranteed to make it out. Find the arbitrage. You are allowed to long or short contracts. You are also allowed to long or short bonds, which pay $1$ at expiry. Assume interest rates are $0$, so $Z_0 = 1$. 

$$\\$$

Give the answer in the form of the initial credit you will receive in the arbitrage. 



### Hint

What is the total payout if we were to long every single contract? 

### 解答

$$2$ teams are guaranteed to make it out of the group. If we long every contract, we expect a payout of $2$ (and also an initial price of $2$). You can imagine this as the density being split amongst the $4$ teams such that the sum is $2$. When we add the values of all contracts, we see a value of $2.05 > 2$. This means that the contracts are overvalued. 

$$\\$$

To capitalize on the arbitrage, we long the undervalued item and short the overvalued item. We can short $1$ unit of every contract and then long $2$ units of the bond. This gives us $2 - 0.95 - 0.72 - 0.35 - 0.03 = -0.05$, meaning we receive $0.05$ as a credit. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      ".05"
    ],
    "companies": [],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "eq3JybYxXg3OamCEW5Oz",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 23:15:01 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7871451,
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Game Arbitrage II",
    "topic": "finance",
    "urlEnding": "game-arbitrage-ii",
    "version": 3
  },
  "list_summary": {
    "companies": [],
    "difficulty": "hard",
    "id": "eq3JybYxXg3OamCEW5Oz",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Game Arbitrage II",
    "topic": "finance",
    "urlEnding": "game-arbitrage-ii"
  }
}
```
