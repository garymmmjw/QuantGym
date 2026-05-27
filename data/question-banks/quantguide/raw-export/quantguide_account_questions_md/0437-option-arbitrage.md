# QuantGuide Question

## 437. Option Arbitrage

**Metadata**

- ID: `piXPDEDsXiksqsjTnZUv`
- URL: https://www.quantguide.io/questions/option-arbitrage
- Topic: finance
- Difficulty: easy
- Internal Difficulty: 1
- Companies: TransMarket Group
- Source: N/A
- Tags: Finance
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-9 23:28:49 America/New_York
- Last Edited By: Gabe

### 题干

You have $3$ calls at the following strikes and prices:

$$\begin{align*}
&\text{1000 @ 4} \\ 
&\text{1010 @ 3.5} \\ 
&\text{1020 @ 2.75} 
\end{align*}$$

There is an arbitrage. What amount of money are you guaranteed to make (in dollars)? 

### Hint

For this to be an arbitrage, there must be a $0$ probability that we lose money. In other words, our constructed portfolio must have a non-negative payoff everywhere $\textbf{and}$ we must pay at most $0$ to enter the position. 

### 解答

For this to be an arbitrage, there must be a $0$ probability that we lose money. In other words, our constructed portfolio must have a non-negative payoff everywhere $\textbf{and}$ we must pay at most $0$ to enter the position. 

$\\$

For this to occur, we see that we must construct a butterfly spread. To do this, we buy $1$ unit of the $1000$-strike call, short $2$ units of the $1010$-strike call, and buy $1$ unit of the $1020$-strike call. The cost to enter this spread is $-0.25$. In other words, we are paid $25$ cents to enter a spread, in which there is a non-negative payoff everywhere. We are guaranteed to $\textit{at least}$ collect the $25$ cents. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0.25"
    ],
    "companies": [
      {
        "company": "TransMarket Group"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "piXPDEDsXiksqsjTnZUv",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-9 23:28:49 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3483844,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Option Arbitrage",
    "topic": "finance",
    "urlEnding": "option-arbitrage",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "TransMarket Group"
      }
    ],
    "difficulty": "easy",
    "id": "piXPDEDsXiksqsjTnZUv",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Option Arbitrage",
    "topic": "finance",
    "urlEnding": "option-arbitrage"
  }
}
```
