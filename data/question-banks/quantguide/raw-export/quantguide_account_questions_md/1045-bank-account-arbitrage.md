# QuantGuide Question

## 1045. Bank Account Arbitrage

**Metadata**

- ID: `u7wGOZyhozjIWhqsa9ig`
- URL: https://www.quantguide.io/questions/bank-account-arbitrage
- Topic: finance
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: True
- Solution Free: False
- Version: 3
- Last Edited: 2023-9-30 23:13:24 America/New_York
- Last Edited By: Gabe

### 题干

Let's say you have two bank accounts, $B_1$ with interest rate $0.04$ and $B_2$ with interest rate $0.02$ (annual interest rates). Both are compounded continuously. Both bank accounts start with initial value $B_1 = B_2 = 1$. What is the minimum amount of money you are guaranteed to make in $1$ year, assuming you can only deposit / borrow integer numbers in both bank accounts? You have $\$0$ initially and cannot just deposit your money into one of the bank accounts. Round to $2$ decimal points. 

### Hint

What bank should we borrow from? 

### 解答

The arbitrage can be seen immediately. We borrow from the bank ($1$) with the lower interest rate and deposit money into the bank ($2$) with the higher interest rate. Our deposit will cover the interest we owe to the bank $1$ while still giving us some profit. 

We have the following profit:

$$e^{.04} - e^{.02} \approx 0.02$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      ".02"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "u7wGOZyhozjIWhqsa9ig",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 23:13:24 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8514773,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Bank Account Arbitrage",
    "topic": "finance",
    "urlEnding": "bank-account-arbitrage",
    "version": 3
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "u7wGOZyhozjIWhqsa9ig",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Bank Account Arbitrage",
    "topic": "finance",
    "urlEnding": "bank-account-arbitrage"
  }
}
```
