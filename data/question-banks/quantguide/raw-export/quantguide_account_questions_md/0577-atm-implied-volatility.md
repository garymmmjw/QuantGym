# QuantGuide Question

## 577. ATM Implied Volatility

**Metadata**

- ID: `aE3rQnTNgWimrE9INi39`
- URL: https://www.quantguide.io/questions/atm-implied-volatility
- Topic: finance
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-10-7 08:54:10 America/New_York
- Last Edited By: Gabe

### 题干

You have an at-the-money European call option with an expiration of $3$ months and a price $C_0 = 2.3$ of the underlying $S$, with an initial price of $S_0 = 12$. What is an approximation of the implied volatility (annualized)? Round to $3$ decimal points. 



### Hint

What is an approximation we can use for ATM European options following Black-Scholes dynamics? 

### 解答

We can use the following approximation to calculate the price of a vanilla European option.

$$V = \sqrt{\frac{T-t}{2\pi}} \sigma S$$

To calculate the implied volatility, we can plug in the values above. $T-t = 3/12$, $S = 12$, and $V = 2.3$. Solving for $\sigma$, we obtain $\sigma = .961$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      ".961"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "aE3rQnTNgWimrE9INi39",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-7 08:54:10 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4627285,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "ATM Implied Volatility",
    "topic": "finance",
    "urlEnding": "atm-implied-volatility",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "aE3rQnTNgWimrE9INi39",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "ATM Implied Volatility",
    "topic": "finance",
    "urlEnding": "atm-implied-volatility"
  }
}
```
