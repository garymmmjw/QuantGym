# QuantGuide Question

## 1026. Price an Option I

**Metadata**

- ID: `JoS6Qug6e4gd5XY1tBi4`
- URL: https://www.quantguide.io/questions/price-an-option
- Topic: finance
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: False
- Solution Free: False
- Version: 4
- Last Edited: 2023-9-11 15:45:21 America/New_York
- Last Edited By: Gabe

### 题干

You have access to European call options at the following strikes and $T_0$ prices, as well as the underlying $S$ with an initial price of $S_0 = 21$. The calls are given in the format of $(\text{Strike } K, \text{Price } C_0)$

$$\begin{align*}
(15, 4.2) \\ 
(20, 1.4) \\ 
(25, 0.7) \\ 
(30, 0.1)
\end{align*}$$

Find the time-$0$ price of a contract that pays $\min({S_T, 25})$ at time $T$. 






### Hint

To find the time-$0$ price, we need to create a replicating portfolio. We can see that the payoff $\min(S_T, 25)$ is the same as $S_T - \max(S_T - 25)$.

### 解答

To find the time-$0$ price, we need to create a replicating portfolio. We can see that the payoff $\min(S_T, 25)$ is the same as $S_T - \max(S_T - 25)$. This replicating portfolio is the same as being long the underlying $S_T$, and short the $K=25$ strike call. So, at time-$T$, we have payoff $S_T - C_T(25)$. This means we have a time-$0$ of $S_0 - C_0(25) = 21 - 0.7 = 20.3$. 

$$\\$$

Note: This replication is that of a covered-call: an options strategy where we sell call options while owning the underlying. This gives us downside protection, but limits upside potential. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "20.3"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "JoS6Qug6e4gd5XY1tBi4",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-11 15:45:21 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8333312,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Price an Option I",
    "topic": "finance",
    "urlEnding": "price-an-option",
    "version": 4
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "JoS6Qug6e4gd5XY1tBi4",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Price an Option I",
    "topic": "finance",
    "urlEnding": "price-an-option"
  }
}
```
