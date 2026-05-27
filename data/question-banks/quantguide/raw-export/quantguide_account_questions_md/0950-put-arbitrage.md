# QuantGuide Question

## 950. Put Arbitrage

**Metadata**

- ID: `lr62pgHifcSDRziMjJ6y`
- URL: https://www.quantguide.io/questions/put-arbitrage
- Topic: finance
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-18 20:05:00 America/New_York
- Last Edited By: Gabe

### 题干

You have access to a stock with price $S_0 = 14$, a put at strike $K = 17$ with initial price $P_0 = 5.9$, a put at strike $K = 14$ with initial price $Q_0 = 2.1$, and bonds that pay out $1$ at time $T$ with initial value $B_0 = 0.9$. Find the arbitrage.

$$\\$$

Give the answer in the format of $\text{\# Stock + \# Put (K = 17) + \# Put (K = 14) + \# Bonds}$



### Hint

What is the relationship between puts of different strikes? 

### 解答

We have the following relationship that must hold for puts on the same underlying with different strikes.

$$P(K_2) - P(K_1) \le (K_2 - K_1)Z$$

If we let $K_2 = 17$ and $K_1 = 14$ and plug the values in. We get:

$$\begin{align*}
5.9 - 2.1 &\le (17 - 14)*0.9 \\ 
3.8 &\le 3 * 0.9 
\end{align*}$$

This clearly does not hold. We should long the undervalued item and short the overvalued item. Here, we will long $3$ units of the bond, short the $K = 17$ put and long the $K = 13$ put. This gives us:

$$\text{\# Stock + \# Put (K = 17) + \# Put (K = 14) + \# Bonds} = 0 -1 +1 + 3 = 3$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "lr62pgHifcSDRziMjJ6y",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-18 20:05:00 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7752056,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Put Arbitrage",
    "topic": "finance",
    "urlEnding": "put-arbitrage",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "lr62pgHifcSDRziMjJ6y",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Put Arbitrage",
    "topic": "finance",
    "urlEnding": "put-arbitrage"
  }
}
```
