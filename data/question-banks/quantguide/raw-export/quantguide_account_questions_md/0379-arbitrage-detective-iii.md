# QuantGuide Question

## 379. Arbitrage Detective III

**Metadata**

- ID: `7E1jW14d6Rq5y8YP0zIo`
- URL: https://www.quantguide.io/questions/arbitrage-detective-iii
- Topic: finance
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Goldman Sachs
- Source: the brain
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: 6
- Last Edited: 2023-11-7 12:42:43 America/New_York
- Last Edited By: Gabe

### 题干

There are 5 strikes available on the QG June $TSLA$ options chain (expiring in one month). There are also 5 more strikes available on the July $TSLA$ options chain, with the same strikes at $165$, $170$, $175$, $180$, and $185$. We will only consider the call side in this question.
$$$$
Suppose we are expecting some volatility in the coming earnings report, and our June call chain is priced at $\$21, \$17, \$14, \$12, \$10$ (increasing in strike price). We look out at the July chain and our prices are $\$20, \$17, \$14, \$13, \$11$.
$$$$
Is there an arbitrage opportunity? If so, enter the minimum amount you are guaranteed to make, if no opportunity exists, enter $-1$.


### Hint

Is our options chain mispriced? What does theta tell us about our options in respect to their time to expiration.

### 解答

Once again, we can exploit an improperly priced options chain. As our time to expiration increases, the cost of our option must also increase in turn. For the same underlying, at the same strike, our contract with the closer expiry will always be worth less than its same strike counterpart with a further expiration date.
$$$$
Using this knowledge, we can see that the $\$165$ dollar strike is mispriced. In order to capitalize, we simply need to sell the front month at $\$165$, giving us a credit of $\$21$, and then buy the back month at $\$20$. Giving us a net credit of $\$1$. Using this strategy, we lock in $\$1$ of profit per share. 
$$$$
This is then multiplied by $100$, giving us our final total of $\$100$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "100"
    ],
    "companies": [
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "7E1jW14d6Rq5y8YP0zIo",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 12:42:43 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2950043,
    "source": "the brain",
    "status": "published",
    "tags": [],
    "title": "Arbitrage Detective III",
    "topic": "finance",
    "urlEnding": "arbitrage-detective-iii",
    "version": 6
  },
  "list_summary": {
    "companies": [
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "medium",
    "id": "7E1jW14d6Rq5y8YP0zIo",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Arbitrage Detective III",
    "topic": "finance",
    "urlEnding": "arbitrage-detective-iii"
  }
}
```
