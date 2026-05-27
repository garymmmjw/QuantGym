# QuantGuide Question

## 414. Presidential Options

**Metadata**

- ID: `ZUyxKYr9ELts5nToedRY`
- URL: https://www.quantguide.io/questions/presidential-options
- Topic: finance
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: original
- Tags: Arbitrage
- Premium: False
- Solution Free: False
- Version: 4
- Last Edited: 2023-9-17 14:01:33 America/New_York
- Last Edited By: Gabe

### 题干

You have access to 4 different contracts that correspond to the $2020$ US Presidential election. These contracts pay $1$ if the outcome occurs and $0$ otherwise. You are allowed to short contracts, in which the payout is $-1$ if the event occurs and $0$ otherwise. The current value of the contract is the cost to enter the contract (or the credit you gain if you short).
$$
\begin{align*}
    &\text{Contract 1: Trump wins the 2020 election (yes, no): \$0.17, \$0.83} \\
    &\text{Contract 2: Which party wins Arizona (Democrat, Republican): \$0.80, \$0.20} \\ 
    &\text{Contract 3: Which party wins Georgia (Democrat, Republican): \$0.56, \$0.44} \\ 
    &\text{Contract 4: Which party will win Pennsylvania (Democrat, Republican): \$0.84, \$0.16} 
\end{align*}
$$
For example, if you buy the $\text{Trump does not win the 2020 election contract}$, it will cost $0.83$, which will be worth $\$1.00$ if he does not win, and $\$0.00$ if he does win. Also, assume that Trump will only win the election if he wins $\textbf{all three states:}$ Arizona, Georgia, and Pennsylvania}. Find the arbitrage opportunity. Give the answer in the format of the absolute value of the credit (in dollars) you obtain to enter the position.

### Hint

We can see that Pennsylvania (Trump) will pay $1.00$ in every outcome where the 2020 election (Trump) pays $1.00$ due to the condition mentioned above. When looking at the initial costs, we can see that the payoff of Pennsylvania (Trump) dominates the payoff of 2020 election (Trump).

### 解答

We can see that Pennsylvania (Trump) will pay $1.00$ in every outcome where the 2020 election (Trump) pays $1.00$ due to the condition mentioned above. When looking at the initial costs, we can see that the payoff of Pennsylvania (Trump) dominates the payoff of 2020 election (Trump). This gives an arbitrage opportunity as this contract shouldn't be worth less than the US election. We will long the undervalued contract, and short the overvalued contract. In other words, we can long 1 unit of Pennsylvania (Trump) and short 1 unit of 2020 election (Trump) and receive a credit of $0.16 - 0.17 = -\$0.01$. 

Here, regardless of the outcome, we can see that we cannot lose money. If Trump wins the election, we will keep our 1 cent as the final value of our portfolio will be $1 - 1 = 0$. If Trump only wins Pennsylvania, we have a value of $1 - 0 = 1$. Finally, if Trump loses Pennsylvania, we have a value of $0 - 0 = 0$. In all cases, we get to (at least) keep our 1 cent credit.  

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0.01"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "ZUyxKYr9ELts5nToedRY",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-17 14:01:33 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3246847,
    "source": "original",
    "status": "published",
    "tags": [
      {
        "tag": "Arbitrage"
      }
    ],
    "title": "Presidential Options",
    "topic": "finance",
    "urlEnding": "presidential-options",
    "version": 4
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "ZUyxKYr9ELts5nToedRY",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Arbitrage"
      }
    ],
    "title": "Presidential Options",
    "topic": "finance",
    "urlEnding": "presidential-options"
  }
}
```
