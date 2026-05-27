# QuantGuide Question

## 842. Bank Arbitrage

**Metadata**

- ID: `VDCSW4FT7oXDCg4G9AFj`
- URL: https://www.quantguide.io/questions/bank-arbitrage
- Topic: finance
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: originla
- Tags: Arbitrage
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-8 18:05:15 America/New_York
- Last Edited By: Gabe

### 题干

You have a bond and bank account that pay $5\%$ and $3\%$ compounded annually. You are allowed to buy or borrow the bond (needing to repay it back later). Similarly, you are able to borrow money from the bank (needing to pay the principal and interest at the end) or deposit money into the bank. There is an arbitrage opportunity. How much profit will you receive at the end of $1$ year if you have $\$200$ total? Round to the nearest cent.

### Hint

Try to borrow and lend with equal amounts of your money.

### 解答

We can see that if we borrow $\$100$ from the bank account and use that money to buy the bond, we will gain a free $\$2.08$ at the end of the 1 year. This is because we will owe the bank account $\$100$ and some interest, but we will gain more interest from the bond. In the 1 year, we can see that our $\$100$ bond will grow to $V_T = 100e^{0.05(1)}$. Similarly, we can see that we will owe the bank account $V_T = 100e^{.03(1)}$. We can return the principal and interest from the bond to repay the bank account, and obtain $100e^{0.05(1)} -  100e^{.03(1)} \approx 2.08$ while doing so.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2.08"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "VDCSW4FT7oXDCg4G9AFj",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "lastEditedAt": "2023-9-8 18:05:15 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6907348,
    "source": "originla",
    "status": "published",
    "tags": [
      {
        "tag": "Arbitrage"
      }
    ],
    "title": "Bank Arbitrage",
    "topic": "finance",
    "urlEnding": "bank-arbitrage",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "VDCSW4FT7oXDCg4G9AFj",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Arbitrage"
      }
    ],
    "title": "Bank Arbitrage",
    "topic": "finance",
    "urlEnding": "bank-arbitrage"
  }
}
```
