# QuantGuide Question

## 341. Arbitrage Detective IV

**Metadata**

- ID: `8TZ0xFbe7plcbRtVrTZm`
- URL: https://www.quantguide.io/questions/arbitrage-detective-i
- Topic: finance
- Difficulty: hard
- Internal Difficulty: 3
- Companies: Goldman Sachs
- Source: My brain
- Tags: Finance
- Premium: True
- Solution Free: False
- Version: 4
- Last Edited: 2023-9-30 23:14:43 America/New_York
- Last Edited By: Gabe

### 题干

There are five options on the $TSLA$ options chain right now, all of which are expiring at the end of the month, and with strikes $165$, $170$, $175$, $180$, and $185$. Suppose the put options respectively cost $\$9$, $\$12$, $\$14$, $\$14.5$, and $\$15$ and the call options cost $\$15$, $\$14$, $\$13$, $\$12$, and $\$9$. Is there an arbitrage opportunity? If so, enter the minimum amount you are guaranteed to make, if no opportunity exists, enter $-1$.

### Hint

How do option chains usually work? What can we capitalize on at the extremes?

### 解答

We can see here, we have quite an unusual options chain we can take advantage of. As our chains are near inverses of each other, assume the underlying is selling at $\$175$. Usually, on a chain, when the strike of our call option increases, the call option's value approaches full value, meaning the difference between our prices should be close to the difference in our strike prices. In this example, as our call option increases in strike price, we would expect the prices to get increasingly farther away. In this case, the prices actually start converging, showing our chain is improperly formed.
$$$$
The same is true on the put side, we should see the difference in price increase as the strike price decreases, but again, the opposite is true.
$$$$
In order to take advantage of this, we can use an iron condor strategy. Usually an iron condor is used to take advantage of a neutral market, but in this case, we just care about the large mispricings in the chain. We use a put credit and a call credit spread, netting $\$12$ - $\$9$ of credit on both sides, with a max loss of $\$5$. So $3 \cdot 2 - 5 = \$1$. And as all contracts control 100 shares, we get $\$1 \cdot 100 = \$100$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "100"
    ],
    "companies": [],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "8TZ0xFbe7plcbRtVrTZm",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 23:14:43 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5031356,
    "source": "My brain",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Arbitrage Detective IV",
    "topic": "finance",
    "urlEnding": "arbitrage-detective-i",
    "version": 4
  },
  "list_summary": {
    "companies": [
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "medium",
    "id": "SzrZ2VogfcG0O79gYJS9",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Arbitrage Detective I",
    "topic": "finance",
    "urlEnding": "arbitrage-detective-i"
  }
}
```
