# QuantGuide Question

## 525. Deriving Put-Call Parity II

**Metadata**

- ID: `Fo8H207lqWIe59R6vCjC`
- URL: https://www.quantguide.io/questions/deriving-put-call-parity-ii
- Topic: finance
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: False
- Solution Free: False
- Version: 3
- Last Edited: 2023-9-15 09:26:09 America/New_York
- Last Edited By: Gabe

### 题干

You have access to the underlying $S$, which has an initial price $S_0 = 8$, bonds that pay $1$ at time-$T$, where $T=1$. The interest rates are $0.02$, continuously compounded. Finally, you have access to three different put options of varying strikes. The puts are given in the format of $(\text{Strike } K, \text{Price } C_0)$

$$\begin{align*}
(5, 0.4) \\ 
(10, 3.2) \\ 
(15, 5.6) \\ 
\end{align*}$$

Find the time-$0$ price of a call option with strike $K = 10$. Round to two decimal points.







### Hint

What is the payoff of a call? 

### 解答

We know that the time-$T$ payout of a call-option is $\max(S_T-K,0)$. The put-option has time-$T$ payout of $\max(K-S_T,0)$. Using the underlying, the bond, and the put, we can see that we have 

$$\max(S_T - K, 0) = S_T - K + \max(K-S_T,0)$$

In other words, a call option is equivalent to going long $1$ unit of the underlying, borrowing $K$ units of the bond, and long $1$ unit of the put. This then gives us $V_0 = 8 -10e^{-.02} + 3.2 = 1.40$

Intuitively, this also makes sense. The current price of the underlying is $8$ while the strike is $10$. So, our puts are in-the-money while the calls are out-of-the-money. In other words, the puts should have more value than the calls (which we indeed see). 

$$\\$$

This is also known as put-call parity, where we can replicate a call-option with a forward ($S_T - K$) and a put option at strike $K$. This is a very important concept in options theory and forms the basis of $\textit{no arbitrage}$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1.40"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "Fo8H207lqWIe59R6vCjC",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-15 09:26:09 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4184899,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Deriving Put-Call Parity II",
    "topic": "finance",
    "urlEnding": "deriving-put-call-parity-ii",
    "version": 3
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "Fo8H207lqWIe59R6vCjC",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Deriving Put-Call Parity II",
    "topic": "finance",
    "urlEnding": "deriving-put-call-parity-ii"
  }
}
```
