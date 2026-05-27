# QuantGuide Question

## 279. Straddle Arbitrage I 

**Metadata**

- ID: `tx00ck3pcZj2npgk7juo`
- URL: https://www.quantguide.io/questions/straddle-arbitrage
- Topic: finance
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: False
- Solution Free: False
- Version: 6
- Last Edited: 2023-9-30 17:14:28 America/New_York
- Last Edited By: Gabe

### 题干

You have a straddle with initial price $V_0 = 5.4$ with strike $K = 17$, a European vanilla put with initial price $P_0 = 4.2$, a European vanilla call with $C_0 = 1.4$, both at strike $K = 17$, the underlying stock $S$ with initial price $S_0 = 14$, and bonds that pay $1$ at time-$T$ and initial price $B_0 = 0.9$. 

$$\\$$

Find the arbitrage. Give the answer in the format of $\text{\# Stock + \# Call + \# Put + \# Bonds + \# Straddle}$

### Hint

What is the correct price of a straddle? 

### 解答

We can replicate a straddle at strike $K$ by going long $1$ unit of the call and $1$ unit of the put. So, we should have the following equality:

$$V_0 = P_0 + C_0$$

When plugging in the prices, we see this equality doesn't hold. We have $5.4 \overset{?}{=} 4.2 + 1.4 = 5.6$ $$\\$$

To take the arbitrage, we long the undervalued item and short the overvalued item. Here, we long the straddle and short the vanilla call and put. The bond and underlying stock are irrelevant. 

$$\text{\# Stock + \# Call + \# Put + \# Bonds + \# Straddle} = 0 - 1 - 1 + 0 + 1 = -1$$


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "-1"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "tx00ck3pcZj2npgk7juo",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 17:14:28 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2153889,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Straddle Arbitrage I ",
    "topic": "finance",
    "urlEnding": "straddle-arbitrage",
    "version": 6
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "tx00ck3pcZj2npgk7juo",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Straddle Arbitrage I ",
    "topic": "finance",
    "urlEnding": "straddle-arbitrage"
  }
}
```
