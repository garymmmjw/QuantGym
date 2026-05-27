# QuantGuide Question

## 127. Always Profit II

**Metadata**

- ID: `pLxkZHSvIQEXMkIDhgNS`
- URL: https://www.quantguide.io/questions/always-profit-ii
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 1
- Companies: SIG
- Source: Kaushik - SIG
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-23 22:58:35 America/New_York
- Last Edited By: Gabe

### 题干

QuantGuide stock will either double its value or go down $50\%$ by tomorrow. You can also bet whether the stock goes up or down with your friend at $1:1$ payout. Let A and B be the lowest round bet (can only bet whole dollars) amount you long/short the stock and bet on the stock going up/down with your friend respectively. Assume that if you are betting, you want to make the same amount profit no matter the outcome of the stock’s movement tomorrow (bank balance will be the same no matter the outcome). How much do you profit from betting A and B? If you can’t guarantee profit, enter $0$.

### Hint

Make equations for profits including returned bets for all scenarios.

### 解答

Something to notice about this situation is that being long on the stock is better than betting the stock goes up against your friend because in the case the stock goes down, you’ll still retain $50\%$ of your investment in the stock. Thus we should look to go long on the stock and bet the stock goes down against your friend. The profit (including returned bets) equations are as follows:
$\\$
Stock goes up: $A-B$
$\\$
Stock goes down: $B-0.5A$
$\\$
Making these two equations equal, we get $A = 4B/3$. Thus $A$ and $B$ are equal to $\$4$ and $\$3$ respectively which allows us to always profit $\$1$.


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1"
    ],
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "pLxkZHSvIQEXMkIDhgNS",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-23 22:58:35 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 891366,
    "source": "Kaushik - SIG",
    "status": "published",
    "tags": [],
    "title": "Always Profit II",
    "topic": "brainteasers",
    "urlEnding": "always-profit-ii",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "id": "pLxkZHSvIQEXMkIDhgNS",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Always Profit II",
    "topic": "brainteasers",
    "urlEnding": "always-profit-ii"
  }
}
```
