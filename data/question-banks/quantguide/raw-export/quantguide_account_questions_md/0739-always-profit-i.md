# QuantGuide Question

## 739. Always Profit I

**Metadata**

- ID: `h5Zg9sIZNlnuEwIi8mVx`
- URL: https://www.quantguide.io/questions/always-profit-i
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 1
- Companies: SIG
- Source: Kaushik - SIG question
- Tags: Finance
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

QuantGuide stock will either double its value or go down $50\%$ by tomorrow. You can also bet whether the stock goes up or down with your friend at $1:1$ payout. Let A and B be the lowest round bet (can only bet whole dollars) amount you long/short the stock and bet on the stock going up/down with your friend respectively. Assume that if you are betting, you want to make the same gross profit no matter the outcome of the stock’s movement tomorrow. How much do you profit from betting A and B? If you can’t guarantee profit, enter $0$.

### Hint

Make equations for gross profit for all outcomes.

### 解答

Something to notice about this situation is that being long on the stock is better than betting the stock goes up against your friend because in the case the stock goes down, you’ll still retain $50\%$ of your investment in the stock. Thus we should look to go long on the stock and bet the stock goes down against your friend. The profit equations are as follows: if the stock goes up, you make $A-B$; if the stock goes down, you make $B-0.5A$.
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
    "id": "h5Zg9sIZNlnuEwIi8mVx",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 6049404,
    "source": "Kaushik - SIG question",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Always Profit I",
    "topic": "brainteasers",
    "urlEnding": "always-profit-i"
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "id": "h5Zg9sIZNlnuEwIi8mVx",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Always Profit I",
    "topic": "brainteasers",
    "urlEnding": "always-profit-i"
  }
}
```
