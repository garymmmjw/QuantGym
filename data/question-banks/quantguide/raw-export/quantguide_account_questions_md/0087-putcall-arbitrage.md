# QuantGuide Question

## 87. Put-Call Arbitrage

**Metadata**

- ID: `1f2TA8YeCWN4KVmNQ9FZ`
- URL: https://www.quantguide.io/questions/putcall-arbitrage
- Topic: finance
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Goldman Sachs
- Source: N/A
- Tags: Finance
- Premium: True
- Solution Free: False
- Version: 4
- Last Edited: 2023-11-7 12:42:59 America/New_York
- Last Edited By: Gabe

### 题干

You have access to a stock with price $S_0 = 10$, a European call on $S$ with price $C_0 = 4$, a European put on $S$ with price $P_0 = 3$, both at strike $K = 4$, and bonds paying $1$ at time $T$. Assume interest rates are $0$. Find the arbitrage. You are allowed to long or short assets. 

$$\\$$

Give the answer in the format of $\text{\# Stock + \# Call + \# Put + \# Bonds}$



### Hint

Does put-call parity hold? 

### 解答

From put-call parity, we know that $C - P = S - K$ must hold. We can see that $C - P = 4 - 3 = 1$ and $S - K = 10 - 4 = 6$. We can see that $1 < 6$, so there clearly is an arbitrage. When we see an inequality like this, we will long the undervalued assets and short the overvalued assets. Here, the undervalued assets are $C - P$ and the overvalued assets are $S - K$. We long $C - P$, meaning that we will long $1$ unit of $C$ and short $1$ unit of $P$. We will then short $1$ unit of $S$ and long $4$ units of the bond. This is due to the fact that bonds pay $1$ at expiry, so $K=4$ corresponds to $4$ units of the bond. 

$$\\$$

We then have $\text{\# Stock + \# Call + \# Put + \# Bonds} = -1 + 1 - 1 + 4 = 3$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3"
    ],
    "companies": [
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "1f2TA8YeCWN4KVmNQ9FZ",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 12:42:59 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 603218,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Put-Call Arbitrage",
    "topic": "finance",
    "urlEnding": "putcall-arbitrage",
    "version": 4
  },
  "list_summary": {
    "companies": [
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "easy",
    "id": "1f2TA8YeCWN4KVmNQ9FZ",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Put-Call Arbitrage",
    "topic": "finance",
    "urlEnding": "putcall-arbitrage"
  }
}
```
