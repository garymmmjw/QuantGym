# QuantGuide Question

## 713. Price an Option III

**Metadata**

- ID: `DwUZg46EdmmzbxlUw67u`
- URL: https://www.quantguide.io/questions/price-an-option-iii
- Topic: finance
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: True
- Solution Free: False
- Version: 4
- Last Edited: 2023-9-30 23:14:08 America/New_York
- Last Edited By: Gabe

### 题干

You have access to the European call options at the following strikes and $T_0$ prices, the underlying $S$ which has initial price $S_0 = 7$, and a bond that has initial price $0.9$, paying $1$ at time $T$. The calls are given in the format of $(\text{Strike } K, \text{Price } C_0)$

$$\begin{align*}
(5, 4.2) \\ 
(10, 1.4) \\ 
(15, 0.7) \\ 
(20, 0.1)
\end{align*}$$

Find the time-$0$ price of a contract that pays $|S_T - 15|$ at time $T$. 


### Hint

Find a replication of $|S_T - 15|$

### 解答

To price this asset, we need to find a time-$T$ replication, and by no-arbitrage, we can find the time-$0$ price using the portfolio of $T_0$ prices. 

We see that we can replicate this asset by going long $15$ units of the bond, shorting $1$ unit of the underlying, and going long $2$ units of the $K = 15$ call. In other words:

$$|x - 15| = 15 - x + 2\max(S_T - 15,0)$$

Using the time-$0$ prices, we get $15(0.9) - 7 + 2(0.7) = 7.9$. 

$$\\$$

Upon closer inspection, one can see that this is the same as a straddle with strike $K = 15$. Typically, this can be created by going long a call and put at the same strike $K$. Here, we do not have access to the put, and instead, we are replicating a put with the underlying and a bond (this is a forward contract).

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "7.9"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "DwUZg46EdmmzbxlUw67u",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 23:14:08 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5815223,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Price an Option III",
    "topic": "finance",
    "urlEnding": "price-an-option-iii",
    "version": 4
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "DwUZg46EdmmzbxlUw67u",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Price an Option III",
    "topic": "finance",
    "urlEnding": "price-an-option-iii"
  }
}
```
