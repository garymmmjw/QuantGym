# QuantGuide Question

## 1157. Delta Decay

**Metadata**

- ID: `qSvGoQ6SpbtUCr3tBtva`
- URL: https://www.quantguide.io/questions/delta-decay
- Topic: finance
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-10-15 16:17:26 America/Chicago
- Last Edited By: Sean

### 题干

Suppose you have a European call option with strike $K = 23$ on an underlying $S$ with initial price $S_0 = 25$. The $\Delta$ of this call option is currently $0.74$. We delta-hedge our position such that the overall delta of our portfolio is $0$. Suppose that our call option expires in $4$ hours.

$$\\$$

Give an approximation for the $\Delta$ of our portfolio after $2$ hours, provided that the underlying stays at the same price. Round to $2$ decimal points. 


### Hint

How do deltas change over time for in-the-money and out-of-the-money options? 

### 解答

Our call option is currently in-the-money. So, at expiration, the call option will have $\Delta = 1$ if it is still in-the-money. Since the time-until-expiration is low, we would expect the delta decay to be about $0.26$. In other words, our delta should increase by $0.26$ in the next $4$ hours assuming the price stays the same. If we are only worried about the next $2$ hours, we would expect our delta to increase by $0.13$. Since we are currently delta-hedged, we now gain a delta of $0.13$ and thus we now have positive delta. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      ".13"
    ],
    "companies": [],
    "difficulty": "hard",
    "hasEdits": true,
    "id": "qSvGoQ6SpbtUCr3tBtva",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-15 16:17:26 America/Chicago",
    "lastEditedBy": "Sean",
    "orderId": 9590214,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Delta Decay",
    "topic": "finance",
    "urlEnding": "delta-decay",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "hard",
    "id": "qSvGoQ6SpbtUCr3tBtva",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Delta Decay",
    "topic": "finance",
    "urlEnding": "delta-decay"
  }
}
```
