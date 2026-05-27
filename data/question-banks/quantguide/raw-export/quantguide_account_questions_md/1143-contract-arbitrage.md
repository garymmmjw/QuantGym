# QuantGuide Question

## 1143. Contract Arbitrage

**Metadata**

- ID: `dMDQayfUQ0Nu24Dv1TRH`
- URL: https://www.quantguide.io/questions/contract-arbitrage
- Topic: finance
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-30 22:09:10 America/New_York
- Last Edited By: Gabe

### 题干

We have a contract, $V$, that pays $\min{(2S_T, 4)}$ at expiry with initial price $V_0 = 3.4$, the following European puts, given in the format of $(\text{Strike } K, \text{Price } C_0)$.

$$\begin{align*}
(4, 2.4) \\ 
(2, 0.8) \\ 
\end{align*}$$

We also have access to the underlying, $S$, with an initial price of $S_0 = 3$ and bonds that pay $1$ at expiry, with an initial price of $Z_0 = 0.9$. Find the arbitrage. Give the answer in the format of $\text{\# Contract (V) + \# Put (K = 4) + \# Put (K = 2) + \# Bonds}$



### Hint

How can we price $V$ with the given assets? 

### 解答

The arbitrage involves our contract. This contract is the same as going long $4$ units of the bond and shorting $2$ units of the strike $K = 2$ put. By the condition of no-arbitrage, we would expect this to be equal to the price of our custom contract $V$.

$$\begin{align*}
V &\overset{?}{=} 4Z - 2P \\ 
3.4 &\overset{?}{=} 4(0.9) - 2(0.8) \\ 
3.4 &\overset{?}{=} 2 
\end{align*}$$

We see a clear arbitrage. So, we long the undervalued item and short the overvalued item. In other words, we short $1$ unit of the derivative $V$, long $4$ units of the bond, and short $2$ units of the put. This gives us the following:

$$\text{\# Contract (V) + \# Put (K = 4) + \# Put (K = 2) + \# Bonds} = -1 + 0 - 2 + 4 = 1$$


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "dMDQayfUQ0Nu24Dv1TRH",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 22:09:10 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9423090,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Contract Arbitrage",
    "topic": "finance",
    "urlEnding": "contract-arbitrage",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "dMDQayfUQ0Nu24Dv1TRH",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Contract Arbitrage",
    "topic": "finance",
    "urlEnding": "contract-arbitrage"
  }
}
```
