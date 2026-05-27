# QuantGuide Question

## 299. Put Option Price Estimate

**Metadata**

- ID: `N9uH8b6WViFBF8ceEtKM`
- URL: https://www.quantguide.io/questions/put-option-price-estimate
- Topic: finance
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: N/A
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-30 16:08:59 America/New_York
- Last Edited By: Gabe

### 题干

Consider a European vanilla put option with strike $K = 15$. You have access to the following binary puts. A binary put pays $1$ at expiry if $S_T <= K$ and $0$ otherwise. You have access to the following binary puts and their time-$0$ prices, given in the format of $(\text{Strike } K, \text{Price } P_0)$

$$\begin{align*}
(15, 0.83) \\ 
(12.5, 0.64) \\ 
(10, 0.42) \\ 
(7.5, 0.31) \\ 
(5, 0.20) \\ 
\end{align*}$$

Give the best estimate for the time-$0$ price of the strike $K = 15$ put. 

### Hint

Find the best lower bound of the vanilla put with binary puts. 

### 解答

To give the best estimate, we need to find the best lower bound. We can do this by building a step function that subreplicates the put option for all values of $S_T$. Mathematically, the put option can be written as $\max{(15 - S_T,0)}$. We can bound this on the lower side with a binary put of $K = 12.5$. However, we need to have $2.5$ units. The binary put and vanilla put will have the same payout at $S_T = 12.5$. 

$$\\$$

We can continue this process. We can then long $2.5$ units of the $K = 10$ strike binary put. Now, the binary put and vanilla put will agree in payoffs at $S_T = 12.5$ and $S_T = 10$. Repeating this, we can see that we need to long $2.5$ units of every binary put with strike $K < 15$. This gives us the tightest lower bound of:

$$L_0 = 2.5(0.64 + 0.24 + 0.31 + 0.20) = 3.925$$

This is the best lower-bound estimate of a vanilla put. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3.925"
    ],
    "companies": [],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "N9uH8b6WViFBF8ceEtKM",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 16:08:59 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2344422,
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Put Option Price Estimate",
    "topic": "finance",
    "urlEnding": "put-option-price-estimate",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "hard",
    "id": "N9uH8b6WViFBF8ceEtKM",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Put Option Price Estimate",
    "topic": "finance",
    "urlEnding": "put-option-price-estimate"
  }
}
```
