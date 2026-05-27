# QuantGuide Question

## 213. Covered Calls II

**Metadata**

- ID: `0drGx0EnAs5aY6RUyVxE`
- URL: https://www.quantguide.io/questions/covered-calls-ii
- Topic: finance
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-7 10:58:35 America/New_York
- Last Edited By: Gabe

### 题干

You are entering a covered call position on $\$\text{TSLA}$. You buy 200 shares at $\$230$, sell $100$ $\$240$ Dec call $@10.50$, and $100$ $\$250$ Dec call $@9.50$ (same expiry). What is your max profit for this strategy (assuming that your options will be exercised if they are above the strike at expiration)?

### Hint

What price does our underlying have to reach in order to maximize profit?

### 解答

In order to solve, we know that our profit is going to maximize right before our calls our exercised. No matter what we have ${(10.50 + 9.50)}\cdot{100} =\$2000$ in profit from selling both of our calls, now we just need to see how much extra our shares will add to that profit. Right up to $\$240$, we will maintain ownership of all $200$ shares, with all $200$ gaining $\$10$ in value, for a total profit of  $2000+200\cdot10 =\$4000$. We then need to check our next peak at $\$250$. This time we will maintain ownership of $100$ shares, with these $100$ gaining $\$20$ in value each, for a total profit of $2000+100\cdot20 =\$4000$.
$$$$
At both peaks, we have the same max profit, so pick either and our answer is $\$4000$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "4000"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "0drGx0EnAs5aY6RUyVxE",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-7 10:58:35 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1683410,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Covered Calls II",
    "topic": "finance",
    "urlEnding": "covered-calls-ii",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "0drGx0EnAs5aY6RUyVxE",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Covered Calls II",
    "topic": "finance",
    "urlEnding": "covered-calls-ii"
  }
}
```
